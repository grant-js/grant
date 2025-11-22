# Security Settings Implementation Plan

## Overview

Implement security settings page with:

1. List authentication methods
2. Update password for email provider
3. Display active sessions (activity)

## Current State Analysis

### Database Schema ✅

- **`user_authentication_methods`** table exists with:
  - `id`, `userId`, `provider`, `providerId`, `providerData` (JSONB)
  - `isVerified`, `isPrimary`, `lastUsedAt`
  - Supports providers: `email`, `google`, `github`
  - Password stored in `providerData.hashedPassword` for email provider

- **`user_sessions`** table exists with:
  - `id`, `userId`, `userAuthenticationMethodId`
  - `token`, `audience`, `expiresAt`, `lastUsedAt`
  - `userAgent`, `ipAddress`
  - Supports tracking active sessions

### GraphQL Schema ✅

- **Types exist:**
  - `UserAuthenticationMethod` type ✅
  - `UserSession` type ✅
  - `UserSessionPage` type ✅
  - `User` type has `authenticationMethods: [UserAuthenticationMethod!]` field ✅

- **Input types exist:**
  - `GetUserAuthenticationMethodsInput` ✅
  - `GetUserSessionsInput` ✅
  - `passwordChangeSchema` (in schemas) ✅

- **Status:**
  - ✅ GraphQL Query for `userAuthenticationMethods` - **COMPLETED**
  - ✅ GraphQL Query for `userSessions` - **COMPLETED**
  - ✅ GraphQL Mutation for `changePassword` - **COMPLETED**
  - ✅ GraphQL Resolver for `User.authenticationMethods` field - **COMPLETED**

### API Services ✅

- **`UserAuthenticationMethodService`** has:
  - ✅ `getUserAuthenticationMethods(params)` - can query by userId
  - ✅ `verifyPassword(password, hashedPassword)` - password verification
  - ✅ `resetPassword(token, newPassword)` - password reset via token
  - ✅ `changePassword(userId, currentPassword, newPassword)` method - **COMPLETED**

- **`UserSessionService`** has:
  - ✅ `getUserSessions(params)` - can query by userId
  - ✅ `revokeSession(id)` - revoke a session

### REST API ✅

- ✅ REST endpoints implemented:
  - ✅ Getting user authentication methods - **COMPLETED**
  - ✅ Getting user sessions - **COMPLETED**
  - ✅ Changing password - **COMPLETED**
  - ✅ Revoking sessions - **COMPLETED**

### Frontend ✅

- ✅ Security settings page fully implemented
- ✅ All components created:
  - ✅ Authentication methods list - **COMPLETED**
  - ✅ Password change form (with policy validator and cancel button) - **COMPLETED**
  - ✅ Active sessions list (with current session identification) - **COMPLETED**

## Implementation Plan

### Phase 1: Backend API - GraphQL

#### 1.1 Add GraphQL Query for User Authentication Methods

**File:** `packages/@logusgraphics/grant-schema/src/schema/user-authentication-method/queries/get-user-authentication-methods.graphql`

```graphql
extend type Query {
  userAuthenticationMethods(input: GetUserAuthenticationMethodsInput!): [UserAuthenticationMethod!]!
}
```

**File:** `packages/@logusgraphics/grant-schema/src/operations/user-authentication-methods/get-user-authentication-methods.graphql`

```graphql
query GetUserAuthenticationMethods($input: GetUserAuthenticationMethodsInput!) {
  userAuthenticationMethods(input: $input) {
    id
    userId
    provider
    providerId
    isVerified
    isPrimary
    lastUsedAt
    createdAt
    updatedAt
  }
}
```

**File:** `apps/api/src/graphql/resolvers/user-authentication-methods/queries/get-user-authentication-methods.resolver.ts`

- Resolver that calls `services.userAuthenticationMethods.getUserAuthenticationMethods`
- Ensure user can only query their own methods (authorization check)

#### 1.2 Add GraphQL Query for User Sessions

**File:** `packages/@logusgraphics/grant-schema/src/schema/user-sessions/queries/get-user-sessions.graphql`

```graphql
extend type Query {
  userSessions(input: GetUserSessionsInput!): UserSessionPage!
}
```

**File:** `packages/@logusgraphics/grant-schema/src/operations/user-sessions/get-user-sessions.graphql`

```graphql
query GetUserSessions($input: GetUserSessionsInput!) {
  userSessions(input: $input) {
    userSessions {
      id
      userId
      userAuthenticationMethodId
      userAuthenticationMethod {
        provider
        providerId
      }
      audience
      expiresAt
      lastUsedAt
      userAgent
      ipAddress
      createdAt
    }
    totalCount
    hasNextPage
  }
}
```

**File:** `apps/api/src/graphql/resolvers/user-sessions/queries/get-user-sessions.resolver.ts`

- Resolver that calls `services.userSessions.getUserSessions`
- Ensure user can only query their own sessions (authorization check)

#### 1.3 Add GraphQL Mutation for Change Password

