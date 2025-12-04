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
   - **Is Primary: `true`** - MUST be set to `true` for the first authentication method

3. **Create Session**:
   - Generate JWT tokens
   - Create user session record
   - Return tokens to frontend

**CRITICAL**: When creating the first authentication method for a user (during registration), `isPrimary` MUST be set to `true`. This ensures every user has exactly one primary authentication method.

#### 4.2 Account Linking Flow

When existing user adds GitHub:

1. **Check for Existing Account**:
   - If GitHub email matches existing email auth method → Link to same user
   - If GitHub ID already exists → Login flow
   - Otherwise → Create new auth method for current user

2. **Link Authentication Method**:
   - Add GitHub auth method to existing user
   - **Set as primary ONLY if no primary exists** (check existing methods first)
   - Update user profile with GitHub info if missing

**CRITICAL**: When linking a new authentication method to an existing user:

- Check if user has any existing authentication methods
- If no primary method exists, set the new method as primary
- If a primary method already exists, set `isPrimary: false` for the new method
- Ensure exactly one method is marked as primary at all times

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

- [x] Add GitHub OAuth environment variables to config
- [x] Install @octokit/rest dependency (or equivalent - using native fetch)
- [x] Create GitHub OAuth service
- [x] Implement OAuth routes (initiate, callback)
- [x] Create OAuth controller
- [x] Implement `processGithubProvider()` method
- [x] Add state management (CSRF protection)
- [ ] Add rate limiting for OAuth endpoints
- [x] Handle GitHub API errors
- [x] Add logging for OAuth flows
- [x] Update `createUserAuthenticationMethod` to set isPrimary correctly
- [x] Update `createUserAuthenticationMethod` to prevent duplicate providers per user
- [x] Update `createUserAuthenticationMethod` to check for cross-user provider conflicts
- [x] Update `deleteUserAuthenticationMethod` to prevent primary deletion
- [x] Update `deleteUserAuthenticationMethod` to prevent last method deletion
- [x] Add `setPrimaryAuthenticationMethod` service method
- [x] Add GraphQL mutations for delete and set primary
- [x] Add GraphQL mutation for createUserAuthenticationMethod
- [x] Update OAuth callback to support "connect" flow from settings
- [x] Update OAuth callback to handle errors and redirect appropriately
- [x] Ensure isPrimary is set on first method during registration
- [x] Add error handling for provider already connected to another user
- [x] Add email verification email sending when adding email auth method
- [x] Add handler method for createUserAuthenticationMethod with email sending

### Frontend

- [x] Create GitHubAuthButton component
- [x] Add GitHub button to login page
- [x] Add GitHub button to register page
- [x] Create OAuth callback handler page
- [x] Update auth mutations hook
- [x] Add loading states
- [x] Add error handling UI
- [x] Add internationalization strings (basic GitHub OAuth strings)
- [x] Update AuthenticationMethodsList to show all providers
- [x] Add connect/disconnect functionality
- [x] Add set primary functionality
- [x] Handle OAuth connection from settings page
- [x] Handle OAuth callback redirect with success/error states
- [x] Prevent UI actions on primary method deletion
- [x] Prevent UI actions on last method deletion
- [x] Add email addition form component (AddEmailAuthMethodForm)
- [x] Handle email provider addition
- [x] Show appropriate error messages for provider conflicts
- [x] Update UI state to toggle connect/disconnect based on connection status
- [x] Create AuthenticationMethodActions component with dropdown menu
- [x] Replace action buttons with Actions dropdown component
- [x] Add cache invalidation for me() query after adding email auth method
- [x] Add English and German translations for all new strings

### Security

- [x] Implement CSRF protection (state parameter)
- [x] Secure token storage (tokens stored in providerData JSONB field)
- [ ] Add rate limiting for OAuth endpoints
- [x] Validate all inputs (Zod schemas for all inputs)
- [ ] Handle token expiration (GitHub tokens)
- [x] Audit OAuth flows (logging added)

### Testing

