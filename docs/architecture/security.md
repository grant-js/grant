---
title: Security & Session Management
description: Authentication, authorization, and session management architecture
---

# Security & Session Management

Grant implements JWT-based authentication with JWKS (RS256), device-aware session management, email verification gating, rate limiting, and database-level tenant isolation via Row-Level Security.

## Authentication

### Authentication Methods

Users can sign in with multiple methods, each stored independently. GitHub and Google are optional: leave their client credentials empty to hide those buttons.

| Method               | Description                                                                          |
| -------------------- | ------------------------------------------------------------------------------------ |
| **Email / Password** | Traditional authentication with email verification and password policy enforcement   |
| **GitHub OAuth**     | OAuth 2.0 authorization code flow (login, register, or link to existing account)     |
| **Google OAuth**     | Same authorization-code flow as GitHub; hidden on login/register when not configured |

Operator setup, auto-link vs connect, passwordless Email bind, and IdP profile-picture inheritance are documented in [Sign-in providers](/core-concepts/sign-in-providers).

**Email is the mailbox, not the password.** `provider = email` is the user’s verified contact address (`providerId`). A password is optional and is **not** part of the Email method: it is a platform credential (`user_credentials`, one row per user, bcrypt hash and `source`), so `providerData` never carries a hash. GitHub/Google signup, link, connect, and later login bind that address as a **passwordless** Email method when the IdP marks it verified — they do not mint a password and do not overwrite an Email method that already exists. If another account already owns that Email address, OAuth still succeeds and the Email bind is skipped. Users can set a password later from Login & Security.

**Primary method rule:** Every user has exactly one primary method. The first method created during registration is automatically primary (OAuth-first signup keeps the social method primary). Users can change their primary method at any time, but cannot delete the primary or their last remaining method.

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
  sub: string; // User ID
  aud: string; // Audience (platform API URL for sessions; client_id for project-app tokens)
  iss: string; // Issuer URL (platform or project JWKS issuer)
  exp: number; // Expiration timestamp
  iat: number; // Issued at
  jti: string; // Session ID, API Key ID, or project-app token id
  type: TokenType; // "session" | "apiKey" | "projectApp" — required
}
```

**TokenType and optional claims:**

| type           | Description                     | scope                       | scopes                          | isVerified               |
| -------------- | ------------------------------- | --------------------------- | ------------------------------- | ------------------------ |
| **session**    | User login/refresh (system key) | Optional (session audience) | —                               | Yes (email verification) |
| **apiKey**     | API key exchange (project key)  | Required (tenant scope)     | —                               | —                        |
| **projectApp** | Project OAuth app (project key) | Required (tenant scope)     | Yes (consented resource:action) | —                        |

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

Authorize and token URLs are **shared** (`/api/auth/project/authorize`, `/api/auth/project/token`). Per-project values are **iss** and **jwks_uri** only. There is no implicit fragment handoff and no dual mode.

| Step             | Endpoint                                 | What happens                                                                                                                                                                                                                                                                                                                                                  |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Authorize** | `GET /api/auth/project/authorize`        | Tenant app or hosted sign-in redirects here with **client_id**, **redirect_uri** (allowlisted), **response_type=code**, S256 **code_challenge**, and optional **state** / **scope**. The API loads the ProjectApp, stores state + PKCE challenge in cache, and redirects to the provider (or email entry).                                                    |
| **2. Callback**  | `GET /api/auth/project/callback`         | Provider redirects back with **code** and **state**. The API exchanges the provider code, resolves the global user, checks project membership, and redirects to hosted **consent** (not the tenant `redirect_uri`).                                                                                                                                           |
| **3. Consent**   | `POST /api/auth/project/consent/approve` | On allow, Grant issues a one-time authorization code (cache, TTL `PROJECT_OAUTH_AUTHORIZATION_CODE_TTL_SECONDS`) and redirects to `redirect_uri?code=&state=`. Deny uses the query string (`error=access_denied`). The access JWT is **not** placed in the URL.                                                                                               |
| **4. Token**     | `POST /api/auth/project/token`           | `grant_type=authorization_code` exchanges **code** + **code_verifier** (+ **client_secret** for confidential apps) for a project-scoped access JWT and a rotating **refresh_token**. `grant_type=refresh_token` rotates the refresh secret and re-checks membership + scopes. Refresh rows live in `project_oauth_grants` (SHA-256 hex), not `user_sessions`. |

Query parameters for **Authorize:** `client_id`, `redirect_uri`, `response_type=code`, `code_challenge`, `code_challenge_method=S256`, `state` (optional), `scope` (optional), `provider`. For **Callback:** provider `code`, `state`. For **Token:** see [Token endpoint](#project-oauth-token-endpoint).

```bmermaid
sequenceDiagram
    participant SPA as Tenant app
    participant API as Grant API
    participant Provider as OAuth provider (e.g. GitHub)

    SPA->>API: GET /api/auth/project/authorize?response_type=code&code_challenge=...
    API->>API: Load ProjectApp, store state and PKCE challenge
    API->>Provider: Redirect to provider
    Provider->>API: Redirect with provider code and state
    API->>API: Resolve user, check membership, show consent
    API->>SPA: Redirect to redirect_uri?code=&state=
    SPA->>API: POST /api/auth/project/token (authorization_code + code_verifier)
    API->>SPA: access_token, refresh_token, expires_in
