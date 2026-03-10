import { NextRequest, NextResponse } from 'next/server';

import { appUrlRequiredSchema } from '@/lib/env-schemas';

const REQUEST_TIMEOUT_MS = 5000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = appUrlRequiredSchema.safeParse(body?.appUrl ?? '');
    if (!parsed.success) {
      const first = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
      return NextResponse.json(
        { ok: false, error: typeof first === 'string' ? first : 'Invalid APP_URL' },
        { status: 400 }
      );
    }
    const baseUrl = parsed.data.replace(/\/+$/, '');
    const healthUrl = `${baseUrl}/health`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        return NextResponse.json(
          { ok: false, error: `Health check returned ${res.status}` },
          { status: 502 }
        );
      }
      const json = (await res.json()) as { status?: string };
      if (json?.status !== 'ok') {
        return NextResponse.json(
          { ok: false, error: 'Health response missing status ok' },
          { status: 502 }
        );
      }
      return NextResponse.json({ ok: true });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      throw fetchErr;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Health check failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