- [ ] Unit tests for OAuth service
- [ ] Unit tests for auth service updates
- [ ] Integration tests for OAuth flow
- [ ] E2E tests for user flows
- [ ] Test error scenarios
- [ ] Test edge cases (private email, etc.)
- [ ] Test isPrimary logic (first method, multiple methods, deletion)
- [ ] Test preventing deletion of primary method
- [ ] Test preventing deletion of last method
- [ ] Test setting primary method
- [ ] Test connecting/disconnecting OAuth methods from settings page
- [ ] Test preventing duplicate providers per user
- [ ] Test preventing cross-user provider conflicts
- [ ] Test error handling when provider already connected to another user
- [ ] Test email provider addition flow
- [ ] Test OAuth callback redirect handling

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

### Phase 9: Security Settings Page Integration

#### 9.1 Backend: Ensure isPrimary Logic

**File**: `apps/api/src/services/user-authentication-methods.service.ts`

**Update `createUserAuthenticationMethod()` method**:

```typescript
public async createUserAuthenticationMethod(
  params: Omit<CreateUserAuthenticationMethodInput, 'providerData'> & {
    providerData?: Record<string, unknown>;
  },
  transaction?: Transaction
): Promise<UserAuthenticationMethod> {
  const context = 'UserAuthenticationMethodService.createUserAuthenticationMethod';

  validateInput(createUserAuthenticationMethodInputSchema, params, context);

  // Validate provider uniqueness globally (prevent duplicate provider+providerId across users)
  await this.validateProviderUniqueness(params.provider, params.providerId, transaction);

  // Check if THIS USER already has this provider type
  const existingMethods = await this.getUserAuthenticationMethods(
    { userId: params.userId },
    transaction
  );

  // Prevent user from adding duplicate provider type
  const hasProvider = existingMethods.some((m) => m.provider === params.provider);
  if (hasProvider) {
    throw new BadRequestError(
      `User already has a ${params.provider} authentication method`,
      'errors:auth.duplicateProvider',
      { provider: params.provider }
    );
  }

  // Check if provider+providerId combination exists for another user
  const existingAuthMethod = await this.repositories.userAuthenticationMethodRepository
    .findByProviderAndProviderId(params.provider, params.providerId, undefined, transaction);

  if (existingAuthMethod && existingAuthMethod.userId !== params.userId) {
    throw new ConflictError(
      'This authentication method is already connected to another account',
      'errors:auth.providerAlreadyConnected',
      { provider: params.provider, providerId: params.providerId }
    );
  }

  // Determine if this should be primary
  const hasPrimaryMethod = existingMethods.some((m) => m.isPrimary);
  const isPrimary = !hasPrimaryMethod; // Set as primary if no primary exists

  const userAuthenticationMethod =
    await this.repositories.userAuthenticationMethodRepository.createUserAuthenticationMethod(
      {
        ...params,
        isPrimary, // Explicitly set isPrimary
      },
      transaction
    );

  // ... rest of method (audit logging, validation, etc.) ...
}
```

**Update `deleteUserAuthenticationMethod()` method**:

```typescript
public async deleteUserAuthenticationMethod(
  params: DeleteUserAuthenticationMethodInput,
  transaction?: Transaction
): Promise<UserAuthenticationMethod> {
  const method = await this.getUserAuthenticationMethod(params.id);

  // Prevent deletion of primary authentication method
  if (method.isPrimary) {
    throw new BadRequestError(
      'Cannot delete primary authentication method',
      'errors:auth.cannotDeletePrimary'
    );
  }

  // Prevent deletion of last authentication method
  const allMethods = await this.getUserAuthenticationMethods(
    { userId: method.userId },
    transaction
  );

  if (allMethods.length === 1) {
    throw new BadRequestError(
      'Cannot delete last authentication method',
      'errors:auth.cannotDeleteLastMethod'
    );
  }

  // ... rest of deletion logic ...
}
```

**Add method to set primary authentication method**:

