'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function CallbackPage() {
  const [parsed, setParsed] = useState<{
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setParsed({
      code: params.get('code') ?? undefined,
      state: params.get('state') ?? undefined,
      error: params.get('error') ?? undefined,
      error_description: params.get('error_description') ?? undefined,
    });
  }, []);

  const hasCode = Boolean(parsed?.code && !parsed?.error);

  return (
    <main>
      <header className="page-header">
        <h1 className="page-title">OAuth Callback</h1>
        <p className="page-subtitle">
          Authorization code from Project OAuth. Exchange it at{' '}
          <code>POST /api/auth/project/token</code> with your PKCE verifier (and{' '}
          <code>client_secret</code> if the app is confidential). Do not expect an access token in
          the URL fragment.
        </p>
      </header>

      {parsed === null ? (
        <p className="section-desc">Reading query…</p>
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
        <section className="section">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Authorization code</span>
              <span className={`badge ${hasCode ? 'badge-success' : 'badge-error'}`}>
                {hasCode ? 'Received' : 'Missing'}
              </span>
            </div>

            <div className="kv-grid">
              <span className="kv-key">code</span>
              <span className="kv-value">{parsed.code || '—'}</span>
              <span className="kv-key">state</span>
              <span className="kv-value">{parsed.state || '—'}</span>
            </div>
          </div>
        </section>
      )}

      <Link href="/" className="back-link">
        ← Back to example
      </Link>
    </main>
  );
}
