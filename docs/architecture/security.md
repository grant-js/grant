---
title: Security & Session Management
description: Authentication, authorization, and session management architecture
---

# Security & Session Management

Grant implements JWT-based authentication with JWKS (RS256), device-aware session management, email verification gating, rate limiting, and database-level tenant isolation via Row-Level Security.

## Authentication

### Authentication Methods

Users can sign in with multiple methods, each stored independently:

| Method               | Description                                                                        |
| -------------------- | ---------------------------------------------------------------------------------- |
| **Email / Password** | Traditional authentication with email verification and password policy enforcement |
| **GitHub OAuth**     | OAuth 2.0 authorization code flow (login, register, or link to existing account)   |
| **Additional OAuth** | Google, Microsoft, etc. can be added via the adapter pattern                       |

**Primary method rule:** Every user has exactly one primary method. The first method created during registration is automatically primary. Users can change their primary method at any time, but cannot delete the primary or their last remaining method.

**Security constraints:** A provider can only be linked to one user account (no sharing), and a user can only have one method per provider (no duplicates).

### OAuth Flow

1. User initiates OAuth (e.g. "Connect GitHub") and is redirected to the provider
2. User authorizes; provider redirects back with an authorization code
3. Backend exchanges the code for an access token, fetches user info
4. System creates or links the authentication method to the user account

The flow supports three actions: **login** (existing user), **register** (new account), **connect** (add to authenticated account). A `state` parameter validates each flow to prevent request forgery.

### JWT Token Structure

All JWTs include a **`type`** claim (`TokenType`) that identifies how the token was issued. Optional claims depend on `type`.

**Common claims (all token types):**

```typescript
{
  sub: string;    // User ID
  aud: string;    // Audience (platform API URL for sessions; client_id for project-app tokens)
  iss: string;    // Issuer URL (platform or project JWKS issuer)
  exp: number;    // Expiration timestamp
  iat: number;    // Issued at
  jti: string;    // Session ID, API Key ID, or project-app token id
  type: TokenType; // "session" | "apiKey" | "projectApp" — required
}
```

**TokenType and optional claims:**

| type | Description | scope | scopes | isVerified |
| ---- | ----------- | ----- | ------ | ---------- |
| **session** | User login/refresh (system key) | Optional (session audience) | — | Yes (email verification) |
| **apiKey** | API key exchange (project key) | Required (tenant scope) | — | — |
| **projectApp** | Project OAuth app (project key) | Required (tenant scope) | Yes (consented resource:action) | — |

- **scope** — Tenant scope (e.g. accountProjectUser / organizationProjectUser with id). Required for apiKey and projectApp; for session, scope can be taken from the session's audience or from the request.
- **scopes** — Only when type is projectApp. Array of granted scope slugs (resource:action) — intersection of the app's configured scopes and the user's project permissions. Authorization is capped to this list.
- **isVerified** — Only for session tokens (email verification status). Omitted for API key and project-app tokens (treated as verified).
- **aud** / **iss** — For sessions, both are the platform API URL per RFC 7519. For project-app tokens, aud is the ProjectApp client_id and iss is the project JWKS issuer.
- **jti** — Identifies the session, API key, or project-app token, enabling targeted revocation.

## Session Management

### Device-Aware Sessions

Sessions are unique per combination of **user + tenant scope + user agent + IP address**. This means:

- Users can have multiple active sessions (one per device/browser)
- Each session can be individually revoked without affecting others
- Device information is tracked for security visibility

### Session Lifecycle

```bmermaid
sequenceDiagram
    participant Client
    participant API
    participant SessionService
    participant Database

    Client->>API: Login Request (with userAgent, ipAddress)
    API->>SessionService: Check for existing session
    SessionService->>Database: Query sessions (userId + audience + userAgent + ipAddress)

    alt Existing valid session found
        Database-->>SessionService: Return existing session
        SessionService->>Database: Update lastUsedAt
        SessionService-->>API: Return existing tokens
    else No matching session
        SessionService->>Database: Create new session
        Database-->>SessionService: Return new session
        SessionService->>SessionService: Sign JWT (with jti = session.id)
        SessionService-->>API: Return new tokens
    end

    API-->>Client: Access Token + Refresh Token
```

### Session Operations

