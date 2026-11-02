import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireFeature, requireManagerOrAdmin, requireRole } from '../../middleware/permission.middleware.js';
import { AdmissionController } from './admission.controller.js';

export const admissionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/assignees', { preHandler: [requireFeature('projects')] }, AdmissionController.listAssignees);
  fastify.get('/', AdmissionController.listAdmissions);
  fastify.get('/:id', AdmissionController.getAdmission);
  fastify.post('/', { preHandler: [requireFeature('projects')] }, AdmissionController.createAdmission);
  fastify.patch('/:id/assignee', { preHandler: [requireManagerOrAdmin()] }, AdmissionController.reassignAdmission);
  fastify.patch('/:id', { preHandler: [requireRole(['admin', 'executive'])] }, AdmissionController.updateAdmission);
  fastify.delete('/:id', { preHandler: [requireRole(['admin'])] }, AdmissionController.deleteAdmission);
};
