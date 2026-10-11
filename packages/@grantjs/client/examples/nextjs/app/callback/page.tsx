'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { useGrant, GrantGate } from '@grantjs/client/react';

import { decodeJwtPayload } from '@/lib/decode-jwt-payload';
import { setOAuthCallbackToken } from '@/lib/oauth-callback-token';
import {
  clearExamplePkceSession,
  exchangeExampleAuthorizationCode,
  getGrantApiBaseUrl,
  loadExamplePkceSession,
} from '@/lib/project-oauth-pkce';

import type { Scope } from '@grantjs/client';

function truncateToken(token: string, len = 16) {
  if (token.length <= len * 2 + 3) return token;
  return `${token.slice(0, len)}…${token.slice(-len)}`;
}

export default function CallbackPage() {
  const [status, setStatus] = useState<'reading' | 'exchanging' | 'ready' | 'error'>('reading');
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenType, setTokenType] = useState('Bearer');
  const [expiresIn, setExpiresIn] = useState(0);
  const [oauthState, setOauthState] = useState<string | null>(null);
  const [decodedPayload, setDecodedPayload] = useState<Record<string, unknown> | null>(null);
  const [decodedScope, setDecodedScope] = useState<Scope | null>(null);
  const [payloadOpen, setPayloadOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const oauthError = params.get('error');
    const errorDescription = params.get('error_description');
    setOauthState(state);

    if (oauthError) {
      setStatus('error');
      setError(errorDescription || oauthError);
      return;
    }
    if (!code || !state) {
      setStatus('error');
      setError('Missing authorization code or state in the query string.');
      return;
    }

    const session = loadExamplePkceSession(state);
    if (!session) {
      setStatus('error');
      setError('Missing PKCE verifier for this state. Start sign-in from this origin again.');
      return;
    }

    let cancelled = false;
    setStatus('exchanging');
    void exchangeExampleAuthorizationCode({
      apiBase: getGrantApiBaseUrl(),
      clientId: session.clientId,
      redirectUri: session.redirectUri,
      code,
      codeVerifier: session.verifier,
    })
      .then((tokens) => {
        if (cancelled) return;
        clearExamplePkceSession(state);
        setOAuthCallbackToken(tokens.accessToken);
        setAccessToken(tokens.accessToken);
        setTokenType(tokens.tokenType);
        setExpiresIn(tokens.expiresIn);
        const payload = decodeJwtPayload(tokens.accessToken);
        if (payload) setDecodedPayload(payload as Record<string, unknown>);
        if (
          payload?.scope &&
          typeof payload.scope === 'object' &&
          'tenant' in payload.scope &&
          'id' in payload.scope
        ) {
          setDecodedScope({
            tenant: payload.scope.tenant as Scope['tenant'],
            id: payload.scope.id,
          });
        }
        setStatus('ready');
      })
      .catch((e) => {
        if (cancelled) return;
        setStatus('error');
        setError(e instanceof Error ? e.message : 'Token exchange failed');
      });

    return () => {
      cancelled = true;
      setOAuthCallbackToken(null);
    };
  }, []);

  const hasToken = Boolean(accessToken && status === 'ready');
  const scope = decodedScope ?? undefined;

  const canQueryDocument = useGrant('Document', 'Query', { scope, enabled: hasToken });
  const canCreateDocument = useGrant('Document', 'Create', { scope, enabled: hasToken });
  const canUpdateDocument = useGrant('Document', 'Update', { scope, enabled: hasToken });
  const canDeleteDocument = useGrant('Document', 'Delete', { scope, enabled: hasToken });

  const permissions = [
    { action: 'Query', granted: canQueryDocument },
    { action: 'Create', granted: canCreateDocument },
    { action: 'Update', granted: canUpdateDocument },
    { action: 'Delete', granted: canDeleteDocument },
  ];

  return (
    <main>
      <header className="page-header">
        <h1 className="page-title">OAuth Callback</h1>
        <p className="page-subtitle">
          Reads <code>?code=</code> (not a fragment), exchanges it with the stored PKCE verifier,
          and shows the access token only.
        </p>
      </header>

      {status === 'reading' || status === 'exchanging' ? (
        <p className="section-desc">
          {status === 'exchanging' ? 'Exchanging authorization code…' : 'Reading query…'}
        </p>
      ) : status === 'error' ? (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Error</span>
            <span className="badge badge-error">Failed</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            {error || 'The OAuth flow returned an error.'}
          </p>
        </div>
      ) : (
        <>
          <section className="section">
            <div className="card">
              <div className="card-header">
                <span className="card-title">Access token</span>
                <span className="badge badge-success">Received</span>
              </div>

              <div className="kv-grid">
                <span className="kv-key">type</span>
                <span className="kv-value">{tokenType}</span>
                <span className="kv-key">expires_in</span>
                <span className="kv-value">{expiresIn ? `${expiresIn}s` : '—'}</span>
                <span className="kv-key">state</span>
                <span className="kv-value">{oauthState || '—'}</span>
                {decodedScope && (
                  <>
                    <span className="kv-key">scope.tenant</span>
                    <span className="kv-value">{decodedScope.tenant}</span>
                    <span className="kv-key">scope.id</span>
                    <span className="kv-value">{decodedScope.id}</span>
                  </>
                )}
                {decodedPayload?.sub ? (
                  <>
                    <span className="kv-key">sub</span>
                    <span className="kv-value">{String(decodedPayload.sub)}</span>
                  </>
                ) : null}
                {decodedPayload?.type ? (
                  <>
                    <span className="kv-key">token type</span>
                    <span className="kv-value">{String(decodedPayload.type)}</span>
                  </>
                ) : null}
              </div>

              {accessToken && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div className="token-preview">{truncateToken(accessToken)}</div>
                </div>
              )}

              {decodedPayload && (
                <div style={{ marginTop: '0.75rem' }}>
                  <button className="collapsible-toggle" onClick={() => setPayloadOpen((p) => !p)}>
                    <span className={`collapsible-chevron${payloadOpen ? ' open' : ''}`}>›</span>
                    JWT payload
                  </button>
                  {payloadOpen && (
                    <div className="collapsible-body">
                      {JSON.stringify(decodedPayload, null, 2)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {hasToken && (
            <>
              <div className="divider">Permission checks</div>
              <section className="section" style={{ marginTop: 0 }}>
                <h2 className="section-title">useGrant</h2>
                <p className="section-desc">
                  Checking <code>Document</code> permissions using the scope from the JWT.
                </p>
                <div className="perm-grid">
                  {permissions.map(({ action, granted }) => (
                    <div key={action} className={`perm-item ${granted ? 'granted' : 'denied'}`}>
                      <span className="perm-label">Document:{action}</span>
                      <span className={`badge ${granted ? 'badge-success' : 'badge-error'}`}>
                        {granted ? 'granted' : 'denied'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="section">
                <h2 className="section-title">GrantGate</h2>
                <p className="section-desc">
                  Content gated by <code>Document:Update</code>. If denied, the fallback renders
                  instead.
                </p>
                <GrantGate
                  resource="Document"
                  action="Update"
                  scope={scope}
                  fallback={
                    <div className="gate-card denied">
                      ✗ You do not have <strong>Document:Update</strong> — this is the fallback.
                    </div>
                  }
                >
                  <div className="gate-card granted">
                    ✓ You have <strong>Document:Update</strong> — this gated content is visible.
                  </div>
                </GrantGate>
              </section>
            </>
          )}
        </>
      )}

      <Link href="/" className="back-link">
        ← Back to example
      </Link>
    </main>
  );
}
