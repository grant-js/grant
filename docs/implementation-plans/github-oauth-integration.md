# GitHub OAuth Integration - Implementation Plan

## Overview

This document outlines the implementation plan for integrating GitHub OAuth authentication into the Grant Platform. This will allow users to sign in and register using their GitHub accounts, providing a seamless authentication experience alongside the existing email/password method.

## Current State Analysis

### Existing Infrastructure ✅

- **Database Schema**: `user_authentication_methods` table supports multiple providers (`email`, `google`, `github`)
- **GraphQL Schema**: `UserAuthenticationMethodProvider` enum includes `github` value
- **Service Layer**: `UserAuthenticationMethodService` has placeholder `processGithubProvider()` method
- **Frontend**: Login and register pages exist with email/password forms
- **Authentication Flow**: Login/register handlers support provider-based authentication

### What Needs Implementation

1. **GitHub OAuth App Setup** - Create OAuth application in GitHub
2. **Backend OAuth Flow** - Implement OAuth callback handling and token exchange
3. **Frontend OAuth Buttons** - Add GitHub login/register buttons to auth pages
4. **User Linking** - Handle account creation and linking for GitHub users
5. **Configuration** - Environment variables for GitHub OAuth credentials

## GitHub OAuth App Setup

### Step 1: Create GitHub OAuth App

1. **Navigate to GitHub Settings**:
   - Go to https://github.com/settings/developers
   - Click "New OAuth App" (or "OAuth Apps" → "New OAuth App")

2. **Fill in Application Details**:
   - **Application name**: `Grant Platform` (or your app name)
   - **Homepage URL**:
     - Development: `http://localhost:3000`
     - Production: `https://yourdomain.com`
   - **Authorization callback URL**:
     - Development: `http://localhost:4000/api/auth/github/callback`
     - Production: `https://api.yourdomain.com/api/auth/github/callback`
   - **Application description** (optional): "Grant Platform authentication"

3. **Register Application**:
   - Click "Register application"
   - GitHub will generate a **Client ID** and **Client Secret**

### Step 2: Required GitHub Credentials

After creating the OAuth app, you'll need to provide:

- **Client ID** (`GITHUB_CLIENT_ID`): Public identifier for your app
- **Client Secret** (`GITHUB_CLIENT_SECRET`): Secret key (keep secure, never expose to frontend)

### Step 3: GitHub OAuth Scopes

For basic authentication, request these scopes:

- `user:email` - Access user's email addresses
- `read:user` - Read user profile information

Optional scopes (if needed later):

- `user:follow` - Follow/unfollow users
- `repo` - Access repositories (if integrating with GitHub repos)

## Implementation Plan

### Phase 1: Backend Configuration

#### 1.1 Environment Variables

Add to `apps/api/.env.example` and `apps/api/src/config/env.config.ts`:

```bash
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_CALLBACK_URL=http://localhost:4000/api/auth/github/callback
```

**Configuration Implementation**:

- Add to `env.config.ts` with validation
- Ensure `GITHUB_CLIENT_SECRET` is required in production
- Add to `.env.example` with placeholder values

#### 1.2 Install OAuth Dependencies

```bash
cd apps/api
pnpm add @octokit/rest
pnpm add -D @types/node
```

**Why @octokit/rest?**

- Official GitHub SDK
- Handles OAuth token exchange
- Type-safe API client
- Well-maintained and documented

### Phase 2: Backend OAuth Flow Implementation

#### 2.1 OAuth Routes

Create `apps/api/src/rest/routes/oauth.routes.ts`:

**Routes to implement**:

- `GET /api/auth/github` - Initiate OAuth flow (redirect to GitHub)
- `GET /api/auth/github/callback` - Handle OAuth callback
- `POST /api/auth/github/callback` - Alternative callback (if needed)

**Flow**:

1. User clicks "Sign in with GitHub"
2. Frontend redirects to `/api/auth/github`
3. Backend redirects to GitHub authorization URL
4. User authorizes on GitHub
5. GitHub redirects to `/api/auth/github/callback?code=...`
6. Backend exchanges code for access token
7. Backend fetches user info from GitHub API
8. Backend creates/updates user authentication method
9. Backend creates session and redirects to frontend with tokens

#### 2.2 OAuth Service

Create `apps/api/src/services/github-oauth.service.ts`:

**Methods**:

