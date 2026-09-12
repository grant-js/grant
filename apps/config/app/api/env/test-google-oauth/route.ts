import { NextRequest, NextResponse } from 'next/server';

import { googleOAuthTestParamsSchema } from '@/lib/env-schemas';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Validates Google OAuth client credentials by attempting a token exchange with a
 * dummy code. Google returns "invalid_grant" when client_id/client_secret are valid
 * but the code is invalid; "invalid_client" when the credentials are wrong.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = googleOAuthTestParamsSchema.safeParse(body ?? {});
    if (!parsed.success) {
      const first = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
      return NextResponse.json(
        { ok: false, error: typeof first === 'string' ? first : 'Invalid Google OAuth params' },
        { status: 400 }
      );
    }
    const { clientId, clientSecret } = parsed.data;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: 'config-app-dummy-code',
          grant_type: 'authorization_code',
          redirect_uri: 'http://localhost/callback',
        }).toString(),
      });
      clearTimeout(timeoutId);
      const json = (await res.json()) as { error?: string; error_description?: string };
      if (json.error === 'invalid_client') {
        return NextResponse.json(
          { ok: false, error: 'Invalid client ID or client secret' },
          { status: 502 }
        );
      }
      if (json.error === 'invalid_grant') {
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json(
        { ok: false, error: json.error_description ?? json.error ?? 'Unexpected Google response' },
        { status: 502 }
      );
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      throw fetchErr;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Google OAuth check failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