```

#### Token endpoint {#project-oauth-token-endpoint}

`POST /api/auth/project/token` is the only ProjectApp token mint. It is **not** `POST /api/auth/refresh` and does **not** write platform `user_sessions`.

| `grant_type`         | Required fields                                                                 | Result                                                                                         |
| -------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `authorization_code` | `client_id`, `code`, `code_verifier`, `redirect_uri`, `client_secret` if hashed | One-time code; PKCE S256; new grant row; access JWT + refresh                                  |
| `refresh_token`      | `client_id`, `refresh_token`, `client_secret` if hashed                         | Rotate hash on the same grant; new access JWT; membership and `scopes ∩ app.scopes` recomputed |

Public apps (no `clientSecretHash`) authenticate with PKCE only. Confidential apps must send `client_secret`. The endpoint rejects `client_credentials`, does not issue `id_token`, and does not implement DPoP.

Refresh secrets are stored as SHA-256 hex on `project_oauth_grants`. Access JWT **jti** is the grant id. Reusing a rotated refresh token fails. Grant rows cascade-delete with the user; hashed secrets are not included in GDPR export.

JSON envelope: `{ success, data: { accessToken, tokenType, expiresIn, refreshToken, scope? } }`.

#### Discovery {#project-oauth-discovery}

Each project publishes RFC 8414 authorization-server metadata. The well-known prefix is inserted **before** the issuer path. A twin OpenID configuration URL returns the **same JSON**. Grant is **not** an OpenID Provider (no UserInfo, no `id_token`, no OP features).

| Document | URL                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------- |
| RFC 8414 | `{APP_URL}/.well-known/oauth-authorization-server/org/{orgId}/prj/{projectId}` (or `…/acc/{accId}/prj/{projectId}`) |
| Twin     | `{iss}/.well-known/openid-configuration`                                                                            |

`iss` and `jwks_uri` stay the existing project JWKS issuers (`{APP_URL}/org/{orgId}/prj/{projectId}` or account equivalent; `jwks_uri` = `{iss}/.well-known/jwks.json`). `authorization_endpoint` and `token_endpoint` are the shared Project OAuth URLs above. Metadata advertises `response_types_supported: ["code"]`, `grant_types_supported: ["authorization_code", "refresh_token"]`, and `code_challenge_methods_supported: ["S256"]`.

#### Token shape (project OAuth)

Project-app tokens use the same base structure as [JWT Token Structure](#jwt-token-structure). The **type** is **projectApp** when the app has scopes configured; otherwise **apiKey**. Project-app–specific claims:

| Claim                     | Description                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **sub**                   | Global user id.                                                                                                               |
| **aud**                   | ProjectApp client_id (only that app should accept the token).                                                                 |
| **iss**                   | Project JWKS issuer: `{APP_URL}/acc/{accId}/prj/{projectId}` or `…/org/{orgId}/prj/{projectId}`.                              |
| **scope**                 | Tenant scope: accountProjectUser or organizationProjectUser with id `accountId:projectId:userId` or `orgId:projectId:userId`. |
| **type**                  | **projectApp** when the app has scopes (authorization capped by **scopes**); otherwise **apiKey**.                            |
| **scopes**                | When type is projectApp: consented resource:action list (intersection of app scopes and user's project permissions).          |
| **exp**, **iat**, **jti** | Standard expiration and issued-at. For project OAuth, **jti** is the `project_oauth_grants` row id.                           |

#### Security

- **Branding:** `GET /api/auth/project/app-info` and consent-info are unauthenticated and return **resolved** branding only (`pictureUrl`, `projectName`, `primaryColor`, `showHelpPanel`, `themeMode`). Values resolve app → project → Grant defaults (help panel on, no custom color). `themeMode` is app-only (`light` / `dark` / `system`); null keeps the visitor's Grant theme. Organization logos are not in the fallback. Storage keys are tenant-scoped (`projects/{id}/picture`, `project-apps/{id}/picture`). Product surface: [Project OAuth](/core-concepts/project-oauth).
- **redirect_uri** is validated strictly against the ProjectApp's allowed redirect URIs on authorize, callback, consent, and token exchange.
- Authorize requires S256 PKCE. Authorization codes are one-time cache values (default 60s).
- State is stored in cache with a short TTL (e.g. 10 minutes) and deleted after use.
- Social providers resolve **per-project OAuth connections** (BYO client id + secret) with optional fallback to platform env credentials. See [Configuring social OAuth for project apps](#configuring-social-oauth-for-project-apps).
- `GET /api/auth/project/app-info` returns `configuredProviders` for hosted sign-in; do not use `GET /api/auth/providers` on project pages.
- **Enabled providers:** Each ProjectApp can restrict which providers are allowed (`email`, `github`, `google`, `password`). If set, only those are allowed for authorize; if empty or null, every configured provider **except `password`** is allowed: `password` is opt-in and is on only when the list names it. Configure **PROJECT_OAUTH_EMAIL_ENTRY_URL** for the email entry page (default: `{SECURITY_FRONTEND_URL}/auth/project/email`); the password view is served beside it at `/auth/project/password`.
- **Email flow:** For provider=email, authorize redirects to the email entry URL; the app posts to `POST /api/auth/project/email/request` with client_id, redirect_uri, state, email; the API sends a magic link; callback validates the one-time token and resolves the user by email.
- **Password flow** ([ADR 0011](https://github.com/grant-js/grant/blob/main/decisions/0011-password-as-a-scoped-credential.md) § 5): for provider=password, authorize redirects to the password view; the view posts to `POST /api/auth/project/password` with client_id, redirect_uri, state, email and password. The address is resolved through the Email method, the user must already be a project member, and **only the project's own credential** is checked: the platform password is never accepted, with no fallback, and a password never creates an identity, a membership or a platform session. On success the response is the same consent redirect the magic link gets. An unknown address, a non-member, no project credential, a wrong password and a locked credential all return one generic `401`, after the same bcrypt work, as does an over-long password. Membership and the project credential are checked again when the sign-in completes (after an MFA step too), so a member removed during the challenge cannot be re-added by finishing it.
  - **Lockout:** per `(project, user)`, keyed by the resolved user (not the typed address), from `AUTH_MAX_FAILED_LOGIN_ATTEMPTS` and `AUTH_LOCKOUT_DURATION_MINUTES`. Each attempt is recorded in the database **before** the password is compared, on a connection outside the request's transaction, and cleared on success: a burst of parallel guesses cannot outrun the count, and a failed request cannot roll it back. It never touches platform login or another project; the user can still sign in by magic link or OAuth. The per-IP limiter covers `POST /api/auth/project/password` and `/password/mfa`.
  - **MFA at the sign-in ceremony:** when `AUTH_MIN_AAL_AT_LOGIN=aal2` and the user has an active MFA enrolment (the platform's own `computeRequiresMfaStepUp` rule) the response is `mfa_required`, and `POST /api/auth/project/password/mfa` verifies a TOTP or recovery code (each attempt spends from the same lockout) before the consent redirect. Project-app tokens carry no MFA or `email_verified` state after the mint; Grant enforces neither on them.
- **Password reset ("Forgot password?")** ([ADR 0011](https://github.com/grant-js/grant/blob/main/decisions/0011-password-as-a-scoped-credential.md) § 6): the password view links to `/auth/project/forgot-password`, which posts the address to `POST /api/auth/project/password/forgot`. The link is sent only to an **existing member** of the app's project that has an Email method, and the response is the same `200` for an unknown address, a non-member, an address over its limit and a member who was sent a link (a failure to send is logged, never returned). Completing it (`POST /api/auth/project/password/reset`, opened from the emailed link) runs in **one transaction**: the token is consumed, the project credential is written (`source: reset`, so a later import never overwrites it), the `(project, user)` lockout is cleared, the global Email method is marked `isVerified` (the link proved the mailbox; the platform credential is untouched), and **every project-app grant the user holds in that project is revoked** (grants in other projects and platform sessions are untouched; access tokens already issued live until they expire). No sign-in is performed, so MFA at the ceremony still applies afterwards.
  - **Token:** 256 bits of randomness, stored only as a **SHA-256 digest** scoped to `(project, user)` and looked up by digest (a copy of the table cannot be replayed), compared in constant time, valid for `PROJECT_PASSWORD_RESET_TOKEN_TTL_SECONDS` (default 30 minutes) and **single-use** (the row is locked while it is claimed, so simultaneous completions cannot both succeed). A newer link replaces the previous one. The token travels in the **URL fragment** of the emailed link, which no server, proxy log or `Referer` sees, and opening the link consumes nothing: only the form's submit does, so a mail scanner that follows the link cannot burn it. A password the policy rejects does not use the token up.
  - **Limits:** the shared per-IP limiter covers both routes, and each `(project, member)` may be sent `PROJECT_PASSWORD_RESET_MAX_REQUESTS` links (default 5) per `PROJECT_PASSWORD_RESET_REQUEST_WINDOW_SECONDS` (default one hour), counted by one atomic upsert on the token row; a request over the limit is answered like any other and sends nothing. As with the credential lockout, someone who knows a member's address can spend that budget.
- **Project-app token type:** When the app has scopes configured (resource:action strings), the issued token has type **projectApp** and a **scopes** claim (intersection of app scopes and user's project permissions). Authorization is capped to those scopes; session and API key tokens are not capped.
- **Extensibility:** Providers are implemented via **IProjectOAuthProvider**. GitHub and Google are built in; adding another provider requires implementing the interface, registering in the handler, and adding callback handling.

**Related:** ProjectApp is created via GraphQL **createProjectApp** (scope: accountProject or organizationProject). Multi-provider flow (GitHub, email magic link), optional enabled providers per app, and project-app token type with scope capping are described above.

#### Configuring platform GitHub OAuth

Platform Grant login, register, Settings connect, and CLI OAuth use **env** credentials only (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`).

