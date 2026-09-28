import { PrismaClient, Prisma, EnquiryStatus, NotificationType } from '@prisma/client';
import { NotFoundError } from '../../errors/app-error.js';
import {
  BulkAssignEnquiryInput,
  ChangeEnquiryStatusInput,
  CreateEnquiryInput,
  EnquiryFilterInput,
  UpdateEnquiryInput,
} from './enquiry.schema.js';

export class EnquiryService {
  constructor(private prisma: PrismaClient) {}

  async listEnquiries(filters: EnquiryFilterInput, user: { id: string; role: string | null }) {
    const {
      search,
      status,
      branchId,
      assignedToUserId,
      preferredCourseId,
      serviceId,
      source,
      startDate,
      endDate,
      page,
      limit,
    } = filters;

    const skip = (page - 1) * limit;
    const where: Prisma.EnquiryWhereInput = {};

    // Telecaller role scoping
    if (user.role === 'telecaller') {
      where.assignedToUserId = user.id;
    } else if (assignedToUserId) {
      where.assignedToUserId = assignedToUserId;
    }

    if (status) where.status = status as EnquiryStatus;
    if (branchId) where.branchId = branchId;
    if (preferredCourseId) where.preferredCourseId = preferredCourseId;
    if (serviceId) where.serviceId = serviceId;
    if (source) where.source = { contains: source, mode: 'insensitive' };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { candidateName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [enquiries, total] = await Promise.all([
      this.prisma.enquiry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          branch: { select: { id: true, name: true } },
          preferredCourse: { select: { id: true, name: true } },
          service: { select: { id: true, name: true, price: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true } },
          _count: {
            select: {
              followUps: true,
              callLogs: true,
            },
          },
        },
      }),
      this.prisma.enquiry.count({ where }),
    ]);

    return { enquiries, total };
  }

  async getEnquiryById(id: string) {
    const enquiry = await this.prisma.enquiry.findUnique({
      where: { id },
      include: {
        branch: true,
        preferredCourse: true,
        service: true,
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        assignedBy: { select: { id: true, name: true, email: true } },
        followUps: { orderBy: { scheduledAt: 'desc' } },
        callLogs: { orderBy: { callDate: 'desc' } },
        admissions: {
          include: {
            course: true,
            receipts: true,
          },
        },
      },
    });

    if (!enquiry) throw new NotFoundError('Enquiry');
    return enquiry;
  }

  async createEnquiry(input: CreateEnquiryInput, currentUserId: string) {
    const enquiry = await this.prisma.enquiry.create({
      data: {
        ...input,
        createdByUserId: currentUserId,
        assignedByUserId: input.assignedToUserId ? currentUserId : undefined,
      },
    });

    if (input.assignedToUserId) {
      await this.prisma.notification.create({
        data: {
          userId: input.assignedToUserId,
          title: 'New Enquiry Assigned',
          message: `You have been assigned enquiry: ${enquiry.candidateName}`,
          type: NotificationType.ENQUIRY_ASSIGNED,
          link: `/enquiries/${enquiry.id}`,
        },
      });
    }

    return enquiry;
  }

  async updateEnquiry(id: string, input: UpdateEnquiryInput, _currentUserId: string) {
    await this.getEnquiryById(id);
    return this.prisma.enquiry.update({
      where: { id },
      data: input,
    });
  }

  async deleteEnquiry(id: string) {
    await this.getEnquiryById(id);
    return this.prisma.enquiry.delete({ where: { id } });
  }

  async changeStatus(id: string, input: ChangeEnquiryStatusInput, _currentUserId: string) {
    await this.getEnquiryById(id);

    return this.prisma.enquiry.update({
      where: { id },
      data: {
        status: input.status,
        lastContactDate: new Date(),
        notes: input.remarks ? input.remarks : undefined,
      },
    });
  }

  async assignEnquiry(id: string, assignedToUserId: string, currentUserId: string) {
    const enquiry = await this.getEnquiryById(id);

    const updated = await this.prisma.enquiry.update({
      where: { id },
      data: {
        assignedToUserId,
        assignedByUserId: currentUserId,
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: assignedToUserId,
        title: 'Enquiry Assigned',
        message: `You have been assigned enquiry: ${enquiry.candidateName}`,
        type: NotificationType.ENQUIRY_ASSIGNED,
        link: `/enquiries/${enquiry.id}`,
      },
    });

    return updated;
  }

  async bulkAssign(input: BulkAssignEnquiryInput, currentUserId: string) {
    const { enquiryIds, assignedToUserId } = input;

    await this.prisma.enquiry.updateMany({
      where: { id: { in: enquiryIds } },
      data: {
        assignedToUserId,
        assignedByUserId: currentUserId,
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: assignedToUserId,
        title: 'Bulk Enquiries Assigned',
        message: `${enquiryIds.length} enquiries have been assigned to you.`,
        type: NotificationType.ENQUIRY_ASSIGNED,
        link: `/enquiries`,
      },
    });

    return { count: enquiryIds.length };
  }

  // Unified timeline from follow-ups and call logs
  async listActivities(enquiryId: string) {
    const [followUps, callLogs] = await Promise.all([
      this.prisma.followUp.findMany({
        where: { enquiryId },
        orderBy: { scheduledAt: 'desc' },
        include: { createdBy: { select: { id: true, name: true } } },
      }),
      this.prisma.callLog.findMany({
        where: { enquiryId },
        orderBy: { callDate: 'desc' },
        include: { createdBy: { select: { id: true, name: true } } },
      }),
    ]);

    const activities = [
      ...followUps.map((f) => ({
        id: f.id,
        type: 'FOLLOW_UP',
        title: `Follow-up: ${f.status}`,
        description: f.notes || f.outcome || '',
        createdAt: f.createdAt,
        scheduledAt: f.scheduledAt,
        createdBy: f.createdBy,
      })),
      ...callLogs.map((c) => ({
        id: c.id,
        type: 'CALL_LOG',
        title: `Call (${c.duration || 0} mins)`,
        description: c.notes || c.outcome || '',
        createdAt: c.callDate,
        createdBy: c.createdBy,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return activities;
  }
}