```typescript
public async setPrimaryAuthenticationMethod(
  id: string,
  transaction?: Transaction
): Promise<UserAuthenticationMethod> {
  const method = await this.getUserAuthenticationMethod(id);

  // Get all user's authentication methods
  const allMethods = await this.getUserAuthenticationMethods(
    { userId: method.userId },
    transaction
  );

  // Unset all other primary methods
  await Promise.all(
    allMethods
      .filter((m) => m.id !== id && m.isPrimary)
      .map((m) =>
        this.updateUserAuthenticationMethod(m.id, { isPrimary: false }, transaction)
      )
  );

  // Set this method as primary
  return await this.updateUserAuthenticationMethod(id, { isPrimary: true }, transaction);
}
```

#### 9.2 Backend: OAuth Connection Endpoint

**File**: `apps/api/src/rest/controllers/oauth.controller.ts`

**Add method for connecting OAuth from settings page**:

```typescript
async connectGithubFromSettings(
  req: TypedRequest,
  res: Response
) {
  // Similar to initiateGithubAuth but with redirectUrl set to settings page
  // Store state with userId from authenticated session
  // Redirect to GitHub OAuth
}
```

**Update callback handler** to support linking to existing authenticated user:

```typescript
async handleGithubCallback(
  req: TypedRequest<{
    query: { code?: string; state?: string; error?: string; error_description?: string };
  }>,
  res: Response
) {
  // ... existing callback logic (code exchange, user info fetch) ...

  // Check if this is a "connect" flow (user already authenticated from settings page)
  if (storedState.userId && storedState.action === 'connect') {
    try {
      // Link GitHub to existing user account
      await this.handlers.accounts.linkGithubAuthToExistingUser(
        {
          userId: storedState.userId,
          providerId: oauthResult.providerId,
          providerData: {
            accessToken: oauthResult.accessToken,
            githubId: oauthResult.githubUser.id,
            email: oauthResult.githubUser.email,
            name: oauthResult.githubUser.name,
            username: oauthResult.githubUser.login,
            avatarUrl: oauthResult.githubUser.avatar_url,
          },
        },
        this.origin,
        this.context.userAgent,
        this.context.ipAddress
      );

      // Redirect back to settings page with success indicator
      const redirectUrl = storedState.redirectUrl || `${this.origin}/dashboard/settings/security`;
      return res.redirect(`${redirectUrl}?connected=github&success=true`);
    } catch (error) {
      // Handle errors (e.g., provider already connected to another user)
      const redirectUrl = storedState.redirectUrl || `${this.origin}/dashboard/settings/security`;
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect GitHub account';
      return res.redirect(`${redirectUrl}?connected=github&error=${encodeURIComponent(errorMessage)}`);
    }
  }

  // ... rest of existing callback logic (login/register flows) ...
}
```

#### 9.3 Backend: GraphQL Mutations

**File**: `packages/@logusgraphics/grant-schema/src/schema/user-authentication-method/mutations/delete-user-authentication-method.graphql`

```graphql
extend type Mutation {
  deleteUserAuthenticationMethod(
    input: DeleteUserAuthenticationMethodInput!
  ): UserAuthenticationMethod!
}
```

**File**: `packages/@logusgraphics/grant-schema/src/schema/user-authentication-method/mutations/set-primary-authentication-method.graphql`

```graphql
extend type Mutation {
  setPrimaryAuthenticationMethod(id: ID!): UserAuthenticationMethod!
}
```

**File**: `apps/api/src/graphql/resolvers/user-authentication-methods/mutations/delete-user-authentication-method.resolver.ts`

- Validate user owns the authentication method
- Prevent deletion of primary method
- Call service method

**File**: `apps/api/src/graphql/resolvers/user-authentication-methods/mutations/set-primary-authentication-method.resolver.ts`

- Validate user owns the authentication method
- Call service method to set primary

#### 9.4 Frontend: Update AuthenticationMethodsList Component

**File**: `apps/web/components/settings/AuthenticationMethodsList.tsx`

**Key Changes**:

