import { FastifyReply, FastifyRequest } from 'fastify';
import { ForbiddenError, UnauthorizedError } from '../errors/app-error.js';
import { hasFeatureAccess, isAdminRole, isManagerRole } from '../modules/auth/permissions.js';

export function requireRole(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const userRole = request.user.role || 'telecaller';

    if (!allowedRoles.includes(userRole)) {
      throw new ForbiddenError(`Access denied. Requires one of roles: ${allowedRoles.join(', ')}`);
    }
  };
}

export function requireFeature(feature: string) {
  return async (request: FastifyRequest) => {
    if (!request.user) throw new UnauthorizedError('Authentication required');
    if (!hasFeatureAccess(request.user, feature)) throw new ForbiddenError(`Access denied. Requires ${feature} permission`);
  };
}

export function requireManagerOrAdmin() {
  return async (request: FastifyRequest) => {
    if (!request.user) throw new UnauthorizedError('Authentication required');
    if (!isManagerRole(request.user.role) && !isAdminRole(request.user.role)) {
      throw new ForbiddenError('Only managers and administrators can reassign admissions');
    }
  };
}
