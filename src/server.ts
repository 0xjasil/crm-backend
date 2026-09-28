import { buildApp } from './app.js';
import { config } from './config/env.js';

async function start() {
  try {
    const app = await buildApp();

    await app.listen({
      port: config.port,
      host: config.host,
    });

    console.log(`\n🚀 Server listening at http://${config.host}:${config.port}`);
    console.log(`📖 Swagger documentation at http://${config.host}:${config.port}/api/docs\n`);

    const signals = ['SIGINT', 'SIGTERM'];
    for (const signal of signals) {
      process.on(signal, async () => {
        console.log(`\nReceived ${signal}, shutting down gracefully...`);
        await app.close();
        process.exit(0);
      });
    }
  } catch (err) {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  }
}

start();
