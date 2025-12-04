# GitHub OAuth Flow - Sequence Diagram

## Overview

This document illustrates the complete GitHub OAuth authentication flow using a sequence diagram.

## Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant OAuthController
    participant OAuthHandler
    participant GitHubOAuthService
    participant OAuthStateService
    participant GitHub
    participant UserAuthMethodService
    participant AccountHandler
    participant Database

    Note over User,Database: Phase 1: Initiate OAuth Flow

    User->>Frontend: Click "Sign in with GitHub"
    Frontend->>OAuthController: GET /api/auth/github?redirect=/dashboard
    OAuthController->>OAuthHandler: initiateGithubAuth(redirectUrl)

    OAuthHandler->>GitHubOAuthService: generateState(redirectUrl)
    GitHubOAuthService-->>OAuthHandler: OAuthState { state, redirectUrl, createdAt }

    OAuthHandler->>OAuthStateService: storeState(state)
    OAuthStateService-->>OAuthHandler: void

    OAuthHandler->>GitHubOAuthService: getAuthorizationUrl(state.state, redirectUrl)
    GitHubOAuthService-->>OAuthHandler: authorizationUrl

    OAuthHandler-->>OAuthController: { authorizationUrl }
    OAuthController->>Frontend: HTTP 302 Redirect to GitHub
    Frontend->>GitHub: Redirect to GitHub Authorization Page

    Note over User,Database: Phase 2: User Authorization on GitHub

    User->>GitHub: Review permissions & authorize
    GitHub->>OAuthController: GET /api/auth/github/callback?code=ABC123&state=XYZ789

    Note over User,Database: Phase 3: Process OAuth Callback

    OAuthController->>OAuthHandler: handleGithubCallback(code, stateToken, origin, locale, userAgent, ipAddress)

    OAuthHandler->>OAuthStateService: validateState(stateToken)
    OAuthStateService-->>OAuthHandler: true/false

    alt State Invalid
        OAuthStateService-->>OAuthHandler: false
        OAuthHandler-->>OAuthController: AuthenticationError
        OAuthController->>Frontend: Redirect to /auth/login?error=...
    else State Valid
        OAuthHandler->>OAuthStateService: getState(stateToken)
        OAuthStateService-->>OAuthHandler: OAuthState { state, redirectUrl, createdAt }

        OAuthHandler->>OAuthStateService: deleteState(stateToken)
        OAuthStateService-->>OAuthHandler: void

        OAuthHandler->>Database: Begin Transaction

        OAuthHandler->>GitHubOAuthService: exchangeCodeForToken(code)
        GitHubOAuthService->>GitHub: POST /login/oauth/access_token
        GitHub-->>GitHubOAuthService: { access_token: "gho_..." }
        GitHubOAuthService-->>OAuthHandler: accessToken

        OAuthHandler->>GitHubOAuthService: getUserInfo(accessToken)
        GitHubOAuthService->>GitHub: GET /user
        GitHub-->>GitHubOAuthService: { id, login, email, name, avatar_url, ... }
        GitHubOAuthService->>GitHub: GET /user/emails
        GitHub-->>GitHubOAuthService: [{ email, primary, verified }]
        GitHubOAuthService-->>OAuthHandler: GitHubUserInfo

        OAuthHandler->>UserAuthMethodService: getUserAuthenticationMethodByProvider('github', providerId)
        UserAuthMethodService->>Database: Query user_authentication_methods
        Database-->>UserAuthMethodService: UserAuthenticationMethod | null
        UserAuthMethodService-->>OAuthHandler: existingAuthMethod | null

        alt User Exists (Login Flow)
            OAuthHandler->>AccountHandler: login({ provider: 'github', providerId, providerData })
            AccountHandler->>UserAuthMethodService: processProvider('github', providerId, providerData)
            UserAuthMethodService-->>AccountHandler: { providerData, isVerified }
            AccountHandler->>Database: Query user_authentication_methods
            Database-->>AccountHandler: UserAuthenticationMethod
            AccountHandler->>Database: Query users & accounts
            Database-->>AccountHandler: User with accounts
            AccountHandler->>Database: Create/Update user_session
            Database-->>AccountHandler: UserSession
            AccountHandler-->>OAuthHandler: LoginResponse { accessToken, refreshToken, accounts }

        else New User (Register Flow)
            OAuthHandler->>AccountHandler: createAccount({ name, type: Personal, provider: 'github', providerId, providerData })
            AccountHandler->>UserAuthMethodService: processProvider('github', providerId, providerData)
            UserAuthMethodService-->>AccountHandler: { providerData, isVerified: true }
            AccountHandler->>Database: Create user
            Database-->>AccountHandler: User
            AccountHandler->>Database: Create user_authentication_method
            Database-->>AccountHandler: UserAuthenticationMethod
            AccountHandler->>Database: Create account
            Database-->>AccountHandler: Account
            AccountHandler->>Database: Create user_session
            Database-->>AccountHandler: UserSession
            AccountHandler-->>OAuthHandler: CreateAccountResult { account, accessToken, refreshToken }
        end

        OAuthHandler->>Database: Commit Transaction
        OAuthHandler-->>OAuthController: { redirectUrl, tokens: { accessToken, refreshToken } }

        OAuthController->>Frontend: HTTP 302 Redirect to /auth/github/callback?tokens=...&redirect=...
        Frontend->>User: Store tokens & redirect to dashboard
    end
```

## Flow Phases

### Phase 1: Initiate OAuth Flow

1. User clicks "Sign in with GitHub" button
2. Frontend redirects to backend OAuth initiation endpoint
3. Backend generates CSRF state token
4. Backend stores state token in memory
5. Backend redirects user to GitHub authorization page

### Phase 2: User Authorization

1. User reviews permissions on GitHub
2. User authorizes the application
3. GitHub redirects back to callback URL with authorization code and state

### Phase 3: Process OAuth Callback

1. Backend validates state token (CSRF protection)
2. Backend exchanges authorization code for access token
3. Backend fetches user information from GitHub API
4. Backend checks if user already exists
5. **If user exists**: Login flow - create session
6. **If new user**: Register flow - create user, account, and session
7. Backend redirects to frontend with tokens
8. Frontend stores tokens and redirects user to dashboard

## Key Components

- **OAuthController**: Handles HTTP requests/responses and redirects
- **OAuthHandler**: Orchestrates the OAuth flow with transactions
- **GitHubOAuthService**: Communicates with GitHub API (token exchange, user info)
- **OAuthStateService**: Manages CSRF state tokens
- **AccountHandler**: Handles login/register logic
- **UserAuthenticationMethodService**: Manages authentication methods

## Security Features

- **CSRF Protection**: State token validation prevents CSRF attacks
- **One-time State**: State tokens are deleted after use
- **State Expiration**: States expire after 10 minutes
- **Transaction Safety**: All database operations are wrapped in transactions