- `getAuthorizationUrl(state?: string): string` - Generate GitHub OAuth URL
- `exchangeCodeForToken(code: string): Promise<string>` - Exchange authorization code for access token
- `getUserInfo(accessToken: string): Promise<GitHubUserInfo>` - Fetch user profile from GitHub
- `validateToken(accessToken: string): Promise<boolean>` - Validate access token

**GitHub User Info Structure**:

```typescript
interface GitHubUserInfo {
  id: number; // GitHub user ID
  login: string; // GitHub username
  email: string | null; // Email (may be null if private)
  name: string | null; // Display name
  avatar_url: string; // Profile picture URL
  bio: string | null; // User bio
  company: string | null;
  location: string | null;
}
```

#### 2.3 Update UserAuthenticationMethodService

Update `apps/api/src/services/user-authentication-methods.service.ts`:

**Implement `processGithubProvider()` method**:

```typescript
private processGithubProvider(
  providerId: string,
  providerData: Record<string, unknown>,
  context: string
): ProcessedProvider {
  // Validate providerData contains accessToken
  const { accessToken, githubId, email, name, avatarUrl } = providerData;

  if (!accessToken || typeof accessToken !== 'string') {
    throw new ValidationError(
      'GitHub access token is required',
      [],
      'errors:auth.githubTokenRequired'
    );
  }

  // Store GitHub-specific data
  return {
    providerData: {
      accessToken,      // Store for future API calls
      githubId,         // GitHub user ID
      email,            // Email from GitHub
      name,             // Display name
      avatarUrl,        // Profile picture
      verifiedAt: new Date().toISOString(), // GitHub emails are verified
    },
    isVerified: true,   // GitHub accounts are pre-verified
  };
}
```

**Key Points**:

- GitHub accounts are considered verified (no email verification needed)
- Store access token for potential future GitHub API integration
- Store GitHub user ID as `providerId` (use GitHub ID, not username)

#### 2.4 OAuth Controller

Create `apps/api/src/rest/controllers/oauth.controller.ts`:

**Methods**:

- `initiateGithubAuth(req, res)` - Redirect to GitHub OAuth
- `handleGithubCallback(req, res)` - Process callback and create session

**Callback Handler Logic**:

1. Extract `code` and `state` from query parameters
2. Validate `state` (CSRF protection)
3. Exchange code for access token
4. Fetch user info from GitHub
5. Check if user authentication method exists
6. If exists: Login flow
   - Update lastUsedAt
   - Create session
   - Return tokens
7. If not exists: Register flow
   - Create user account
   - Create authentication method
   - Create session
   - Return tokens
8. Redirect to frontend with tokens in URL hash or set cookies

#### 2.5 State Management (CSRF Protection)

Implement state parameter generation and validation:

```typescript
// Generate state token
const state = generateSecureToken(10); // 10 minute validity
// Store in session/Redis with user identifier

// Validate on callback
if (!validateState(state)) {
  throw new AuthenticationError('Invalid state parameter', 'errors:auth.invalidState');
}
```

**Storage Options**:

- **Session-based**: Store in Express session (requires session middleware)
- **Redis-based**: Store state tokens in Redis with TTL
- **JWT-based**: Encode state as signed JWT (stateless)

### Phase 3: Frontend Implementation

#### 3.1 OAuth Button Component

Create `apps/web/components/auth/GithubAuthButton.tsx`:

**Features**:

- GitHub logo/icon
- "Sign in with GitHub" / "Continue with GitHub" text
- Loading state during OAuth flow
- Error handling

**Props**:

```typescript
interface GithubAuthButtonProps {
  variant?: 'login' | 'register';
  redirectUrl?: string; // Where to redirect after auth
}
```

#### 3.2 Update Login Page

Modify `apps/web/app/[locale]/auth/login/page.tsx`:

**Changes**:

- Add GitHub button above or below email form
- Add divider ("or") between OAuth and email form
- Handle OAuth redirect flow

**Layout**:

```
┌─────────────────────────┐
│   Sign in with GitHub   │
├─────────────────────────┤
│         or              │
├─────────────────────────┤
│   Email/Password Form   │
└─────────────────────────┘
```

#### 3.3 Update Register Page

Modify `apps/web/app/[locale]/auth/register/page.tsx`:

**Changes**:

- Add GitHub button at top of form
- Add divider between OAuth and registration form
- Handle account creation flow

**Considerations**:

- If user registers via GitHub, skip email/password fields
- Pre-fill name/email from GitHub profile if available
- Handle account type selection (Personal/Organization)

#### 3.4 OAuth Callback Handler

Create `apps/web/app/[locale]/auth/github/callback/page.tsx`:

**Flow**:

1. Extract tokens from URL (hash or query params)
2. Store tokens in auth store
3. Redirect to dashboard or original destination
4. Show loading state during process
5. Handle errors (invalid token, expired, etc.)

**Alternative**: Handle callback in middleware/API route if using server-side rendering

#### 3.5 Update Auth Mutations Hook

Update `apps/web/hooks/auth/useAuthMutations.ts`:

**Add GitHub OAuth methods**:

- `initiateGithubLogin()` - Redirect to backend OAuth endpoint
- `handleGithubCallback(tokens)` - Process callback tokens

**Note**: OAuth flow is primarily redirect-based, not GraphQL mutation-based

### Phase 4: User Account Linking

#### 4.1 Account Creation Flow

When GitHub user registers:

1. **Create User Account**:
   - Use GitHub email (if available) or generate placeholder
   - Use GitHub name or username for display name
   - Set account type (default to Personal)

2. **Create Authentication Method**:
   - Provider: `github`
   - Provider ID: GitHub user ID (numeric)
   - Provider Data: Store access token, email, name, avatar
   - Is Verified: `true` (GitHub accounts are verified)
   - Is Primary: `true` if first auth method

3. **Create Session**:
   - Generate JWT tokens
   - Create user session record
   - Return tokens to frontend

#### 4.2 Account Linking Flow

When existing user adds GitHub:

1. **Check for Existing Account**:
   - If GitHub email matches existing email auth method → Link to same user
   - If GitHub ID already exists → Login flow
   - Otherwise → Create new auth method for current user

2. **Link Authentication Method**:
   - Add GitHub auth method to existing user
   - Set as primary if no primary exists
   - Update user profile with GitHub info if missing

#### 4.3 Email Handling

**Challenges**:

- GitHub emails may be private (null)
- User may have multiple GitHub emails
- Email may differ from existing account email

**Solutions**:

- If GitHub email is null: Use GitHub username + placeholder domain
- If email exists: Use for account linking
- Allow manual email entry if GitHub email unavailable
- Support multiple emails per user (future enhancement)

### Phase 5: Security Considerations

#### 5.1 CSRF Protection

**State Parameter**:

- Generate random state token on OAuth initiation
- Store state token server-side (session/Redis)
- Validate state on callback
- Reject requests with invalid/missing state

**Implementation**:

```typescript
// Generate state
const state = crypto.randomBytes(32).toString('hex');
await redis.set(`oauth:state:${state}`, userId, 'EX', 600); // 10 min TTL

// Validate state
const storedUserId = await redis.get(`oauth:state:${state}`);
if (!storedUserId) {
  throw new AuthenticationError('Invalid state', 'errors:auth.invalidState');
}
await redis.del(`oauth:state:${state}`); // One-time use
```

#### 5.2 Token Storage

**Access Token Storage**:

- Store in `providerData` JSONB field (encrypted at rest)
- Never expose to frontend
- Use for GitHub API calls only
- Consider token refresh if GitHub supports it

**Session Tokens**:

- Use existing JWT-based session system
- Store refresh tokens securely
- Implement token rotation

#### 5.3 Rate Limiting

**OAuth Endpoints**:

- Rate limit `/api/auth/github` initiation
- Rate limit `/api/auth/github/callback`
- Prevent OAuth abuse/spam

**GitHub API Calls**:

- Respect GitHub API rate limits
- Implement caching for user info
- Handle rate limit errors gracefully

#### 5.4 Error Handling

**Common Errors**:

- Invalid authorization code
- Expired authorization code
- GitHub API errors
- Network failures
- User denies authorization

**Error Responses**:

- Return user-friendly error messages
- Log errors for debugging
- Redirect to login with error message
- Support error recovery flows

### Phase 6: Testing Strategy

#### 6.1 Unit Tests

**OAuth Service**:

- Test authorization URL generation
- Test token exchange (mock GitHub API)
- Test user info fetching
- Test error handling

**Authentication Service**:

- Test `processGithubProvider()` method
- Test provider data validation
- Test account creation flow
- Test account linking flow

#### 6.2 Integration Tests

**OAuth Flow**:

- Test complete OAuth flow (with mock GitHub)
- Test callback handling
- Test session creation
- Test error scenarios

