import { NextRequest, NextResponse } from 'next/server';

import { githubOAuthTestParamsSchema } from '@/lib/env-schemas';

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Validates GitHub OAuth app credentials by attempting a token exchange with a
 * dummy code. GitHub returns "bad_verification_code" when client_id/client_secret
 * are valid but the code is invalid; "incorrect_client_credentials" when the
 * app credentials are wrong. See:
 * https://docs.github.com/en/apps/oauth-apps/maintaining-oauth-apps/troubleshooting-oauth-app-access-token-request-errors
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = githubOAuthTestParamsSchema.safeParse(body ?? {});
    if (!parsed.success) {
      const first = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
      return NextResponse.json(
        { ok: false, error: typeof first === 'string' ? first : 'Invalid GitHub OAuth params' },
        { status: 400 }
      );
    }
    const { clientId, clientSecret } = parsed.data;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(GITHUB_TOKEN_URL, {
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
        }).toString(),
      });
      clearTimeout(timeoutId);
      const json = (await res.json()) as { error?: string; error_description?: string };
      if (json.error === 'incorrect_client_credentials') {
        return NextResponse.json(
          { ok: false, error: 'Invalid client ID or client secret' },
          { status: 502 }
        );
      }
      if (json.error === 'bad_verification_code') {
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json(
        { ok: false, error: json.error_description ?? json.error ?? 'Unexpected GitHub response' },
        { status: 502 }
      );
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      throw fetchErr;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'GitHub OAuth check failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