**File:** `packages/@logusgraphics/grant-schema/src/schema/user-authentication-method/inputs/change-password.graphql`

```graphql
input ChangePasswordInput {
  currentPassword: String!
  newPassword: String!
  confirmPassword: String!
}
```

**File:** `packages/@logusgraphics/grant-schema/src/schema/user-authentication-method/mutations/change-password.graphql`

```graphql
type ChangePasswordResult {
  success: Boolean!
  message: String!
}

extend type Mutation {
  changePassword(input: ChangePasswordInput!): ChangePasswordResult!
}
```

**File:** `packages/@logusgraphics/grant-schema/src/operations/user-authentication-methods/change-password.graphql`

```graphql
mutation ChangePassword($input: ChangePasswordInput!) {
  changePassword(input: $input) {
    success
    message
  }
}
```

**File:** `apps/api/src/services/user-authentication-methods.service.ts`

- Add `changePassword(userId, currentPassword, newPassword, transaction?)` method:
  1. Get user's email authentication method
  2. Verify current password against `providerData.hashedPassword`
  3. Validate new password with `passwordPolicySchema`
  4. Hash new password
  5. Update `providerData.hashedPassword`
  6. Optionally invalidate all sessions (or just current session)
  7. Return success

**File:** `apps/api/src/handlers/users.handler.ts`

- Add `changePassword(userId, currentPassword, newPassword)` method:
  - Wrap in transaction
  - Call service method
  - Handle errors

**File:** `apps/api/src/graphql/resolvers/user-authentication-methods/mutations/change-password.resolver.ts`

- Resolver that:
  - Validates input with `passwordChangeSchema`
  - Gets current user from context
  - Calls handler
  - Returns result

#### 1.4 Add GraphQL Mutation for Revoke Session

**File:** `packages/@logusgraphics/grant-schema/src/schema/user-sessions/mutations/revoke-user-session.graphql`

```graphql
type RevokeUserSessionResult {
  success: Boolean!
  message: String!
}

extend type Mutation {
  revokeUserSession(id: ID!): RevokeUserSessionResult!
}
```

**File:** `apps/api/src/graphql/resolvers/user-sessions/mutations/revoke-user-session.resolver.ts`

- Resolver that:
  - Gets current user from context
  - Verifies session belongs to user
  - Calls `services.userSessions.revokeSession(id)`
  - Returns result

#### 1.5 Add User AuthenticationMethods Field Resolver

**File:** `apps/api/src/graphql/resolvers/users/fields/authentication-methods.resolver.ts`

- Resolver for `User.authenticationMethods` field
- Calls `services.userAuthenticationMethods.getUserAuthenticationMethods({ userId: parent.id })`

**File:** `apps/api/src/graphql/resolvers/users/fields/index.ts`

- Export `authenticationMethods` resolver

**File:** `apps/api/src/graphql/resolvers/index.ts`

- Add `authenticationMethods` to User resolvers

### Phase 2: Backend API - REST (Optional)

#### 2.1 Add REST Endpoint for User Authentication Methods

**File:** `apps/api/src/rest/schemas/users.schemas.ts`

- Add `getUserAuthenticationMethodsResponseSchema`

**File:** `apps/api/src/rest/controllers/users.controller.ts`

- Add `getAuthenticationMethods(req, res)` method

**File:** `apps/api/src/rest/routes/users.routes.ts`

- Add `GET /api/users/:id/authentication-methods` route

#### 2.2 Add REST Endpoint for Change Password

**File:** `apps/api/src/rest/schemas/users.schemas.ts`

- Add `changePasswordRequestSchema` using `passwordChangeSchema`
- Add `changePasswordResponseSchema`

**File:** `apps/api/src/rest/controllers/users.controller.ts`

- Add `changePassword(req, res)` method

**File:** `apps/api/src/rest/routes/users.routes.ts`

- Add `POST /api/users/:id/change-password` route

#### 2.3 Add REST Endpoint for User Sessions

**File:** `apps/api/src/rest/schemas/users.schemas.ts`

- Add `getUserSessionsResponseSchema`

**File:** `apps/api/src/rest/controllers/users.controller.ts`

- Add `getSessions(req, res)` method

**File:** `apps/api/src/rest/routes/users.routes.ts`

- Add `GET /api/users/:id/sessions` route

**File:** `apps/api/src/rest/routes/users.routes.ts`

- Add `DELETE /api/users/:id/sessions/:sessionId` route for revoking

### Phase 3: Frontend Integration

#### 3.1 Create Authentication Methods Component

**File:** `apps/web/components/settings/AuthenticationMethodsList.tsx`

- Display list of authentication methods
- Show provider type (Email, Google, GitHub)
- Show verification status
- Show primary method indicator
- Show last used date
- For email provider, show "Change Password" button
- For OAuth providers, show "Connect" button (future)

#### 3.2 Create Password Change Form Component

**File:** `apps/web/components/settings/ChangePasswordForm.tsx`

- Form with fields:
  - Current password
  - New password
  - Confirm password
