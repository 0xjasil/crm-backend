import {
  PrismaClient,
  Prisma,
  AdmissionStatus,
  CollectedTowards,
  EnquiryStatus,
} from '@prisma/client';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../errors/app-error.js';
import {
  AdmissionFilterInput,
  CreateAdmissionInput,
  UpdateAdmissionInput,
} from './admission.schema.js';
import { hasFeatureAccess, isAdminRole, isManagerRole } from '../auth/permissions.js';

type AdmissionUser = { id: string; role: string | null; branch: string | null; permissions?: string[] };

export function getAdmissionVisibilityWhere(user: AdmissionUser): Prisma.AdmissionWhereInput {
  if (isAdminRole(user.role)) return {};
  if (isManagerRole(user.role)) {
    if (!user.branch) return { id: '__no_branch_access__' };
    return {
      OR: [
        { enquiry: { branchId: user.branch } },
        { enquiryId: null, createdBy: { branch: user.branch } },
      ],
    };
  }
  return { assignedToUserId: user.id };
}

export function isEligibleAdmissionAssignee(user: { id: string; role: string | null; userRole?: { permissions: string[] } | null }): boolean {
  return !isManagerRole(user.role) && hasFeatureAccess({ role: user.role, userRole: user.userRole }, 'projects');
}

export class AdmissionService {
  constructor(private prisma: PrismaClient) {}

