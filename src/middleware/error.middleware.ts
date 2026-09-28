import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';
import { errorResponse } from '../utils/response.js';

export function errorHandler(error: FastifyError | AppError | Error, request: FastifyRequest, reply: FastifyReply) {
  request.log.error(error);

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send(errorResponse(error.code, error.message, error.details));
  }

  if (error instanceof ZodError) {
    const formatted = error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return reply.status(400).send(errorResponse('VALIDATION_ERROR', 'Input validation failed', formatted));
  }

  // Fastify validation errors
  if ('validation' in error && error.validation) {
    return reply.status(400).send(errorResponse('VALIDATION_ERROR', error.message, error.validation));
  }

  // Prisma unique constraint error
  if ('code' in error && error.code === 'P2002') {
    return reply.status(409).send(errorResponse('CONFLICT', 'A record with this unique value already exists'));
  }

  // Default server error
  const statusCode = ('statusCode' in error && typeof error.statusCode === 'number') ? error.statusCode : 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message;

  return reply.status(statusCode).send(errorResponse('INTERNAL_SERVER_ERROR', message));
}
