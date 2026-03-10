import { NextRequest, NextResponse } from 'next/server';

import type { EnvStateResponse, EnvVarValue } from '@/app/types/env';
import { readAllEnvFiles, writeEnvKeyToFiles } from '@/lib/env-files';
import {
  getAllEnvVarMeta,
  getSyncTargetsForKey,
  getReplicateToWeb,
  ENV_FILE_PATHS,
  getEnvVarMeta,
} from '@/lib/env-metadata';
import { getRepoRoot } from '@/lib/repo-root';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** GET: return current env state from all .env files */
export async function GET(): Promise<NextResponse<EnvStateResponse | { error: string }>> {
  try {
    const repoRoot = getRepoRoot();
    const filePaths = [...ENV_FILE_PATHS];
    const files = readAllEnvFiles(repoRoot, filePaths);
    const meta = getAllEnvVarMeta();

    const vars: EnvVarValue[] = [];
    for (const m of meta) {
      let value = '';
      let source = '';
      for (const rel of m.envFiles) {
        const fileVals = files[rel];
        if (fileVals && m.key in fileVals) {
          value = fileVals[m.key] ?? '';
          source = rel;
          break;
        }
      }
      const status: EnvVarValue['status'] =
        value === '' ? (m.required ? 'missing' : 'empty') : 'set';
      vars.push({
        key: m.key,
        value,
        source,
        status,
      });
    }

    return NextResponse.json({
      repoRoot,
      files,
      vars,
      meta,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to read env';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST: update one env var and persist to relevant file(s). Body: { key: string, value: string } */
export async function POST(
  request: NextRequest
): Promise<NextResponse<{ ok: boolean; error?: string }>> {
  try {
    const body = await request.json();
    const { key, value } = body as { key?: string; value?: string };
    if (typeof key !== 'string' || key.trim() === '') {
      return NextResponse.json({ ok: false, error: 'key is required' }, { status: 400 });
    }
    const val = typeof value === 'string' ? value : '';

    const repoRoot = getRepoRoot();
    const meta = getEnvVarMeta(key);
    const syncTargets = getSyncTargetsForKey(key);
    // Sync vars (e.g. SYSTEM_USER_ID, DB_URL) must be written to all targets so seeding and API stay in sync
    const pathsToWrite =
      syncTargets.length > 0 ? syncTargets : (meta?.envFiles ?? ['apps/api/.env']);

    writeEnvKeyToFiles(repoRoot, key.trim(), val, pathsToWrite);

    // Replicate to web app when API var is updated (e.g. PRIVACY_ACCOUNT_DELETION_RETENTION_DAYS → NEXT_PUBLIC_ACCOUNT_DELETION_RETENTION_DAYS)
    const replicate = getReplicateToWeb(key);
    if (replicate) {
      writeEnvKeyToFiles(repoRoot, replicate.key, val, [replicate.file]);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to write env';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
