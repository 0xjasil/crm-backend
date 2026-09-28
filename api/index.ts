import type { IncomingMessage, ServerResponse } from 'http';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

let app: FastifyInstance | null = null;

async function getApp(): Promise<FastifyInstance> {
  if (!app) {
    app = await buildApp();
    await app.ready();
  }
  return app;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const instance = await getApp();
  instance.server.emit('request', req, res);
}