- Validation:
  - Current password required
  - New password meets policy
  - Passwords match
  - New password different from current
- Submit handler calls `changePassword` mutation
- Success/error notifications

#### 3.3 Create Active Sessions Component

**File:** `apps/web/components/settings/ActiveSessionsList.tsx`

- Display list of active sessions
- Show:
  - Device/browser (from userAgent)
  - IP address
  - Location (if available)
  - Last used date
  - Expires at date
  - Current session indicator
- "Revoke" button for each session (including current with warning) ✅
- ⚠️ "Revoke All Other Sessions" button - **PENDING** (mentioned as optional enhancement)

#### 3.4 Create Security Settings Page

**File:** `apps/web/app/[locale]/dashboard/settings/security/page.tsx`

- Use `GetUserAuthenticationMethods` query
- Use `GetUserSessions` query
- Render:
  - `AuthenticationMethodsList` component
  - `ChangePasswordForm` component (if email method exists)
  - `ActiveSessionsList` component

#### 3.5 Add GraphQL Operations Hooks

**File:** `apps/web/hooks/users/useUserMutations.ts`

- Add `handleChangePassword` function
- Add `handleRevokeSession` function

**File:** `apps/web/hooks/users/useUserQueries.ts` (create if needed)

- Add `useUserAuthenticationMethods` hook
- Add `useUserSessions` hook

#### 3.6 Add Translations

**File:** `apps/web/i18n/locales/en.json` & `de.json`

- Add keys for:
  - `settings.security.authenticationMethods.*`
  - `settings.security.changePassword.*`
  - `settings.security.activeSessions.*`
  - Error messages
  - Success messages

### Phase 4: Testing & Validation

#### 4.1 Backend Tests

- Test `changePassword` service method
- Test GraphQL resolvers
- Test authorization (users can only access their own data)
- Test password validation
- Test session revocation

#### 4.2 Frontend Tests

- Test form validation
- Test mutation calls
- Test error handling
- Test UI updates after mutations

## Implementation Order

1. **Backend - Service Layer** (changePassword method)
2. **Backend - GraphQL Schema** (queries and mutations)
3. **Backend - GraphQL Resolvers**
4. **Backend - User Field Resolver** (authenticationMethods)
5. **Frontend - GraphQL Operations**
6. **Frontend - Components**
7. **Frontend - Page Integration**
8. **REST API** (optional, can be done later)

## Security Considerations

1. **Authorization:**
   - Users can only query their own authentication methods
   - Users can only query their own sessions
   - Users can only change their own password
   - Users can only revoke their own sessions

2. **Password Security:**
   - Current password must be verified before change
   - New password must meet policy requirements
   - Password is hashed before storage
   - Consider rate limiting for password change attempts

3. **Session Security:**
   - Sessions should show userAgent and IP for transparency
   - Revoking sessions should invalidate tokens immediately
   - Consider showing approximate location if IP geolocation available

4. **Data Privacy:**
   - Don't expose sensitive data in providerData
   - Don't expose full tokens in sessions
   - Mask IP addresses if required by privacy policy

## Implementation Status

### ✅ Completed Features

1. **Backend API (GraphQL & REST)**
   - ✅ User authentication methods query
   - ✅ User sessions query
   - ✅ Change password mutation
   - ✅ Revoke session mutation
   - ✅ User authenticationMethods field resolver
   - ✅ All REST endpoints with OpenAPI documentation

2. **Frontend Components**
   - ✅ Authentication methods list with provider display
   - ✅ Password change form with policy validator
   - ✅ Active sessions list with device information
   - ✅ Current session identification and warnings
   - ✅ Session revocation with confirmation dialogs
   - ✅ Cancel button for password form
   - ✅ Full i18n support

3. **Session Management Enhancements**
   - ✅ Device-aware sessions (userAgent + ipAddress)
   - ✅ Session uniqueness per device
   - ✅ IP address extraction with proxy support
   - ✅ Current session identification via JWT `jti` claim

4. **Documentation**
   - ✅ Security & Session Management documentation (`/architecture/security`)
   - ✅ Data model updated with authentication & sessions section

### ⚠️ Optional Enhancements (Not Implemented)

1. **"Revoke All Other Sessions" Button**
   - Would allow users to revoke all sessions except the current one
   - Requires backend mutation to revoke multiple sessions
   - Considered useful but not critical for MVP

2. **Session Activity Logging/Audit Trail**
   - Enhanced logging of session events
   - Could be added to audit logging system

### 🔮 Future Enhancements

- OAuth provider connection (Google, GitHub) - UI ready, backend integration pending
- 2FA/MFA support - Requires additional schema and service changes
- IP geolocation for session display - Would enhance UX but requires external service
- Session limits (max concurrent sessions) - Configuration option

## Notes

- The `passwordChangeSchema` already exists in `apps/api/src/services/user-authentication-methods.schemas.ts` ✅
- The `User.authenticationMethods` field exists in GraphQL schema with resolver ✅
- Device-aware session management implemented ✅
- All core security settings features are complete and functional ✅