1. **Display all available providers** (email, GitHub) even if not connected:

   ```typescript
   const availableProviders: UserAuthenticationMethodProvider[] = ['email', 'github'];

   // Show all providers, mark which ones are connected
   const providerStatus = availableProviders.map((provider) => {
     const method = methods.find((m) => m.provider === provider);
     return {
       provider,
       connected: !!method,
       method,
       isPrimary: method?.isPrimary || false,
     };
   });
   ```

2. **Show appropriate actions**:
   - **Connected OAuth methods**: Show "Disconnect" button (disabled if primary or last method)
   - **Unconnected OAuth methods**: Show "Connect" button
   - **Connected Email method**: Show "Change Password" button
   - **Unconnected Email**: Show "Add Email" button (opens email registration form)
   - **All connected methods**: Show "Set as Primary" button (disabled if already primary)

3. **Handle connect action**:

   ```typescript
   const handleConnect = (provider: 'github' | 'email') => {
     if (provider === 'github') {
       // Redirect to OAuth initiation endpoint with connect=true
       const redirectUrl = `${window.location.origin}${window.location.pathname}`;
       window.location.href = `/api/auth/github?action=connect&redirectUrl=${encodeURIComponent(redirectUrl)}`;
     } else if (provider === 'email') {
       // Show email registration form or redirect to email setup
       setShowAddEmail(true);
     }
   };
   ```

4. **Handle disconnect action**:

   ```typescript
   const handleDisconnect = async (methodId: string, isPrimary: boolean, isLastMethod: boolean) => {
     if (isPrimary) {
       toast.error(t('cannotDisconnectPrimary'));
       return;
     }
     if (isLastMethod) {
       toast.error(t('cannotDisconnectLastMethod'));
       return;
     }

     try {
       await deleteUserAuthenticationMethod({ id: methodId });
       toast.success(t('disconnected', { provider: /* provider name */ }));
       refetch(); // Refresh list - UI will toggle to "Connect" state
     } catch (error) {
       toast.error(t('disconnectError'));
     }
   };
   ```

5. **Handle set primary action**:

   ```typescript
   const handleSetPrimary = async (methodId: string) => {
     try {
       await setPrimaryAuthenticationMethod({ id: methodId });
       toast.success(t('primarySet'));
       refetch(); // Refresh list to update primary badges
     } catch (error) {
       toast.error(t('setPrimaryError'));
     }
   };
   ```

6. **Handle OAuth callback result**:

   ```typescript
   useEffect(() => {
     const params = new URLSearchParams(window.location.search);
     const connected = params.get('connected');
     const success = params.get('success');
     const error = params.get('error');

     if (connected === 'github') {
       if (success === 'true') {
         toast.success(t('githubConnected'));
       } else if (error) {
         toast.error(t('githubConnectError'), {
           description: decodeURIComponent(error),
         });
       }

       // Clean URL
       window.history.replaceState({}, '', window.location.pathname);
       refetch(); // Refresh list - UI will toggle to "Disconnect" state
     }
   }, []);
   ```

#### 9.5 Frontend: Add Hooks for Mutations

**File**: `apps/web/hooks/users/useUserAuthenticationMethods.ts`

**Add mutations**:

```typescript
export function useUserAuthenticationMethods(userId: string) {
  // ... existing query ...

  const [deleteMethod] = useMutation(DeleteUserAuthenticationMethodDocument);
  const [setPrimary] = useMutation(SetPrimaryAuthenticationMethodDocument);

  const deleteAuthenticationMethod = async (id: string) => {
    await deleteMethod({ variables: { input: { id } } });
    await refetch();
  };

  const setPrimaryMethod = async (id: string) => {
    await setPrimary({ variables: { id } });
    await refetch();
  };

  return {
    authenticationMethods,
    loading,
    error,
    refetch,
    deleteAuthenticationMethod,
    setPrimaryMethod,
  };
}
```

#### 9.6 Frontend: Update Security Settings Page

**File**: `apps/web/app/[locale]/dashboard/settings/security/page.tsx`

