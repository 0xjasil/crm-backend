import { z } from 'zod';

export const enquiryFilterSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  branchId: z.string().optional(),
  assignedToUserId: z.string().optional(),
  preferredCourseId: z.string().optional(),
  serviceId: z.string().optional(),
  source: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const createEnquirySchema = z.object({
  candidateName: z.string().min(1, 'Candidate name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  contact2: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  feedback: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  preferredCourseId: z.string().optional().nullable(),
  serviceId: z.string().optional().nullable(),
  assignedToUserId: z.string().optional().nullable(),
  status: z.enum([
    'NEW', 'CONTACTED', 'INTERESTED', 'NOT_INTERESTED',
    'FOLLOW_UP', 'ENROLLED', 'DROPPED', 'INVALID'
  ]).default('NEW'),
});

export const updateEnquirySchema = createEnquirySchema.partial();

export const changeEnquiryStatusSchema = z.object({
  status: z.enum([
    'NEW', 'CONTACTED', 'INTERESTED', 'NOT_INTERESTED',
    'FOLLOW_UP', 'ENROLLED', 'DROPPED', 'INVALID'
  ]),
  remarks: z.string().optional().nullable(),
});

export const assignEnquirySchema = z.object({
  assignedToUserId: z.string().min(1, 'Assigned user ID is required'),
});

export const bulkAssignEnquirySchema = z.object({
  enquiryIds: z.array(z.string().min(1)).min(1, 'At least one enquiry ID required'),
  assignedToUserId: z.string().min(1, 'Assigned user ID is required'),
});

export const addEnquiryActivitySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  type: z.string().optional(),
});

export type EnquiryFilterInput = z.infer<typeof enquiryFilterSchema>;
export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;
export type UpdateEnquiryInput = z.infer<typeof updateEnquirySchema>;
export type ChangeEnquiryStatusInput = z.infer<typeof changeEnquiryStatusSchema>;
export type AssignEnquiryInput = z.infer<typeof assignEnquirySchema>;
export type BulkAssignEnquiryInput = z.infer<typeof bulkAssignEnquirySchema>;
export type AddEnquiryActivityInput = z.infer<typeof addEnquiryActivitySchema>;
