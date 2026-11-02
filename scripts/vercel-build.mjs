import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const databaseUrl = process.env.POSTGRES_PRISMA_DATABASE_URL?.trim()
  || process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.error('Set POSTGRES_PRISMA_DATABASE_URL or DATABASE_URL in the Vercel project environment.');
  process.exit(1);
}

const env = { ...process.env, POSTGRES_PRISMA_DATABASE_URL: databaseUrl };
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const commands = [
  ['exec', 'prisma', 'db', 'execute', '--schema', 'prisma/schema.prisma', '--file', 'prisma/migrations/202610230002_invoice_financial_fields/migration.sql'],
  ['exec', 'prisma', 'db', 'execute', '--schema', 'prisma/schema.prisma', '--file', 'prisma/migrations/202611020001_admission_assignee/migration.sql'],
  ['exec', 'prisma', 'generate'],
  ['exec', 'tsc'],
];

for (const args of commands) {
  const result = spawnSync(pnpmCommand, args, {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