| Operation      | Behavior                                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Create**     | On login or registration. If a session already matches the device, it is reused and `lastUsedAt` is updated.                                  |
| **Refresh**    | Validates the refresh token, issues new access + refresh tokens, maintains the same session ID (`jti`).                                       |
| **Revoke**     | Individual revocation. Revoking the current session logs the user out immediately.                                                            |
| **Expiration** | Access tokens are short-lived (default 15 min); refresh tokens are long-lived (default 30 days). Expired sessions are filtered automatically. |

## JWKS and Signing Keys

Grant uses **asymmetric JWT signing** (RS256) with keys stored in the database and exposed via **per-issuer JWKS endpoints**. This allows token verification with public keys only, supports key rotation without redeployment, and ensures that compromise of one project's key does not affect other projects or platform sessions.

### Signing Scopes

There are two signing scopes, each with its own issuer (`iss`) and JWKS endpoint:

| Scope                        | Signs                           | Issuer (`iss`)                          | JWKS endpoint                                            |
| ---------------------------- | ------------------------------- | --------------------------------------- | -------------------------------------------------------- |
| **System**                   | Session tokens (login, refresh) | `{APP_URL}`                             | `GET /.well-known/jwks.json`                             |
| **Organization project**     | API key exchange tokens         | `{APP_URL}/org/{orgId}/prj/{projectId}` | `GET /org/{orgId}/prj/{projectId}/.well-known/jwks.json` |
| **Personal account project** | API key exchange tokens         | `{APP_URL}/acc/{accId}/prj/{projectId}` | `GET /acc/{accId}/prj/{projectId}/.well-known/jwks.json` |

Each JWKS endpoint returns **only the keys for that scope** — verifiers can derive the correct JWKS URL from the token's `iss` claim by appending `/.well-known/jwks.json`. This follows the standard OIDC discovery convention and keeps response sizes bounded regardless of how many projects exist.

::: tip External verification
To verify a Grant-issued token from your own service, read the `iss` claim, fetch `{iss}/.well-known/jwks.json`, and match the `kid` header to the returned key. No authentication is required — all JWKS endpoints serve public keys only.
:::

### Key Lifecycle

Keys are stored in the `signing_keys` table. Each scope can have multiple keys (one active, others rotated). The `kid` is globally unique.

- **System keys** are created during seed and support **automatic scheduled rotation** via a background job. The previous key remains in the JWKS response for a retention window (refresh token lifetime + 7 days) so existing tokens continue to verify.
- **Per-project keys** are created **lazily** on first API key token exchange for that project. Rotation is **on demand** via the GraphQL mutation, REST API, or the Signing Keys page in the UI. There is no automatic rotation for project keys.
- **Audit:** Key creation and rotation events are logged in `signing_key_audit_logs` (no key material in logs).

### Verification

The API verifies Bearer tokens **in-process** — it does not call its own JWKS HTTP endpoint. The verification path is: context middleware → `Grant.authenticate` → `TokenManager.verifyToken` → `GrantService.getVerificationKey(kid)` → database (with cache). Public keys are cached by `kid` with a configurable TTL (default 300s). Old `kid` values remain valid for verification until their tokens expire; new `kid` values are cached on first use.

The JWKS HTTP endpoints exist for **external verifiers** (your backend services, API gateways, etc.). Responses include a `Cache-Control: public, max-age=…` header so consumers can cache them.

### Project OAuth

Projects can register **OAuth apps** (ProjectApp) so that project users can sign in with a provider (e.g. GitHub) and receive tokens scoped to that project, without using API keys. This follows the same **global user + scoped authorization** model: the user is resolved globally (find or create by provider/email), then membership is checked against project users, and a JWT is issued with project scope.

#### Flow

