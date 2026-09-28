import { buildApp } from '../dist/app.js';

let app = null;

export default async function handler(req, res) {
  try {
    if (!app) {
      app = await buildApp();
      await app.ready();
    }
    app.server.emit('request', req, res);
  } catch (error) {
    console.error('Serverless Handler Error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'Internal Server Error in Serverless Handler',
        message: error instanceof Error ? error.message : String(error),
      })
    );
  }
}