**Update to handle OAuth connection callback**:

```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('connected') === 'github') {
    toast.success(t('githubConnected'));
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
    refetch();
  }
}, []);
```

#### 9.7 Translation Keys

**File**: `apps/web/i18n/locales/en.json`

```json
{
  "settings": {
    "security": {
      "authenticationMethods": {
        "connect": "Connect",
        "disconnect": "Disconnect",
        "add": "Add",
        "remove": "Remove",
        "setAsPrimary": "Set as Primary",
        "cannotDisconnectPrimary": "Cannot disconnect primary authentication method",
        "cannotDisconnectLastMethod": "Cannot disconnect your last authentication method. Please add another method first.",
        "cannotRemovePrimary": "Cannot remove primary authentication method",
        "cannotRemoveLastMethod": "Cannot remove your last authentication method. Please add another method first.",
        "connectGithub": "Connect GitHub Account",
        "disconnectGithub": "Disconnect GitHub Account",
        "addEmail": "Add Email",
        "githubConnected": "GitHub account connected successfully",
        "githubDisconnected": "GitHub account disconnected successfully",
        "githubConnectError": "Failed to connect GitHub account",
        "emailAdded": "Email authentication method added successfully",
        "disconnected": "{{provider}} account disconnected successfully",
        "disconnectError": "Failed to disconnect authentication method",
        "primarySet": "Primary authentication method updated",
        "setPrimaryError": "Failed to set primary authentication method",
        "notConnected": "Not connected",
        "providerAlreadyConnected": "This account is already connected to another user. Please disconnect it from the other account first.",
        "duplicateProvider": "You already have a {{provider}} authentication method connected"
      }
    }
  },
  "errors": {
    "auth": {
      "cannotDeletePrimary": "Cannot delete primary authentication method",
      "cannotDeleteLastMethod": "Cannot delete your last authentication method",
      "providerAlreadyConnected": "This authentication method is already connected to another account",
      "duplicateProvider": "You already have a {{provider}} authentication method"
    }
  }
}
```

#### 9.8 Validation Rules

**CRITICAL RULES**:

1. **Exactly one primary method**: Always ensure exactly one authentication method per user has `isPrimary: true`
2. **Cannot delete primary**: Never allow deletion of the primary authentication method
3. **Cannot delete last method**: Never allow deletion of the last remaining authentication method
4. **Auto-set primary on first method**: When creating the first authentication method for a user, automatically set `isPrimary: true`
5. **Set primary on connect**: When connecting a new method, only set as primary if no primary exists
6. **Prevent duplicate providers per user**: A user cannot have multiple authentication methods of the same provider type (e.g., cannot have two GitHub methods)
7. **Prevent cross-user provider conflicts**: If a provider+providerId combination already exists for another user, prevent connection and inform the user they must disconnect from the other account first
8. **User can set primary on demand**: Users can change which method is primary at any time (except when it's the only method)

#### 9.9 Email Provider Addition

**File**: `apps/web/components/settings/AddEmailForm.tsx` (new component)

Create a form component for adding email authentication method:

```typescript
interface AddEmailFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onCancel: () => void;
}

export function AddEmailForm({ onSubmit, onCancel }: AddEmailFormProps) {
  // Form with email and password fields
  // Validation for email format
  // Password strength requirements
  // Submit handler that calls the create email auth method mutation
}
```

**Backend**: Email authentication method creation should follow the same validation rules as OAuth methods:

- Check for duplicate provider per user
- Check for provider+providerId conflicts
- Set as primary if first method
- Send verification email if needed

## Future Enhancements

- **GitHub Organizations**: Allow linking GitHub organizations
- **Repository Access**: Integrate with user's GitHub repositories
- **Profile Sync**: Sync GitHub profile picture and bio
- **Token Refresh**: Implement access token refresh if supported
- **Multiple GitHub Accounts**: Support linking multiple GitHub accounts
- **OAuth Provider Abstraction**: Create reusable OAuth provider system for Google, Microsoft, etc.
