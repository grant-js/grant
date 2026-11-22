import { NextRequest, NextResponse } from 'next/server';
import { assertUrlAllowed, SsrfBlockedError } from '@grantjs/webhooks';

import { appUrlRequiredSchema } from '@/lib/env-schemas';
import { LOCAL_HEALTH_CHECK_HOSTS, toHealthCheckUrl } from '@/lib/health-check-url';

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
    const healthUrl = toHealthCheckUrl(parsed.data);

    try {
      await assertUrlAllowed(healthUrl, {
        allowedProtocols: ['http:', 'https:'],
        allowlist: [...LOCAL_HEALTH_CHECK_HOSTS],
      });
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        return NextResponse.json(
          { ok: false, error: 'APP_URL is not an allowed health target' },
          { status: 400 }
        );
      }
      throw err;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      // codeql[js/request-forgery]: URL passed through assertUrlAllowed (http/https, localhost allowlist, no private targets).
      const res = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        redirect: 'manual',
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
