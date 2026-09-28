import { FastifyReply, FastifyRequest } from 'fastify';
import { paginatedResponse, successResponse } from '../../utils/response.js';
import {
  assignEnquirySchema,
  bulkAssignEnquirySchema,
  changeEnquiryStatusSchema,
  createEnquirySchema,
  enquiryFilterSchema,
  updateEnquirySchema,
} from './enquiry.schema.js';
import { EnquiryService } from './enquiry.service.js';

export class EnquiryController {
  static async listEnquiries(request: FastifyRequest, reply: FastifyReply) {
    const filters = enquiryFilterSchema.parse(request.query);
    const service = new EnquiryService(request.server.prisma);
    const { enquiries, total } = await service.listEnquiries(filters, request.user);
    return reply.send(paginatedResponse(enquiries, total, filters.page, filters.limit));
  }

  static async getEnquiry(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const service = new EnquiryService(request.server.prisma);
    const enquiry = await service.getEnquiryById(id);
    return reply.send(successResponse(enquiry));
  }

  static async createEnquiry(request: FastifyRequest, reply: FastifyReply) {
    const validated = createEnquirySchema.parse(request.body);
    const service = new EnquiryService(request.server.prisma);
    const created = await service.createEnquiry(validated, request.user.id);
    return reply.status(201).send(successResponse(created, 'Enquiry created successfully'));
  }

  static async updateEnquiry(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const validated = updateEnquirySchema.parse(request.body);
    const service = new EnquiryService(request.server.prisma);
    const updated = await service.updateEnquiry(id, validated, request.user.id);
    return reply.send(successResponse(updated, 'Enquiry updated successfully'));
  }

  static async deleteEnquiry(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const service = new EnquiryService(request.server.prisma);
    await service.deleteEnquiry(id);
    return reply.send(successResponse(null, 'Enquiry deleted successfully'));
  }

  static async changeStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const validated = changeEnquiryStatusSchema.parse(request.body);
    const service = new EnquiryService(request.server.prisma);
    const updated = await service.changeStatus(id, validated, request.user.id);
    return reply.send(successResponse(updated, 'Status updated successfully'));
  }

  static async assignEnquiry(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const validated = assignEnquirySchema.parse(request.body);
    const service = new EnquiryService(request.server.prisma);
    const updated = await service.assignEnquiry(id, validated.assignedToUserId, request.user.id);
    return reply.send(successResponse(updated, 'Enquiry assigned successfully'));
  }

  static async bulkAssign(request: FastifyRequest, reply: FastifyReply) {
    const validated = bulkAssignEnquirySchema.parse(request.body);
    const service = new EnquiryService(request.server.prisma);
    const result = await service.bulkAssign(validated, request.user.id);
    return reply.send(successResponse(result, `${result.count} enquiries assigned successfully`));
  }

  static async listActivities(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const service = new EnquiryService(request.server.prisma);
    const activities = await service.listActivities(id);
    return reply.send(successResponse(activities));
  }
}