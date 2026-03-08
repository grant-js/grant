'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { useGrant, GrantGate } from '@grantjs/client/react';

import { decodeJwtPayload } from '@/lib/decode-jwt-payload';
import { setOAuthCallbackToken } from '@/lib/oauth-callback-token';

import type { Scope } from '@grantjs/client';

function truncateToken(token: string, len = 16) {
  if (token.length <= len * 2 + 3) return token;
  return `${token.slice(0, len)}…${token.slice(-len)}`;
}

export default function CallbackPage() {
  const [parsed, setParsed] = useState<{
    access_token?: string;
    expires_in?: string;
    token_type?: string;
    state?: string;
    error?: string;
    error_description?: string;
  } | null>(null);

  const [decodedPayload, setDecodedPayload] = useState<Record<string, unknown> | null>(null);
  const [decodedScope, setDecodedScope] = useState<Scope | null>(null);
  const [payloadOpen, setPayloadOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash?.slice(1) || '';
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const error = params.get('error');

    setParsed({
      access_token: accessToken ?? undefined,
      expires_in: params.get('expires_in') ?? undefined,
      token_type: params.get('token_type') ?? undefined,
      state: params.get('state') ?? undefined,
      error: error ?? undefined,
      error_description: params.get('error_description') ?? undefined,
    });

    if (accessToken && !error) {
      setOAuthCallbackToken(accessToken);
      const payload = decodeJwtPayload(accessToken);
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
    }

    return () => {
      setOAuthCallbackToken(null);
    };
  }, []);

  const hasToken = Boolean(parsed?.access_token && !parsed?.error);
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
        <p className="page-subtitle">Token received from the Project OAuth redirect flow.</p>
      </header>

      {parsed === null ? (
        <p className="section-desc">Reading fragment…</p>
      ) : parsed.error ? (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Error</span>
            <span className="badge badge-error">{parsed.error}</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            {parsed.error_description || 'The OAuth flow returned an error.'}
          </p>
        </div>
      ) : (
        <>
          {/* ── Token summary ────────────────────────────── */}
          <section className="section">
            <div className="card">
              <div className="card-header">
                <span className="card-title">Token</span>
                <span className="badge badge-success">Received</span>
              </div>

              <div className="kv-grid">
                <span className="kv-key">type</span>
                <span className="kv-value">{parsed.token_type ?? '—'}</span>

                <span className="kv-key">expires_in</span>
                <span className="kv-value">
                  {parsed.expires_in ? `${parsed.expires_in}s` : '—'}
                </span>

                <span className="kv-key">state</span>
                <span className="kv-value">{parsed.state || '—'}</span>

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

              {parsed.access_token && (
                <>
                  <div style={{ marginTop: '0.75rem' }}>
                    <div className="token-preview">{truncateToken(parsed.access_token)}</div>
                  </div>
                </>
              )}

              {/* JWT payload collapsible */}
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

          {/* ── Permission checks ────────────────────────── */}
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