GitHub OAuth Apps allow only **one** Authorization callback URL. Register the **base path** for auth; GitHub accepts that URL and any **subpath** ([Redirect URLs](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#redirect-urls)).

| Step | Action                                                                                                                           |
| ---- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1    | In [GitHub → Settings → Developer settings → OAuth Apps](https://github.com/settings/developers), create or edit your OAuth App. |
| 2    | Set **Authorization callback URL** to the API base path for auth (see table below), **not** a full callback path.                |
| 3    | Ensure **GITHUB_CALLBACK_URL** defaults to `{APP_URL}/api/auth/github/callback` (a subpath of the base).                         |

**Callback URL to set in GitHub (platform app):**

| Environment | Authorization callback URL                                                           |
| ----------- | ------------------------------------------------------------------------------------ |
| Local       | `http://localhost:4000/api/auth`                                                     |
| Production  | `https://api.yourdomain.com/api/auth` (replace with your API base URL + `/api/auth`) |

#### Configuring platform Google OAuth

Platform Grant login uses **env** credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`). Google requires **exact** Authorized redirect URIs (no prefix match).

| Step | Action                                                                                                                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create or select a project.                                                                                                |
| 2    | Configure the **OAuth consent screen** (Internal or External).                                                                                                                                          |
| 3    | Create an OAuth client ID of type **Web application**.                                                                                                                                                  |
| 4    | Add the platform redirect URI from the table below (exact match).                                                                                                                                       |
| 5    | Copy the client ID and secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (or the platform secret store). Restart the API. Login/register show Google only after the client is fully configured. |

**Redirect URI to set in Google Cloud Console (platform client):**

| Environment | Platform callback                                     |
| ----------- | ----------------------------------------------------- |
| Local       | `http://localhost:4000/api/auth/google/callback`      |
| Production  | `https://api.yourdomain.com/api/auth/google/callback` |

Do **not** add tenant product SPA URLs to this client. For multi-tenant SaaS, project apps should use BYO connections (below).

#### Configuring social OAuth for project apps

Project hosted sign-in uses **per-project OAuth connections** (customer BYO GitHub/Google apps) stored encrypted in `project_oauth_connections`. See [Project OAuth](/core-concepts/project-oauth#social-connections-github-and-google) and [ADR 0008](https://github.com/grant-js/grant/blob/main/decisions/0008-per-project-oauth-connections.md).

| Layer                | What to register               | Where                                                                                                         |
| -------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Customer IdP app** | Grant **broker** callback only | `GITHUB_PROJECT_CALLBACK_URL` / `GOOGLE_PROJECT_CALLBACK_URL` (default `{APP_URL}/api/auth/project/callback`) |
| **ProjectApp**       | Customer product callbacks     | `redirectUris` on the app — validated on authorize and token handoff                                          |
| **Platform env**     | Fallback credentials only      | Used when the project has no BYO row and `PROJECT_OAUTH_REQUIRE_BYO_SOCIAL` is false                          |

**GitHub (customer app):** set Authorization callback URL to `{API}/api/auth` (prefix match) or the exact project callback URI.

**Google (customer app):** add **one** exact Authorized redirect URI: `{APP_URL}/api/auth/project/callback`.

Self-hosted single-tenant deployments may rely on platform env fallback (legacy behavior). Hosted multi-tenant operators should require BYO (`PROJECT_OAUTH_REQUIRE_BYO_SOCIAL=true`) and must not register every customer origin on Grant’s platform Google client.

### Configuration

| Variable                                       | Default      | Description                                             |
| ---------------------------------------------- | ------------ | ------------------------------------------------------- |
| `JWT_ACCESS_TOKEN_EXPIRATION_MINUTES`          | `15`         | Access token lifetime                                   |
| `JWT_REFRESH_TOKEN_EXPIRATION_DAYS`            | `30`         | Platform session refresh lifetime                       |
| `PROJECT_OAUTH_REFRESH_TOKEN_EXPIRATION_DAYS`  | `30`         | ProjectApp grant refresh lifetime (not JWT session TTL) |
| `PROJECT_OAUTH_AUTHORIZATION_CODE_TTL_SECONDS` | `60`         | One-time authorization code cache TTL                   |
| `JWT_JWKS_MAX_AGE_SECONDS`                     | `3600`       | Cache-Control max-age for JWKS responses                |
| `JWT_SYSTEM_SIGNING_KEY_CACHE_TTL_SECONDS`     | `300`        | TTL for cached signing and verification keys            |
| `JOBS_SYSTEM_SIGNING_KEY_ROTATION_ENABLED`     | `false`      | Enable automatic system key rotation                    |
| `JOBS_SYSTEM_SIGNING_KEY_ROTATION_SCHEDULE`    | Monthly cron | Rotation schedule                                       |

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

**Account lockout:**

`AUTH_MAX_FAILED_LOGIN_ATTEMPTS` (default: 5) and `AUTH_LOCKOUT_DURATION_MINUTES` (default: 15) are enforced for the **project-app `password` provider**, per `(project, user)` (see [Project OAuth](#project-oauth)). Platform (console) login does not enforce them yet: rate limiting on the auth endpoints (see [Rate Limiting](#rate-limiting)) is its primary brute-force mitigation.

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

### Email verification only (no MFA in this subsection)

For the email-verification model and guard table, see the previous subsection. **MFA** is documented in [Multi-factor authentication (MFA)](#multi-factor-authentication-mfa) below.

## Multi-factor authentication (MFA)

::: info What MFA does here
Grant adds **TOTP** (authenticator app) MFA. Sessions can carry `mfaVerified=false` until the user proves possession of a factor (**TOTP** or **recovery code**). **AAL** (authentication assurance level) in JWTs comes from claims such as `amr`, `acr`, and `auth_time` / `mfa_auth_time` (`@grantjs/core`). Two knobs interact: **sensitive-route guards** (`requireMfa*`) and **minimum AAL at login** (`AUTH_MIN_AAL_AT_LOGIN`).
:::

### Enrollment, verification, and tokens

| Step                        | Behavior                                                                                                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Enroll**                  | Server generates a TOTP secret; persisted **encrypted at rest** (`AUTH_MFA_SECRET_ENCRYPTION_KEY` required).                                                                             |
| **Verify**                  | `verifyMfa` / `verifyMfaRecoveryCode` (GraphQL or REST) validates the code, sets session MFA state, **re-mints** access + refresh tokens with `mfaVerified=true` and updated AAL claims. |
| **Non-session credentials** | **API keys** and **project-app tokens** skip interactive MFA in guards (non-interactive credentials).                                                                                    |

### Flow: default minimum AAL at login (`aal1`)

When **`AUTH_MIN_AAL_AT_LOGIN=aal1`** (default), most routes are reachable at **AAL1** after login. **Sensitive organization-scoped** operations still hit **MFA guards** when org policy or user enrollment requires a verified MFA step.

```bmermaid diagram-narrow
sequenceDiagram
  participant C as Client
  participant API as API
  C->>API: Login / OAuth
  API-->>C: Session JWT (AAL1)
  C->>API: Sensitive org-scoped mutation
  API->>API: MFA guard
  alt Policy OK or mfaVerified
    API-->>C: 200
  else MFA_REQUIRED
    API-->>C: MFA_REQUIRED
    C->>API: verifyMfa / recovery verify
    API-->>C: New JWT (mfaVerified)
    C->>API: Retry mutation
    API-->>C: 200
  end
```

### Flow: minimum AAL2 at login (`aal2`)

When **`AUTH_MIN_AAL_AT_LOGIN=aal2`** and the user **has MFA enrolled**, the platform expects **AAL2** (MFA-verified session) for **general** access. **GraphQL + REST middleware** (`min-aal-at-login`) blocks sub-AAL2 traffic except for **allowlisted** operations/paths (e.g. `VerifyMfa`, `Me`, `RefreshSession`, MFA recovery). Login may return **`requiresMfaStepUp`**.

```bmermaid diagram-narrow
sequenceDiagram
  participant C as Client
  participant API as API
  Note over C,API: AUTH_MIN_AAL_AT_LOGIN=aal2, MFA enrolled
  C->>API: Login
  API-->>C: AAL1 JWT, requiresMfaStepUp
  C->>API: Request (GraphQL / REST)
  alt Allowlisted op or path
    API-->>C: 200 during step-up
  else Needs AAL2
    API-->>C: MFA_REQUIRED / blocked
    C->>API: verifyMfa / recovery
    API-->>C: AAL2 JWT
    C->>API: Retry request
    API-->>C: 200
  end
```

::: tip Step-up staleness
When **`AUTH_MFA_STEP_UP_MAX_AGE_SECONDS`** is set to a **positive** number, an old AAL2 session can be treated as **AAL1** for policy so users must step up again after the window. **`0`** disables this behavior.
:::

### Composable guards (canonical order)

Email verification and MFA are **separate** guards, composed at call sites:

| Export                                                             | Role                                                                                |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `requireEmailVerificationGraphQL` / `requireEmailVerificationRest` | Email only → `EMAIL_VERIFICATION_REQUIRED`                                          |
| `requireMfaGraphQL` / `requireMfaRest`                             | MFA step-up → `MFA_REQUIRED` when policy requires it and JWT `mfaVerified` is false |
| `requireEmailThenMfaGraphQL` / `requireEmailThenMfaRest`           | **Email → MFA → RBAC → handler**                                                    |

When changing guards, follow [MFA testing](/contributing/testing#mfa-testing): ensure sensitive routes use **`requireEmailThenMfa*`** where intended.

### MFA policy (session requests on org-related scopes)

The MFA guard requires a verified MFA step when **either**:

1. **Organization policy:** `requireMfaForSensitiveActions=true` for the governing org, or
2. **User enrollment:** at least one **active** factor (`isEnabled`, not soft-deleted) — **not** primary-only.

Uses `handlers.me.hasActiveMfaEnrollmentForUser`. Org id resolution: **`organization`** scope uses `scope.id`; **project** scopes derive org id from composite `scope.id` (`mfa-org-requirement`).

::: tip Project-scoped routes
**Organization project** scopes can behave **stricter** than org-only routes with the flag off; do not assume identical policy across tenant types.
:::

### MFA-related environment variables

Values below match **`apps/api`** defaults in **`.env.example`**. See [Authentication assurance](/getting-started/configuration#authentication-assurance-aal) and full [Configuration](/getting-started/configuration) for the rest of the stack.

| Variable                               | Default   | Purpose                                                                                                                         |
| -------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **`AUTH_MIN_AAL_AT_LOGIN`**            | `aal1`    | `aal1`: sensitive routes use MFA guards; **`aal2`**: min AAL2 for most API traffic when MFA enrolled (middleware + allowlists). |
| **`AUTH_MFA_STEP_UP_MAX_AGE_SECONDS`** | `0`       | After `aal2`, treat AAL2 older than this many seconds as needing step-up again; `0` = off.                                      |
| **`AUTH_MFA_SECRET_ENCRYPTION_KEY`**   | _(empty)_ | **Required** to encrypt TOTP secrets at rest. Use a long random value; never commit production values.                          |
| **`AUTH_MFA_TOTP_ISSUER`**             | `Grant`   | Issuer label in `otpauth://` URIs.                                                                                              |
| **`AUTH_MFA_TOTP_PERIOD_SECONDS`**     | `30`      | TOTP time step.                                                                                                                 |
| **`AUTH_MFA_TOTP_WINDOW`**             | `1`       | Allowed drift windows (±) for clock skew.                                                                                       |
| **`AUTH_MFA_VERIFY_MAX_ATTEMPTS`**     | `5`       | Max verification attempts per rolling window (when wired on the verify path).                                                   |
| **`AUTH_MFA_VERIFY_WINDOW_MINUTES`**   | `15`      | Rolling window for verify attempts.                                                                                             |
| **`AUTH_MFA_SESSION_TTL_MINUTES`**     | `1440`    | How long MFA verification stays valid for sensitive actions (minutes; see Config app / `env.config`).                           |

::: warning Secret encryption key
Without **`AUTH_MFA_SECRET_ENCRYPTION_KEY`**, MFA enrollment cannot be persisted securely — the API will fail configuration checks for TOTP setup.
:::

::: details GraphQL `operationName` and min-AAL
Name-based min-AAL enforcement uses the GraphQL **`operationName`**. Clients that omit it may skip that gate in the current implementation — **send `operationName`** in production. Tightening server-side resolution from the document alone is a possible hardening follow-up.
:::

### Rate limiting

MFA **setup**, **verify**, **recovery verify**, recovery **status**, and project OAuth **authorize** / **consent** / **token** share the **auth-sensitive** rate-limit bucket with login/refresh (`AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS`). Discovery well-known URLs use the global IP bucket only. Tune **`SECURITY_RATE_LIMIT_AUTH_MAX`** / **`SECURITY_RATE_LIMIT_AUTH_WINDOW_MINUTES`** with global limits.

### Automated testing and recovery

- [MFA testing](/contributing/testing#mfa-testing) — unit, integration, E2E; optional **`aal2`** job / **`E2E_EXPECT_MIN_AAL_AT_LOGIN`**.
- [MFA recovery codes and self-service disable](/core-concepts/mfa-recovery) — hashes, recovery verify, last-factor disable, org policy vs user choice.

## Rate Limiting

Rate limiting protects against brute force, abuse, and noisy-neighbor scenarios by capping requests per client IP.

Three layers are available:

| Layer                     | Scope                                                                                             | Default                                |
| ------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Global**                | All requests, keyed by IP                                                                         | 100 req / 15 min                       |
| **Auth endpoints**        | Login, refresh, token exchange, CLI callback, project OAuth authorize/consent/token — keyed by IP | 20 req / 15 min                        |
| **Per-tenant** (optional) | Authenticated requests keyed by tenant scope                                                      | 200 req / 15 min (disabled by default) |

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
- **Restricted role:** A non-login Postgres role (`SECURITY_RLS_ROLE`, default `grant_app_restricted`; no `BYPASSRLS`) is used for scoped requests. The session login role bypasses RLS until `SET LOCAL ROLE`; migration `0042` creates this role and grants it object privileges only.
- **Login role membership:** Migration `0042` does **not** grant the restricted role to any login user (deployment names vary). After each migrate, `pnpm --filter @grantjs/database db:grant-rls-role` runs automatically and executes `GRANT <SECURITY_RLS_ROLE> TO <login user>`, where the login user is derived from `DB_URL` or `POSTGRES_USER`. Use `DB_GRANT_ROLE_URL` when the app user cannot run that `GRANT` itself.
- **Per-request transaction:** For authenticated requests with scope, the context middleware starts a Drizzle transaction, runs `SET LOCAL ROLE grant_app_restricted` and `set_config('app.current_organization_id', ..., true)` (plus project/account as applicable), then creates repositories and services using the transaction. The transaction commits when the response finishes.
- **System bypass:** Background jobs, seeds, and migrations use the application DB login role directly and bypass RLS — they never switch role. Tenant-scoped jobs can use the same transaction + set_config pattern.

### Configuration

| Variable              | Default                | Description                                                                                                                                                                                     |
| --------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SECURITY_ENABLE_RLS` | `true`                 | Enable/disable RLS enforcement (kill switch)                                                                                                                                                    |
| `SECURITY_RLS_ROLE`   | `grant_app_restricted` | Restricted role name (must match migration)                                                                                                                                                     |
| `DB_GRANT_ROLE_URL`   | _(empty)_              | Optional Postgres URL used only by `db:grant-rls-role` when the app login role cannot run `GRANT … TO <self>` (set to a superuser URL or leave empty when migrations run as a privileged role). |

### Platform credentials are out of the restricted role's reach

Platform passwords (`user_credentials`, with its lockout and audit tables) are core tables with no RLS, so the restricted role of a scoped request must not be able to read them at all. Migration `0088` revokes every privilege on those three tables from `grant_app_restricted` (the project-scope table `project_user_credentials` keeps its privileges and its tenant policy). The separation therefore holds in the database, not only in code: a project-scoped import cannot name a platform row.

Platform-scope credential operations (login verification, register, change, reset, the data export's credential list) run on the **base connection inside the credential service**, never in the request transaction, and no caller chooses a connection or writes SQL for them. An unscoped transaction (login, register, reset) is joined, so the credential commits or rolls back with the caller's other writes. A scoped request's operation runs in its **own short transaction**: it is not part of the request transaction (it commits even if that transaction later rolls back) and it holds one extra pooled connection while it runs (with `DB_POOL_MAX=2` on Lambda that is the second connection, so nothing inside such an operation may ask the pool for a third).

### Policy coverage

RLS policies apply to pivot tables (organization_users, project_resources, account_projects, etc.) and to project-owned tables that carry a `project_id` column (`project_apps`, `project_oauth_connections`, `project_sync_jobs`, `project_password_resets`, and the project credential siblings). Core/shared tables (users, roles, groups, permissions, resources, tags) do not have RLS — they are accessible only through tenant-scoped pivots or those project-owned rows, so filtering at that layer protects the entire data graph.

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
