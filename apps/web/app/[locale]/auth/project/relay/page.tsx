'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { exchangeProjectOAuthCode } from '@/lib/project-oauth-api';
import { PROJECT_OAUTH_MESSAGE_TYPE } from '@/lib/project-oauth-authorize.lib';
import {
  clearProjectOAuthPkceSession,
  loadProjectOAuthPkceSession,
  persistProjectOAuthTestTokens,
} from '@/lib/project-oauth-pkce.lib';

type RelayStatus = 'reading' | 'exchanging' | 'sent' | 'complete' | 'no_opener' | 'error';

/**
 * Relay page for project OAuth authorization-code callbacks.
 * Reads `code` + `state` from the query, exchanges them with the stored PKCE verifier,
 * then postMessages tokens to the same-origin opener. Tokens are never painted here.
 */
export default function ProjectOAuthRelayPage() {
  const t = useTranslations('auth.projectOAuth.relay');
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<RelayStatus>('reading');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');
    const errorDescription = searchParams.get('error_description');

    const postToOpener = (payload: Record<string, unknown>) => {
      if (!window.opener) return false;
      window.opener.postMessage(payload, window.location.origin);
      return true;
    };

    if (error) {
      const payload = {
        type: PROJECT_OAUTH_MESSAGE_TYPE,
        error,
        ...(errorDescription && { error_description: errorDescription }),
        ...(state && { state }),
      };
      const sent = postToOpener(payload);
      queueMicrotask(() => {
        setStatus(sent ? 'sent' : 'no_opener');
        setMessage(errorDescription || error);
      });
      if (sent) window.close();
      return;
    }

    if (!code) {
      queueMicrotask(() => {
        setStatus('error');
        setMessage(t('missingCode'));
      });
      return;
    }

    const session = loadProjectOAuthPkceSession(state);
    if (!session?.verifier) {
      queueMicrotask(() => {
        setStatus('error');
        setMessage(t('missingVerifier'));
      });
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setStatus('exchanging');
    });

    void exchangeProjectOAuthCode({
      clientId: session.clientId,
      redirectUri: session.redirectUri,
      code,
      codeVerifier: session.verifier,
    })
      .then((result) => {
        if (cancelled) return;
        const snapshot = {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          tokenType: result.tokenType,
          expiresIn: result.expiresIn,
          scope: result.scope,
          state: state ?? session.state,
        };
        if (state) persistProjectOAuthTestTokens(state, snapshot);
        clearProjectOAuthPkceSession(session.state);
        const payload = {
          type: PROJECT_OAUTH_MESSAGE_TYPE,
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
          expires_in: result.expiresIn,
          token_type: result.tokenType || 'Bearer',
          ...(result.scope && { scope: result.scope }),
          ...(state && { state }),
        };
        const sent = postToOpener(payload);
        setStatus(sent ? 'sent' : 'complete');
        setMessage(t('complete'));
        if (sent) window.close();
      })
      .catch((e) => {
        if (cancelled) return;
        const errorMessage = e instanceof Error ? e.message : t('exchangeFailed');
        postToOpener({
          type: PROJECT_OAUTH_MESSAGE_TYPE,
          error: 'token_exchange_failed',
          error_description: errorMessage,
          ...(state && { state }),
        });
        setStatus('error');
        setMessage(errorMessage);
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams, t]);

  return (
    <div className="flex min-h-[200px] items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-3 text-center">
        {status === 'reading' && <p className="text-muted-foreground">{t('completing')}</p>}
        {status === 'exchanging' && <p className="text-muted-foreground">{t('exchanging')}</p>}
        {(status === 'sent' || status === 'no_opener' || status === 'complete') && (
          <>
            <p className="text-muted-foreground">{message ?? t('complete')}</p>
            {(status === 'no_opener' || status === 'complete') && (
              <p className="text-sm text-muted-foreground">{t('closeTab')}</p>
            )}
          </>
        )}
        {status === 'error' && <p className="text-destructive">{message}</p>}
      </div>
    </div>
  );
}
