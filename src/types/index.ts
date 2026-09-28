import { PrismaClient } from '@prisma/client';

export interface UserPayload {
  id: string;
  email: string;
  name: string;
  role: string | null;
  branch: string | null;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: UserPayload;
    user: UserPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}