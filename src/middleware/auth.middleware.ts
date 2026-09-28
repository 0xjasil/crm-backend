import { FastifyReply, FastifyRequest } from 'fastify';
import { UnauthorizedError } from '../errors/app-error.js';
import { UserPayload } from '../types/index.js';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    let token = request.cookies.auth_token;

    if (!token && request.headers.authorization) {
      const parts = request.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      throw new UnauthorizedError('Authentication token missing');
    }

    const decoded = (await request.jwtVerify()) as UserPayload;

    // Verify user is active & not banned
    const user = await request.server.prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, branch: true, banned: true },
    });

    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    if (user.banned) {
      throw new UnauthorizedError('User account is banned');
    }

    request.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      branch: user.branch,
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      throw err;
    }
    throw new UnauthorizedError('Invalid or expired authentication token');
  }
}