| Step | Endpoint | What happens |
| ---- | -------- | ------------ |
| **1. Authorize** | `GET /api/auth/project/authorize` | Tenant app (SPA) redirects the user here with query params **client_id**, **redirect_uri** (must be in the app's allowed list), and optional **state**. The API loads the ProjectApp by client_id, stores state in cache, and redirects the user to the provider (e.g. GitHub). |
| **2. Callback** | `GET /api/auth/project/callback` | Provider redirects back with **code** and **state**. The API decodes state, loads the ProjectApp, exchanges the code for a provider token, resolves the global user (find by provider, link by email, or create), checks project membership, resolves scope (account or organization project user), signs a JWT with the project signing key, and redirects to the app's redirect_uri with the access token in the URL fragment. |

Query parameters for **Authorize:** `client_id`, `redirect_uri`, `state` (optional). For **Callback:** `code`, `state`.

```bmermaid
sequenceDiagram
    participant SPA as Tenant app (SPA)
    participant API as Grant API
    participant Provider as OAuth provider (e.g. GitHub)

    SPA->>API: GET /api/auth/project/authorize?client_id=&redirect_uri=&state=
    API->>API: Load ProjectApp, store state in cache
    API->>Provider: Redirect to provider
    Provider->>API: Redirect with code & state
    API->>API: Exchange code, resolve user, check project membership
    API->>SPA: Redirect to redirect_uri#access_token=...
```

#### Token shape (project OAuth)

Project-app tokens use the same base structure as [JWT Token Structure](#jwt-token-structure). The **type** is **projectApp** when the app has scopes configured; otherwise **apiKey**. Project-app–specific claims:

| Claim | Description |
| ----- | ----------- |
| **sub** | Global user id. |
| **aud** | ProjectApp client_id (only that app should accept the token). |
| **iss** | Project JWKS issuer: `{APP_URL}/acc/{accId}/prj/{projectId}` or `…/org/{orgId}/prj/{projectId}`. |
| **scope** | Tenant scope: accountProjectUser or organizationProjectUser with id `accountId:projectId:userId` or `orgId:projectId:userId`. |
| **type** | **projectApp** when the app has scopes (authorization capped by **scopes**); otherwise **apiKey**. |
| **scopes** | When type is projectApp: consented resource:action list (intersection of app scopes and user's project permissions). |
| **exp**, **iat**, **jti** | Standard expiration, issued-at, and token id. |

#### Security

- **redirect_uri** is validated strictly against the ProjectApp's allowed redirect URIs on both authorize and callback.
- State is stored in cache with a short TTL (e.g. 10 minutes) and deleted after use.
- The provider (e.g. GitHub) must have the platform callback URL(s) registered. See [Configuring the GitHub OAuth app](#configuring-the-github-oauth-app) below.
- **Enabled providers:** Each ProjectApp can restrict which providers are allowed (e.g. GitHub, email). If set, only those are allowed for authorize; if empty or null, all configured providers are allowed. Configure **PROJECT_OAUTH_EMAIL_ENTRY_URL** for the email entry page (default: `{SECURITY_FRONTEND_URL}/auth/project/email`).
- **Email flow:** For provider=email, authorize redirects to the email entry URL; the app posts to `POST /api/auth/project/email/request` with client_id, redirect_uri, state, email; the API sends a magic link; callback validates the one-time token and resolves the user by email.
- **Project-app token type:** When the app has scopes configured (resource:action strings), the issued token has type **projectApp** and a **scopes** claim (intersection of app scopes and user's project permissions). Authorization is capped to those scopes; session and API key tokens are not capped.
- **Extensibility:** Providers are implemented via **IProjectOAuthProvider**; adding a new provider (e.g. Google) requires implementing the interface, registering in the handler, and adding callback handling.

**Related:** ProjectApp is created via GraphQL **createProjectApp** (scope: accountProject or organizationProject). Multi-provider flow (GitHub, email magic link), optional enabled providers per app, and project-app token type with scope capping are described above.

#### Configuring the GitHub OAuth app

GitHub OAuth Apps allow only **one** Authorization callback URL. To support both platform sign-in and Project App sign-in with the same app, register the **base path** for auth; GitHub accepts that URL and any **subpath** ([Redirect URLs](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#redirect-urls)).

| Step | Action |
| ---- | ------ |
| 1 | In [GitHub → Settings → Developer settings → OAuth Apps](https://github.com/settings/developers), create or edit your OAuth App. |
| 2 | Set **Authorization callback URL** to the API base path for auth (see table below), **not** a full callback path. |
| 3 | Ensure **GITHUB_CALLBACK_URL** and **GITHUB_PROJECT_CALLBACK_URL** in your API config use paths under that base. |

**Callback URL to set in GitHub:**

| Environment | Authorization callback URL |
| ----------- | -------------------------- |
| Local | `http://localhost:4000/api/auth` |
| Production | `https://api.yourdomain.com/api/auth` (replace with your API base URL + `/api/auth`) |

Default API config values are `{APP_URL}/api/auth/github/callback` and `{APP_URL}/api/auth/project/callback` — both are subpaths of the base path above.

No separate OAuth app is needed per project-app; one GitHub OAuth app serves both platform and project-app flows.

### Configuration

| Variable                                    | Default      | Description                                  |
| ------------------------------------------- | ------------ | -------------------------------------------- |
| `JWT_ACCESS_TOKEN_EXPIRATION_MINUTES`       | `15`         | Access token lifetime                        |
| `JWT_REFRESH_TOKEN_EXPIRATION_DAYS`         | `30`         | Refresh token lifetime                       |
| `JWT_JWKS_MAX_AGE_SECONDS`                  | `3600`       | Cache-Control max-age for JWKS responses     |
| `JWT_SYSTEM_SIGNING_KEY_CACHE_TTL_SECONDS`  | `300`        | TTL for cached signing and verification keys |
| `JOBS_SYSTEM_SIGNING_KEY_ROTATION_ENABLED`  | `false`      | Enable automatic system key rotation         |
| `JOBS_SYSTEM_SIGNING_KEY_ROTATION_SCHEDULE` | Monthly cron | Rotation schedule                            |

## Password Policy

Grant enforces a comprehensive password policy on both the API and the web client. The policy is defined as a Zod schema in the API and mirrored by a client-side strength indicator in the web app.

**Complexity requirements:**

| Rule              | Value                                                           |
| ----------------- | --------------------------------------------------------------- |
| Minimum length    | 8 characters                                                    |
| Maximum length    | 128 characters                                                  |
| Uppercase letter  | At least one required                                           |
| Lowercase letter  | At least one required                                           |
| Digit             | At least one required                                           |
| Special character | At least one required (`!@#$%^&\*()\_+-=[]{};\|,.<>/?~\`` etc.) |

**Forbidden patterns:**

- No more than 2 consecutive identical characters (e.g. `aaa` is rejected)
- Common weak passwords are blocked outright: `password`, `123456`, `qwerty`, `admin`, `user`, `guest`
- Sequential alphabetic runs are rejected: `abc`, `bcd`, ... `xyz`
- Sequential numeric runs are rejected: `123`, `234`, ... `890`

**Hashing and storage:**

Passwords are hashed with bcrypt before storage. The cost factor is configurable via `TOKEN_BCRYPT_ROUNDS` (default: 10). Plain-text passwords are never stored or logged.

**Account lockout (configured, not yet enforced):**

The configuration layer defines `AUTH_MAX_FAILED_LOGIN_ATTEMPTS` (default: 5) and `AUTH_LOCKOUT_DURATION_MINUTES` (default: 15). These values are read at startup but enforcement logic is not yet wired into the login handler. Until then, rate limiting on the auth endpoints (see [Rate Limiting](#rate-limiting)) is the primary brute-force mitigation.

## Email Verification

Grant enforces email verification for collaborative operations while allowing users to work freely in their personal space. Verification status is embedded in the JWT (`isVerified` claim) so enforcement adds zero database overhead for verified users and API keys.

### Security Model

| Context                         | Mutations                | Read operations |
| ------------------------------- | ------------------------ | --------------- |
| **Personal Account / Projects** | Allowed (unverified)     | Allowed         |
| **Organization Context**        | Blocked (until verified) | Allowed         |
| **Account Settings**            | Blocked (until verified) | Allowed         |

**Rationale:** Personal workspaces are single-user and low-risk. Organization operations affect multiple users and require verified identity. Account settings (profile, password, deletion) require verification to prevent account takeover.

### Guard Configuration

Both REST and GraphQL endpoints use the same guard pattern:

| Operation type           | Personal context | Organization context | Config                            |
| ------------------------ | ---------------- | -------------------- | --------------------------------- |
| Create / Update / Delete | Allow            | Block                | `{ allowPersonalContext: true }`  |
| Member Management        | N/A              | Block                | `{ allowPersonalContext: false }` |
| Settings Updates         | Block            | Block                | `{ allowPersonalContext: false }` |
| Read / Query             | Allow            | Allow                | No guard needed                   |

When a blocked operation is attempted, the API returns `403` with code `EMAIL_VERIFICATION_REQUIRED`.

## Rate Limiting

Rate limiting protects against brute force, abuse, and noisy-neighbor scenarios by capping requests per client IP.

Three layers are available:

| Layer                     | Scope                                                      | Default                                |
| ------------------------- | ---------------------------------------------------------- | -------------------------------------- |
| **Global**                | All requests, keyed by IP                                  | 100 req / 15 min                       |
| **Auth endpoints**        | Login, refresh, token exchange, CLI callback — keyed by IP | 20 req / 15 min                        |
| **Per-tenant** (optional) | Authenticated requests keyed by tenant scope               | 200 req / 15 min (disabled by default) |

The `/health` endpoint is always excluded. Storage uses the same cache backend as the rest of the app (in-memory or Redis).

::: warning
Deploy the API behind a trusted reverse proxy (Nginx, Caddy, cloud LB) so `X-Forwarded-For` reflects real client IPs. Without a trusted proxy, rate limits are keyed by the connecting host and may be ineffective. See [Self-hosting](/deployment/self-hosting) for reverse-proxy setup.
:::

**Response when limit exceeded:** `429 Too Many Requests` with `Retry-After` header:

```json
{
  "success": false,
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Too many requests. Please try again later."
  }
}
```

### Configuration

| Variable                                        | Default       | Description                       |
| ----------------------------------------------- | ------------- | --------------------------------- |
| `SECURITY_ENABLE_RATE_LIMIT`                    | `true` (prod) | Enable global rate limiting       |
| `SECURITY_RATE_LIMIT_MAX`                       | `100`         | Global requests per window        |
| `SECURITY_RATE_LIMIT_WINDOW_MINUTES`            | `15`          | Global window                     |
| `SECURITY_RATE_LIMIT_AUTH_MAX`                  | `20`          | Auth endpoint requests per window |
| `SECURITY_RATE_LIMIT_AUTH_WINDOW_MINUTES`       | `15`          | Auth endpoint window              |
| `SECURITY_RATE_LIMIT_PER_TENANT_ENABLED`        | `false`       | Enable per-tenant limiting        |
| `SECURITY_RATE_LIMIT_PER_TENANT_MAX`            | `200`         | Per-tenant requests per window    |
| `SECURITY_RATE_LIMIT_PER_TENANT_WINDOW_MINUTES` | `15`          | Per-tenant window                 |

## Row-Level Security (RLS)

As a multi-tenant platform, Grant must guarantee that one tenant can never read or modify another tenant's data. Row-Level Security provides a database-level enforcement layer that complements application-level scoping, making it relevant for compliance audits and security reviews.

Grant enforces database-level tenant isolation on all 21 pivot tables (the tables that link core entities to organizations, projects, and accounts) via PostgreSQL Row-Level Security.

### How it works

- **Application-level scope** is the primary enforcement — every authenticated request carries a `Scope` (tenant + id) derived from the auth token, and repositories filter by tenant columns. RLS is **defense in depth**: even if a query misses a `WHERE` clause, the database rejects cross-tenant rows.
- **Restricted role:** A non-login Postgres role `grant_app_restricted` (no `BYPASSRLS`) is used for scoped requests. The table owner (`grant_user`) bypasses RLS by default.
- **Per-request transaction:** For authenticated requests with scope, the context middleware starts a Drizzle transaction, runs `SET LOCAL ROLE grant_app_restricted` and `set_config('app.current_organization_id', ..., true)` (plus project/account as applicable), then creates repositories and services using the transaction. The transaction commits when the response finishes.
- **System bypass:** Background jobs, seeds, and migrations use `grant_user` directly and bypass RLS — they never switch role. Tenant-scoped jobs can use the same transaction + set_config pattern.

### Configuration

| Variable              | Default                | Description                                  |
| --------------------- | ---------------------- | -------------------------------------------- |
| `SECURITY_ENABLE_RLS` | `true`                 | Enable/disable RLS enforcement (kill switch) |
| `SECURITY_RLS_ROLE`   | `grant_app_restricted` | Restricted role name (must match migration)  |

### Policy coverage

RLS policies apply to pivot tables only (organization_users, project_resources, account_projects, etc.). Core/shared tables (users, roles, groups, permissions, resources, tags) do not have RLS — they are accessible only through tenant-scoped pivots, so filtering at the pivot level protects the entire data graph.

## Security Best Practices

1. **HTTPS Only** — Tokens should only be transmitted over HTTPS
2. **HttpOnly Cookies** — Refresh tokens are stored in HttpOnly cookies (not accessible to JavaScript)
3. **Token Rotation** — Refresh tokens are rotated on use
4. **Session Revocation** — Users can revoke suspicious sessions individually
5. **Audit Logging** — All session and authentication operations are logged
6. **OAuth State Validation** — OAuth flows use `state` parameters to prevent request forgery
7. **Primary Method Enforcement** — System ensures exactly one primary authentication method per user

---

**Related:**

- [Multi-Tenancy](./multi-tenancy.md) — Account-based isolation model
- [RBAC](./rbac.md) — Permission and access control
- [Data Model](./data-model.md) — Entity relationships and schema conventions
- [Configuration](/getting-started/configuration) — All environment variables
