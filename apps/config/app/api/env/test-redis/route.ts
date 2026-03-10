import { NextRequest, NextResponse } from 'next/server';

import Redis from 'ioredis';

import { redisTestParamsSchema } from '@/lib/env-schemas';

const CONNECT_TIMEOUT_MS = 5000;

function parsePort(portStr: string | undefined): number {
  if (portStr === undefined || portStr === '') return 6379;
  const n = parseInt(portStr, 10);
  return Number.isFinite(n) && n >= 1 && n <= 65535 ? n : 6379;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = redisTestParamsSchema.safeParse(body ?? {});
    if (!parsed.success) {
      const first = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
      return NextResponse.json(
        { ok: false, error: typeof first === 'string' ? first : 'Invalid Redis params' },
        { status: 400 }
      );
    }
    const { host, port: portStr, password } = parsed.data;
    const port = parsePort(portStr);

    const redis = new Redis({
      host,
      port,
      password: password === '' ? undefined : password,
      connectTimeout: CONNECT_TIMEOUT_MS,
      maxRetriesPerRequest: 1,
    });
    try {
      await redis.ping();
      return NextResponse.json({ ok: true });
    } finally {
      redis.disconnect();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
