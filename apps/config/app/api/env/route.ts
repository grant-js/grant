import { NextRequest, NextResponse } from 'next/server';

import { ENV_KEYS, envSchema, getSchemaDefaults } from '@grantjs/env';

import type { EnvStateResponse, EnvVarValue } from '@/app/types/env';
import { ENVIRONMENTS, readAllEnvFiles, writeEnvKeyToFiles } from '@/lib/env-files';
import type { EnvEnvironment } from '@/lib/env-files';
import { getAllEnvVarMeta, getEnvVarMeta } from '@/lib/env-metadata';
import { getRepoRoot } from '@/lib/repo-root';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function parseEnvironment(value: string | null): EnvEnvironment {
  if (value === 'demo' || value === 'test') return value;
  return 'default';
}

/** GET: return current env state for the selected root env file */
export async function GET(
  request: NextRequest
): Promise<NextResponse<EnvStateResponse | { error: string }>> {
  try {
    const environment = parseEnvironment(request.nextUrl.searchParams.get('environment'));
    const selectedFile = ENVIRONMENTS[environment];
    const repoRoot = getRepoRoot();
    const files = readAllEnvFiles(repoRoot, [selectedFile]);
    const envFile = files[selectedFile] ?? {};
    const meta = getAllEnvVarMeta();
    const defaultsRaw = getSchemaDefaults();

    const schemaKeys = Object.keys(envSchema.shape);
    const metaKeys = meta.map((m) => m.key);
    const missingMeta = schemaKeys.filter((k) => !metaKeys.includes(k));
    if (missingMeta.length > 0) {
      console.warn('Missing metadata for:', missingMeta);
    }

    const defaults: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(defaultsRaw)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        defaults[k] = v;
      }
    }

    const vars: EnvVarValue[] = ENV_KEYS.map((key) => {
      const value = envFile[key] ?? '';
      const m = getEnvVarMeta(key);
      const status: EnvVarValue['status'] =
        value !== '' ? 'set' : m?.required ? 'missing' : 'empty';
      return {
        key,
        value,
        source: value !== '' ? selectedFile : '',
        status,
      };
    });

    return NextResponse.json({
      repoRoot,
      files,
      vars,
      meta,
      defaults,
      selectedFile,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to read env';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST: update one env var in the selected root env file. Body: { key, value, environment? } */
export async function POST(
  request: NextRequest
): Promise<NextResponse<{ ok: boolean; error?: string }>> {
  try {
    const body = await request.json();
    const { key, value, environment } = body as {
      key?: string;
      value?: string;
      environment?: string;
    };
    if (typeof key !== 'string' || key.trim() === '') {
      return NextResponse.json({ ok: false, error: 'key is required' }, { status: 400 });
    }
    const val = typeof value === 'string' ? value : '';
    const env = parseEnvironment(environment ?? null);
    const selectedFile = ENVIRONMENTS[env];

    const repoRoot = getRepoRoot();
    writeEnvKeyToFiles(repoRoot, key.trim(), val, [selectedFile]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to write env';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
