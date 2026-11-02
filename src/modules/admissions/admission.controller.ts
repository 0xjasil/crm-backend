import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { paginatedResponse, successResponse } from '../../utils/response.js';
import {
  admissionFilterSchema,
  createAdmissionSchema,
  updateAdmissionSchema,
} from './admission.schema.js';
import { AdmissionService } from './admission.service.js';

export class AdmissionController {
  static async listAdmissions(request: FastifyRequest, reply: FastifyReply) {
    const filters = admissionFilterSchema.parse(request.query);
    const service = new AdmissionService(request.server.prisma);
    const { admissions, total } = await service.listAdmissions(filters, request.user);
    return reply.send(paginatedResponse(admissions, total, filters.page, filters.limit));
  }

  static async getAdmission(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const service = new AdmissionService(request.server.prisma);
    const admission = await service.getAdmissionById(id, request.user);
    return reply.send(successResponse(admission));
  }

  static async createAdmission(request: FastifyRequest, reply: FastifyReply) {
    const validated = createAdmissionSchema.parse(request.body);
    const service = new AdmissionService(request.server.prisma);
    const created = await service.createAdmission(validated, request.user);
    return reply.status(201).send(successResponse(created, 'Admission created successfully'));
  }

  static async updateAdmission(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const validated = updateAdmissionSchema.parse(request.body);
    const service = new AdmissionService(request.server.prisma);
    const updated = await service.updateAdmission(id, validated, request.user);
    return reply.send(successResponse(updated, 'Admission updated successfully'));
  }

  static async deleteAdmission(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const service = new AdmissionService(request.server.prisma);
    await service.deleteAdmission(id, request.user);
    return reply.send(successResponse(null, 'Admission deleted successfully'));
  }

  static async listAssignees(request: FastifyRequest, reply: FastifyReply) {
    const service = new AdmissionService(request.server.prisma);
    const assignees = await service.getAdmissionAssignees(request.user);
    return reply.send(successResponse(assignees));
  }

  static async reassignAdmission(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { assignedToUserId } = z.object({ assignedToUserId: z.string().min(1) }).parse(request.body);
    const service = new AdmissionService(request.server.prisma);
    const admission = await service.reassignAdmission(id, assignedToUserId, request.user);
    return reply.send(successResponse(admission, 'Admission reassigned successfully'));
  }
}