  async listAdmissions(filters: AdmissionFilterInput, user: AdmissionUser) {
    const { search, courseId, status, startDate, endDate, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.AdmissionWhereInput = { AND: [getAdmissionVisibilityWhere(user)] };

    if (courseId) where.courseId = courseId;
    if (status) where.status = status as AdmissionStatus;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search) {
      where.AND = [
        ...(where.AND as Prisma.AdmissionWhereInput[]),
        { OR: [
        { candidateName: { contains: search, mode: 'insensitive' } },
        { mobileNumber: { contains: search, mode: 'insensitive' } },
        { admissionNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        ] },
      ];
    }

    const [admissions, total] = await Promise.all([
      this.prisma.admission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          course: { select: { id: true, name: true, courseFee: true } },
          handledBy: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          _count: {
            select: { receipts: true },
          },
        },
      }),
      this.prisma.admission.count({ where }),
    ]);

    return { admissions, total };
  }

  async getAdmissionById(id: string, user: AdmissionUser) {
    const admission = await this.prisma.admission.findFirst({
      where: { AND: [{ id }, getAdmissionVisibilityWhere(user)] },
      include: {
        course: true,
        enquiry: true,
        handledBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        receipts: {
          orderBy: { paymentDate: 'desc' },
          include: { createdBy: { select: { id: true, name: true } } },
        },
      },
    });

    if (!admission) throw new NotFoundError('Admission');
    return admission;
  }

  private async getEligibleAssignee(userId: string, branch?: string | null) {
    const assignee = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, branch: true, banned: true, userRole: { select: { permissions: true } } },
    });
    if (!assignee || assignee.banned || !isEligibleAdmissionAssignee(assignee)) {
      throw new BadRequestError('Select an active user with Site Surveys & Projects permission who is not a manager');
    }
    if (branch && assignee.branch !== branch) throw new BadRequestError('Managers can assign admissions only to staff in their branch');
    return assignee;
  }

  async getAdmissionAssignees(user: AdmissionUser) {
    if (!hasFeatureAccess(user, 'projects')) throw new ForbiddenError('Site Surveys & Projects permission is required');
    if (isManagerRole(user.role) && !user.branch) return [];
    const users = await this.prisma.user.findMany({
      where: { OR: [{ banned: false }, { banned: null }], ...(isManagerRole(user.role) ? { branch: user.branch } : {}) },
      select: { id: true, name: true, role: true, branch: true, userRole: { select: { permissions: true } } },
      orderBy: { name: 'asc' },
    });
    return users.filter(isEligibleAdmissionAssignee).map(({ id, name, role, branch }) => ({ id, name, role, branch }));
  }

  async createAdmission(input: CreateAdmissionInput, user: AdmissionUser) {
    if (!hasFeatureAccess(user, 'projects')) throw new ForbiddenError('Site Surveys & Projects permission is required');
    if (isManagerRole(user.role) && !user.branch) throw new BadRequestError('A branch is required to assign admissions');
    const assignee = await this.getEligibleAssignee(input.assignedToUserId, isManagerRole(user.role) ? user.branch : undefined);
    const course = await this.prisma.course.findUnique({
      where: { id: input.courseId },
    });

    if (!course) throw new BadRequestError('Selected course does not exist');

    const totalCourseFee = (course.courseFee || 0) + (course.admissionFee || 0) + (course.semesterFee || 0);
    const initialPaid = input.initialPayment ? input.initialPayment.amount : 0;
    const initialBalance = Math.max(0, totalCourseFee - initialPaid);

    return this.prisma.$transaction(async (tx) => {
      // Generate unique admission number ADM-YYYYMM-XXXX
      const count = await tx.admission.count();
      const datePrefix = new Date().toISOString().slice(0, 7).replace('-', '');
      const admissionNumber = `ADM-${datePrefix}-${String(count + 1).padStart(4, '0')}`;

      const admission = await tx.admission.create({
        data: {
          admissionNumber,
          candidateName: input.candidateName,
          mobileNumber: input.mobileNumber,
          email: input.email,
          gender: input.gender,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
          address: input.address,
          leadSource: input.leadSource,
          lastQualification: input.lastQualification,
          yearOfPassing: input.yearOfPassing,
          percentageCGPA: input.percentageCGPA,
          instituteName: input.instituteName,
          additionalNotes: input.additionalNotes,
          balance: initialBalance,
          status: input.status as AdmissionStatus,
          courseId: input.courseId,
          enquiryId: input.enquiryId || undefined,
          agentName: input.agentName,
          agentCommission: input.agentCommission,
          handledByUserId: input.handledByUserId || undefined,
          createdByUserId: user.id,
          assignedToUserId: assignee.id,
        },
      });

      // If initial receipt was provided
      if (input.initialPayment && input.initialPayment.amount > 0) {
        const receiptCount = await tx.receipt.count();
        const receiptNumber = `RCP-${datePrefix}-${String(receiptCount + 1).padStart(4, '0')}`;

        await tx.receipt.create({
          data: {
            receiptNumber,
            amountCollected: input.initialPayment.amount,
            collectedTowards: input.initialPayment.collectedTowards as CollectedTowards,
            paymentMode: input.initialPayment.paymentMode,
            transactionId: input.initialPayment.transactionId,
            admissionId: admission.id,
            courseId: input.courseId,
            createdById: user.id,
          },
        });
      }

      // If created from an enquiry, mark enquiry as ENROLLED
      if (input.enquiryId) {
        await tx.enquiry.update({
          where: { id: input.enquiryId },
          data: { status: EnquiryStatus.ENROLLED },
        });
      }

      return admission;
    });
  }

  async updateAdmission(id: string, input: UpdateAdmissionInput, user: AdmissionUser) {
    await this.getAdmissionById(id, user);

    return this.prisma.admission.update({
      where: { id },
      data: {
        ...input,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
      },
    });
  }

  async deleteAdmission(id: string, user: AdmissionUser) {
    await this.getAdmissionById(id, user);
    return this.prisma.admission.delete({ where: { id } });
  }

  async reassignAdmission(id: string, assignedToUserId: string, user: AdmissionUser) {
    if (!isAdminRole(user.role) && !isManagerRole(user.role)) throw new ForbiddenError('Only managers and administrators can reassign admissions');
    if (isManagerRole(user.role) && !user.branch) throw new BadRequestError('A branch is required to reassign admissions');
    await this.getAdmissionById(id, user);
    const assignee = await this.getEligibleAssignee(assignedToUserId, isManagerRole(user.role) ? user.branch : undefined);
    return this.prisma.admission.update({ where: { id }, data: { assignedToUserId: assignee.id }, include: { assignedTo: { select: { id: true, name: true } } } });
  }
}
