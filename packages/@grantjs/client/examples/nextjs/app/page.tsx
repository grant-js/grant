'use client';

import { useEffect, useState } from 'react';

import { useGrantClient } from '@grantjs/client/react';

import {
  createExampleOAuthState,
  generateExamplePkcePair,
  persistExamplePkceSession,
} from '@/lib/project-oauth-pkce';
import { useOrigin } from '@/lib/use-origin';

export default function Home() {
  const grant = useGrantClient();
  const origin = useOrigin();
  const defaultRedirectUri = origin ? `${origin}/example/callback` : '';

  const [clientId, setClientId] = useState('');
  const [redirectUri, setRedirectUri] = useState(defaultRedirectUri);

  useEffect(() => {
    if (origin) {
      setRedirectUri(`${origin}/example/callback`);
    }
  }, [origin]);
  const [scopes, setScopes] = useState('');
  const [appState, setAppState] = useState('');
  const [signInError, setSignInError] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!clientId.trim()) {
      setSignInError('client_id is required');
      return;
    }
    if (!redirectUri.trim()) {
      setSignInError('redirect_uri is required');
      return;
    }
    setSignInError(null);
    try {
      const state = appState.trim() || createExampleOAuthState();
      const pkce = await generateExamplePkcePair();
      persistExamplePkceSession(state, {
        verifier: pkce.verifier,
        clientId: clientId.trim(),
        redirectUri: redirectUri.trim(),
      });
      await grant.signInWithProjectApp({
        clientId: clientId.trim(),
        redirectUri: redirectUri.trim(),
        scope: scopes.trim() || undefined,
        state,
        codeChallenge: pkce.challenge,
        codeChallengeMethod: 'S256',
      });
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : 'Failed to start Project OAuth');
    }
  };

  return (
    <main>
      <header className="page-header">
        <h1 className="page-title">Grant Client Example</h1>
        <p className="page-subtitle">
          Next.js app using <code>@grantjs/client</code> for Project OAuth, permission checks, and
          gated rendering.
        </p>
      </header>

      <section className="section">
        <h2 className="section-title">Sign in with Project App</h2>
        <p className="section-desc">
          Starts authorization-code + S256 PKCE. The verifier stays in this origin&apos;s
          sessionStorage. After consent, Grant redirects here with <code>?code=&state=</code> (not a
          fragment token). The callback exchanges the code at{' '}
          <code>POST /api/auth/project/token</code>.
        </p>

        <div className="tip">
          <strong>Tip:</strong> Add your <code>redirect_uri</code> to the project app&apos;s allowed
          redirect URIs in the Grant dashboard or via the API. Use a public ProjectApp (PKCE only)
          or send <code>client_secret</code> from a backend.
        </div>

        <div className="card">
          <label className="label">
            Client ID
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="your-project-app-client-id"
              className="input"
            />
          </label>
          <label className="label">
            Redirect URI
            <input
              type="text"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              placeholder={defaultRedirectUri}
              className="input"
            />
          </label>
          <label className="label">
            Scope <span className="badge badge-muted">optional</span>
            <input
              type="text"
              value={scopes}
              onChange={(e) => setScopes(e.target.value)}
              placeholder="document:read document:create"
              className="input"
            />
          </label>
          <label className="label">
            State <span className="badge badge-muted">optional</span>
            <input
              type="text"
              value={appState}
              onChange={(e) => setAppState(e.target.value)}
              placeholder="app-round-trip-value"
              className="input"
            />
          </label>
          <button type="button" onClick={() => void handleSignIn()} className="btn-primary">
            Sign in →
          </button>
          {signInError && <p className="form-error">{signInError}</p>}
        </div>

        <p className="section-desc" style={{ marginTop: '1rem', marginBottom: 0 }}>
          After the flow completes, the <strong>callback page</strong> exchanges the code, shows the
          access token, and runs permission checks with <code>useGrant</code> and{' '}
          <code>GrantGate</code>. The refresh token is not painted.
        </p>
      </section>

      <p className="setup-note">
        Set <code>NEXT_PUBLIC_GRANT_API_URL</code> (default <code>http://localhost:4000</code>) and{' '}
        <code>NEXT_PUBLIC_GRANT_FRONTEND_URL</code> (default <code>http://localhost:3000</code>).
        Redirect URI defaults to current origin + <code>/example/callback</code>. Implement{' '}
        <code>getAccessToken</code> in production from a secure store (e.g. httpOnly cookie), not
        sessionStorage.
      </p>
    </main>
  );
}