**User Account**:

- Test new user registration via GitHub
- Test existing user login via GitHub
- Test account linking
- Test multiple auth methods per user

#### 6.3 E2E Tests

**User Flows**:

- Register new account with GitHub
- Login with GitHub
- Link GitHub to existing account
- Switch between auth methods

**Edge Cases**:

- GitHub email is private
- User denies authorization
- Network failures during OAuth
- Expired authorization codes

### Phase 7: Internationalization

#### 7.1 Translation Keys

Add to `apps/web/i18n/locales/en.json`:

```json
{
  "auth": {
    "github": {
      "signIn": "Sign in with GitHub",
      "continueWith": "Continue with GitHub",
      "connecting": "Connecting to GitHub...",
      "error": "GitHub authentication failed",
      "errorDescription": "Please try again or use email/password",
      "emailPrivate": "Your GitHub email is private. Please provide an email address.",
      "accountLinked": "GitHub account linked successfully"
    }
  }
}
```

#### 7.2 Error Messages

- Translate all error messages
- Support GitHub API error messages
- Provide helpful recovery instructions

### Phase 8: Documentation

#### 8.1 Developer Documentation

- Update API documentation with OAuth endpoints
- Document environment variables
- Add setup instructions for GitHub OAuth app
- Document OAuth flow diagram

#### 8.2 User Documentation

- Update user guide with GitHub login instructions
- Document account linking process
- Troubleshooting guide for common issues

## Implementation Checklist

### Backend

- [ ] Add GitHub OAuth environment variables to config
- [ ] Install @octokit/rest dependency
- [ ] Create GitHub OAuth service
- [ ] Implement OAuth routes (initiate, callback)
- [ ] Create OAuth controller
- [ ] Implement `processGithubProvider()` method
- [ ] Add state management (CSRF protection)
- [ ] Add rate limiting for OAuth endpoints
- [ ] Handle GitHub API errors
- [ ] Add logging for OAuth flows

### Frontend

- [ ] Create GitHubAuthButton component
- [ ] Add GitHub button to login page
- [ ] Add GitHub button to register page
- [ ] Create OAuth callback handler page
- [ ] Update auth mutations hook
- [ ] Add loading states
- [ ] Add error handling UI
- [ ] Add internationalization strings

### Security

- [ ] Implement CSRF protection (state parameter)
- [ ] Secure token storage
- [ ] Add rate limiting
- [ ] Validate all inputs
- [ ] Handle token expiration
- [ ] Audit OAuth flows

### Testing

- [ ] Unit tests for OAuth service
- [ ] Unit tests for auth service updates
- [ ] Integration tests for OAuth flow
- [ ] E2E tests for user flows
- [ ] Test error scenarios
- [ ] Test edge cases (private email, etc.)

### Documentation

- [ ] Update API documentation
- [ ] Add setup guide for GitHub OAuth app
- [ ] Update user documentation
- [ ] Add troubleshooting guide

## GitHub OAuth App Configuration Summary

### What to Create in GitHub

1. **OAuth App** at https://github.com/settings/developers
2. **Application Name**: Grant Platform
3. **Homepage URL**: Your frontend URL
4. **Callback URL**: `https://api.yourdomain.com/api/auth/github/callback`

### What to Provide

1. **Client ID** → `GITHUB_CLIENT_ID` environment variable
2. **Client Secret** → `GITHUB_CLIENT_SECRET` environment variable
3. **Callback URL** → Configured in GitHub OAuth app settings

### OAuth Scopes Required

- `user:email` - Access user email addresses
- `read:user` - Read user profile information

## Next Steps

1. **Review and approve** this implementation plan
2. **Create GitHub OAuth App** and obtain credentials
3. **Implement backend OAuth flow** (Phases 1-2)
4. **Implement frontend integration** (Phase 3)
5. **Test thoroughly** (Phase 6)
6. **Deploy and monitor** OAuth flows

## Future Enhancements

- **GitHub Organizations**: Allow linking GitHub organizations
- **Repository Access**: Integrate with user's GitHub repositories
- **Profile Sync**: Sync GitHub profile picture and bio
- **Token Refresh**: Implement access token refresh if supported
- **Multiple GitHub Accounts**: Support linking multiple GitHub accounts
- **OAuth Provider Abstraction**: Create reusable OAuth provider system for Google, Microsoft, etc.
