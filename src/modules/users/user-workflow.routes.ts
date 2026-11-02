import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/permission.middleware.js';
import { UserService } from './user.service.js';

export const userWorkflowRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  fastify.post('/deleteUserAction', { preHandler: [requireRole(['admin'])] }, async (request) => {
    const { input } = z.object({
      input: z.object({ userId: z.string().min(1) }),
    }).parse(request.body ?? {});

    await new UserService(fastify.prisma).deleteUser(input.userId);
    return { success: true, message: 'User deleted successfully' };
  });
};
