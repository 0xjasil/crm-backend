import type { FastifyPluginAsync } from 'fastify';
import { EnquiryStatus, FollowUpStatus, JobLeadStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireFeature } from '../../middleware/permission.middleware.js';
import type { UserPayload } from '../../types/index.js';

const dashboardInputSchema = z.object({
  userId: z.string().min(1).optional(),
  userRole: z.string().min(1).optional(),
  userBranch: z.string().min(1).optional(),
});

function isManager(role: string | null) {
  return ['manager', 'branch manager'].includes((role || '').trim().toLowerCase());
}

function isAdmin(role: string | null) {
  return ['admin', 'super admin'].includes((role || '').trim().toLowerCase());
}

function dashboardScopes(user: UserPayload) {
  const role = (user.role || '').trim().toLowerCase();
  const enquiryWhere: Prisma.EnquiryWhereInput = role === 'telecaller'
    ? { assignedToUserId: user.id }
    : role === 'executive' && user.branch
      ? { branchId: user.branch }
      : {};
  const followUpWhere: Prisma.FollowUpWhereInput = role === 'telecaller'
    ? { enquiry: { assignedToUserId: user.id } }
    : role === 'executive' && user.branch
      ? { enquiry: { branchId: user.branch } }
      : {};
  const callLogWhere: Prisma.CallLogWhereInput = role === 'telecaller'
    ? { enquiry: { assignedToUserId: user.id } }
    : role === 'executive' && user.branch
      ? { enquiry: { branchId: user.branch } }
      : {};

  return { enquiryWhere, followUpWhere, callLogWhere };
}

export const workflowCompatRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  app.get('/ui/sidebar-counts', async (request) => {
    const user = request.user;
    const admin = isAdmin(user.role);
    const manager = isManager(user.role);
    const branchScope = manager && user.branch ? { branchId: user.branch } : undefined;

    const jobWhere: Prisma.JobLeadWhereInput = { status: JobLeadStatus.PENDING };
    const followUpWhere: Prisma.FollowUpWhereInput = { status: FollowUpStatus.PENDING };
    if (!admin) {
      if (manager && user.branch) {
        jobWhere.job = { branchId: user.branch };
        followUpWhere.enquiry = { branchId: user.branch };
      } else {
        jobWhere.lead = { assignedToUserId: user.id };
        followUpWhere.enquiry = { assignedToUserId: user.id };
      }
    }

    const [enquiries, jobOrdersPending, followUps] = await Promise.all([
      admin
        ? app.prisma.enquiry.count({ where: { assignedToUserId: null } })
        : manager && branchScope
          ? app.prisma.enquiry.count({ where: { assignedToUserId: null, ...branchScope } })
          : 0,
      app.prisma.jobLead.count({ where: jobWhere }),
      app.prisma.followUp.count({ where: followUpWhere }),
    ]);

    return { enquiries, jobOrdersPending, followUps };
  });

  app.post('/workflows/dashboard/getDashboardData', { preHandler: [requireFeature('dashboard')] }, async (request) => {
    dashboardInputSchema.parse(request.body || {});
    const user = request.user;
    const { enquiryWhere, followUpWhere, callLogWhere } = dashboardScopes(user);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalEnquiries,
      newEnquiries,
      interestedLeadsCount,
      enrolledEnquiries,
      pendingFollowUps,
      overdueCount,
      todayCount,
      totalCalls,
      recentEnquiries,
      recentCalls,
      recentEnrollments,
    ] = await Promise.all([
      app.prisma.enquiry.count({ where: enquiryWhere }),
      app.prisma.enquiry.count({ where: { ...enquiryWhere, status: EnquiryStatus.NEW } }),
      app.prisma.enquiry.count({ where: { ...enquiryWhere, status: EnquiryStatus.INTERESTED } }),
      app.prisma.enquiry.count({ where: { ...enquiryWhere, status: EnquiryStatus.ENROLLED } }),
      app.prisma.followUp.count({ where: { ...followUpWhere, status: FollowUpStatus.PENDING } }),
      app.prisma.followUp.count({ where: { ...followUpWhere, status: FollowUpStatus.PENDING, scheduledAt: { lt: startOfToday } } }),
      app.prisma.followUp.count({ where: { ...followUpWhere, scheduledAt: { gte: startOfToday, lt: startOfTomorrow } } }),
      app.prisma.callLog.count({ where: callLogWhere }),
      app.prisma.enquiry.count({ where: { ...enquiryWhere, createdAt: { gte: weekAgo } } }),
      app.prisma.callLog.count({ where: { ...callLogWhere, createdAt: { gte: weekAgo } } }),
      app.prisma.enquiry.count({ where: { ...enquiryWhere, status: EnquiryStatus.ENROLLED, updatedAt: { gte: weekAgo } } }),
    ]);

    const interestRate = totalEnquiries ? Math.round((interestedLeadsCount / totalEnquiries) * 100) : 0;
    const conversionRate = totalEnquiries ? Math.round((enrolledEnquiries / totalEnquiries) * 100) : 0;

    return {
      stats: { totalEnquiries, newEnquiries, pendingFollowUps, totalCalls },
      followUpStats: { overdueCount, todayCount, interestedLeadsCount },
      recentActivity: {
        newEnquiries: { count: recentEnquiries, description: `${recentEnquiries} new leads captured this week` },
        callsMade: { count: recentCalls, description: `${recentCalls} calls completed by team` },
        enrollments: { count: recentEnrollments, description: `${recentEnrollments} successful conversions` },
      },
      performanceMetrics: { totalEnquiries, interestRate, conversionRate, totalCalls },
    };
  });
};
