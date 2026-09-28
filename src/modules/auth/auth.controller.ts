import { FastifyReply, FastifyRequest } from 'fastify';
import { successResponse } from '../../utils/response.js';
import { loginSchema, registerSchema } from './auth.schema.js';
import { AuthService } from './auth.service.js';

export class AuthController {
  static async login(request: FastifyRequest, reply: FastifyReply) {
    const validated = loginSchema.parse(request.body);
    const authService = new AuthService(request.server.prisma);
    const user = await authService.login(validated);

    const token = await reply.jwtSign({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      branch: user.branch,
    });

    reply.setCookie('auth_token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return reply.send(successResponse({ user, token }, 'Logged in successfully'));
  }

  static async register(request: FastifyRequest, reply: FastifyReply) {
    const validated = registerSchema.parse(request.body);
    const authService = new AuthService(request.server.prisma);
    const newUser = await authService.register(validated);

    return reply.status(201).send(successResponse(newUser, 'User registered successfully'));
  }

  static async logout(request: FastifyRequest, reply: FastifyReply) {
    reply.clearCookie('auth_token', { path: '/' });
    return reply.send(successResponse(null, 'Logged out successfully'));
  }

  static async getMe(request: FastifyRequest, reply: FastifyReply) {
    const authService = new AuthService(request.server.prisma);
    const user = await authService.getMe(request.user.id);
    return reply.send(successResponse(user));
  }
}