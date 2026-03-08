import { existsSync } from 'node:fs';
import { copyFile, mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

function parseArgs(argv) {
  const args = new Set(argv);
  return {
    force: args.has('--force'),
    quiet: args.has('--quiet'),
  };
}

async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function ensureEnv({ examplePath, envPath, force, quiet }) {
  if (!(await fileExists(examplePath))) {
    if (!quiet) console.log(`- skip (missing): ${examplePath}`);
    return { status: 'skipped_missing_example' };
  }

  const already = existsSync(envPath);
  if (already && !force) {
    if (!quiet) console.log(`- keep (exists):  ${envPath}`);
    return { status: 'kept_existing' };
  }

  await mkdir(dirname(envPath), { recursive: true });
  await copyFile(examplePath, envPath);
  if (!quiet) console.log(`- ${already ? 'overwrite' : 'create'}:     ${envPath}`);
  return { status: already ? 'overwritten' : 'created' };
}

async function main() {
  const { force, quiet } = parseArgs(process.argv.slice(2));

  const targets = [
    // Docker compose / repo root
    { example: '.env.example', env: '.env' },

    // Core apps/packages used for local dev
    { example: 'apps/api/.env.example', env: 'apps/api/.env' },
    { example: 'apps/web/.env.example', env: 'apps/web/.env' },
    { example: 'packages/@grantjs/database/.env.example', env: 'packages/@grantjs/database/.env' },

    // Examples (not required for platform dev, but useful for onboarding)
    {
      example: 'packages/@grantjs/server/examples/express/.env.example',
      env: 'packages/@grantjs/server/examples/express/.env',
    },
    {
      example: 'packages/@grantjs/server/examples/fastify/.env.example',
      env: 'packages/@grantjs/server/examples/fastify/.env',
    },
    {
      example: 'packages/@grantjs/server/examples/nestjs/.env.example',
      env: 'packages/@grantjs/server/examples/nestjs/.env',
    },
    {
      example: 'packages/@grantjs/server/examples/nextjs/.env.example',
      env: 'packages/@grantjs/server/examples/nextjs/.env',
    },
    {
      example: 'packages/@grantjs/client/examples/nextjs/.env.example',
      env: 'packages/@grantjs/client/examples/nextjs/.env',
    },
  ];

  if (!quiet) {
    console.log('Ensuring local .env files exist (will not overwrite unless --force).');
  }

  let created = 0;
  let overwritten = 0;
  let kept = 0;
  let skippedMissing = 0;

  for (const t of targets) {
    const res = await ensureEnv({
      examplePath: resolve(ROOT, t.example),
      envPath: resolve(ROOT, t.env),
      force,
      quiet,
    });

    if (res.status === 'created') created += 1;
    else if (res.status === 'overwritten') overwritten += 1;
    else if (res.status === 'kept_existing') kept += 1;
    else if (res.status === 'skipped_missing_example') skippedMissing += 1;
  }

  if (!quiet) {
    console.log(
      `Done. created=${created}, overwritten=${overwritten}, kept=${kept}, skipped_missing_example=${skippedMissing}`
    );
  }
}

main().catch((err) => {
  console.error('env setup failed');
  console.error(err);
  process.exit(1);
});
