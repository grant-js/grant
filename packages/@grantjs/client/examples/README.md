# @grantjs/client examples

Minimal apps showing how to integrate the Grant client SDK in a frontend. Each example uses `@grantjs/client` (and `@grantjs/client/react`) to perform permission checks against a Grant API.

## Prerequisites

- **Grant API**: A running Grant API (e.g. the main platform API or the `@grantjs/server` example). Set `NEXT_PUBLIC_GRANT_API_URL` in `.env`.
- **Auth**: Implement `getAccessToken` in your Grant config to return the access token from your secure auth store (e.g. server session, httpOnly cookie). Do not store tokens in env or localStorage.

## Running an example

Use **pnpm** (npm does not support `workspace:*` in this repo). From the **monorepo root**:

```bash
# Install all dependencies and build the client package
pnpm install
pnpm --filter @grantjs/client build

# Run the Next.js example (uses port 3004 to avoid conflicting with main app on 3000 and server example on 3003)
cd packages/@grantjs/client/examples/nextjs
cp .env.example .env
# Edit .env: set NEXT_PUBLIC_GRANT_API_URL, NEXT_PUBLIC_GRANT_FRONTEND_URL, and optionally NEXT_PUBLIC_EXAMPLE_APP_ORIGIN (default http://localhost:3004).
pnpm dev
```

Then open the example app at the origin you set in `NEXT_PUBLIC_EXAMPLE_APP_ORIGIN` (default `http://localhost:3004`; the app is served under base path `/example`). Implement `getAccessToken` in the example's Grant config to return the token from your secure auth store so permission checks work.

### Project OAuth (authorization-code + PKCE)

Add your app's callback URL (`${NEXT_PUBLIC_EXAMPLE_APP_ORIGIN}/example/callback`, e.g. `http://localhost:3004/example/callback`) to the project app's **allowed redirect URIs**. The example:

1. Generates an S256 PKCE pair and stores the **verifier** in sessionStorage keyed by `state`
2. Calls `signInWithProjectApp` with `codeChallenge` so hosted sign-in forwards it to authorize
3. On `/example/callback`, reads `?code=` (not `#access_token=`), POSTs `grant_type=authorization_code` to `{NEXT_PUBLIC_GRANT_API_URL}/api/auth/project/token` with `code`, `code_verifier`, `client_id`, and `redirect_uri`
4. Shows the access token only (refresh token stays off the page)

Set `NEXT_PUBLIC_GRANT_API_URL` (default `http://localhost:4000`) and `NEXT_PUBLIC_GRANT_FRONTEND_URL` (default `http://localhost:3000`). Then establish a secure session in production (e.g. httpOnly cookie). Public ProjectApps use PKCE only; confidential apps must send `client_secret` from a backend.

## Examples

| Folder   | Framework | Description                                                      |
| -------- | --------- | ---------------------------------------------------------------- |
| `nextjs` | Next.js   | App Router app with `GrantProvider`, `useGrant`, and `GrantGate` |

## Ports

Examples use distinct ports so they can run alongside the main platform and other examples:

- Main web app: `3000`
- Server Next.js example: `3003`
- **Client Next.js example: `3004`** (set in `nextjs/.env.development`)
