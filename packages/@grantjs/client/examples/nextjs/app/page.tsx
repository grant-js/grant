'use client';

import { useEffect, useState } from 'react';

import { useGrantClient } from '@grantjs/client/react';

import { useOrigin } from '@/lib/use-origin';

export default function Home() {
  const grant = useGrantClient();
  const origin = useOrigin();
  const defaultRedirectUri = origin ? `${origin}/example/callback` : '';

  const [clientId, setClientId] = useState('');
  const [redirectUri, setRedirectUri] = useState(defaultRedirectUri);

  // Sync redirect URI when origin becomes available (after mount)
  useEffect(() => {
    if (origin) {
      setRedirectUri(`${origin}/example/callback`);
    }
  }, [origin]);
  const [scopes, setScopes] = useState('');
  const [appState, setAppState] = useState('');
  const [signInError, setSignInError] = useState<string | null>(null);

  const handleSignIn = () => {
    if (!clientId.trim()) {
      setSignInError('client_id is required');
      return;
    }
    if (!redirectUri.trim()) {
      setSignInError('redirect_uri is required');
      return;
    }
    setSignInError(null);
    grant.signInWithProjectApp({
      clientId: clientId.trim(),
      redirectUri: redirectUri.trim(),
      scope: scopes.trim() || undefined,
      state: appState.trim() || undefined,
    });
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
          Start the Project OAuth redirect flow. After authentication, Grant redirects back to the
          callback page with an authorization code in the query (`?code=&state=`).
        </p>

        <div className="tip">
          <strong>Tip:</strong> Add your <code>redirect_uri</code> to the project app&apos;s allowed
          redirect URIs in the Grant dashboard or via the API.
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
          <button type="button" onClick={handleSignIn} className="btn-primary">
            Sign in →
          </button>
          {signInError && <p className="form-error">{signInError}</p>}
        </div>

        <p className="section-desc" style={{ marginTop: '1rem', marginBottom: 0 }}>
          After the flow completes, the <strong>callback page</strong> shows the token details and
          runs permission checks with <code>useGrant</code> and <code>GrantGate</code>.
        </p>
      </section>

      <p className="setup-note">
        API and frontend use relative paths (same-origin). Redirect URI defaults to current origin +{' '}
        <code>/example/callback</code>. Add this URL to your project app&apos;s allowed redirect
        URIs. Implement <code>getAccessToken</code> in your Grant config to return the token from
        your secure auth store (e.g. server session, httpOnly cookie).
      </p>
    </main>
  );
}
