import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
import { dbUrlRequiredSchema } from '@/lib/env-schemas';

const CONNECT_TIMEOUT_SEC = 5;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = dbUrlRequiredSchema.safeParse(body?.dbUrl ?? '');
    if (!parsed.success) {
      const first = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
      return NextResponse.json(
        { ok: false, error: typeof first === 'string' ? first : 'Invalid DB_URL' },
        { status: 400 }
      );
    }
    const dbUrl = parsed.data;

    const sql = postgres(dbUrl, {
      max: 1,
      connect_timeout: CONNECT_TIMEOUT_SEC,
      idle_timeout: 0,
    });
    try {
      await sql`SELECT 1`;
      return NextResponse.json({ ok: true });
    } finally {
      await sql.end();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
