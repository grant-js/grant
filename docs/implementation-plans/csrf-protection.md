---
title: CSRF Protection Implementation Plan
description: Plan for implementing comprehensive CSRF protection
---

# CSRF Protection Implementation Plan

## Current State Assessment

### ✅ What's Already Protected

1. **GraphQL Endpoints** - Apollo Server has built-in CSRF prevention enabled via `csrfPrevention: true`
2. **JWT in Authorization Headers** - All authenticated requests use `Authorization: Bearer <token>` headers, which are **not vulnerable to CSRF** because:
   - Browsers don't automatically send custom headers in cross-site requests
   - Attackers cannot read or set these headers from malicious sites
3. **SameSite Cookie Attribute** - Cookies use `sameSite: 'lax'` which provides partial protection:
   - ✅ Blocks cross-site POST/PUT/DELETE requests
   - ⚠️ Still allows GET requests (but GET should be idempotent anyway)

### ⚠️ Potential Vulnerabilities

1. **REST Endpoints** - If any REST endpoints accept authentication via cookies (currently they don't), they would be vulnerable
2. **State-Changing GET Requests** - Any GET requests that modify state could be vulnerable (should be avoided anyway)
3. **Cookie-Based Authentication** - If we ever switch to cookie-based auth, CSRF protection becomes critical

## Security Analysis

### Why CSRF Protection Matters

**CSRF (Cross-Site Request Forgery)** attacks exploit the fact that browsers automatically include cookies with requests to the same domain, even from malicious sites.

**Attack Scenario:**
```
1. User logs into your app (gets auth cookie)
2. User visits malicious site (evil.com)
3. Malicious site makes request to your API: <img src="https://yourapp.com/api/users/delete/123">
4. Browser automatically includes auth cookie
5. Your API processes request as authenticated user
```

### Current Protection Level: **Medium-High**

**Why it's relatively safe:**
- ✅ JWT tokens in Authorization headers (not auto-sent by browsers)
- ✅ SameSite: 'lax' cookies (blocks most cross-site POST requests)
- ✅ Apollo CSRF prevention (GraphQL protected)
- ✅ No cookie-based authentication currently

**Why we should still implement it:**
- 🔒 Defense in depth (multiple layers of security)
- 🔒 Future-proofing (if we add cookie-based auth)
- 🔒 Protects against edge cases
- 🔒 Industry best practice
- 🔒 Required for compliance (SOC2, ISO27001, etc.)

## Implementation Plan

### Phase 1: CSRF Token Generation & Storage (Low Complexity)

**Goal:** Generate and store CSRF tokens server-side

**Implementation:**
1. Create CSRF middleware that:
   - Generates random CSRF token on first request
   - Stores token in httpOnly cookie (for validation)
   - Exposes token via response header or dedicated endpoint
   - Validates token on state-changing requests

**Files to Create/Modify:**
- `apps/api/src/middleware/csrf.middleware.ts` - CSRF token generation and validation
- `apps/api/src/server.ts` - Add CSRF middleware to Express app

**Complexity:** Low (2-3 hours)

### Phase 2: Token Exposure & Frontend Integration (Medium Complexity)

**Goal:** Make CSRF tokens available to frontend and include in requests

**Implementation:**
1. Create endpoint to fetch CSRF token: `GET /api/csrf-token`
2. Update frontend to:
   - Fetch CSRF token on app initialization
   - Store token in memory (not localStorage/cookies)
   - Include token in all state-changing requests (POST/PUT/DELETE/PATCH)
   - Refresh token periodically or on 403 errors

**Files to Create/Modify:**
- `apps/api/src/rest/routes/csrf.routes.ts` - CSRF token endpoint
- `apps/web/lib/csrf.ts` - CSRF token management utility
- `apps/web/lib/apollo-client.ts` - Include CSRF token in GraphQL requests
- `apps/web/lib/api-client.ts` (if exists) - Include CSRF token in REST requests

**Complexity:** Medium (4-6 hours)

### Phase 3: Validation & Error Handling (Low Complexity)

**Goal:** Validate CSRF tokens on all state-changing requests

**Implementation:**
1. CSRF middleware validates:
   - Token exists in request header (`X-CSRF-Token`)
   - Token matches stored token in cookie
   - Token hasn't expired (optional: add expiration)
2. Return 403 Forbidden if validation fails
3. Provide clear error messages

**Files to Modify:**
- `apps/api/src/middleware/csrf.middleware.ts` - Add validation logic
- `apps/api/src/middleware/error.middleware.ts` - Handle CSRF errors

**Complexity:** Low (2-3 hours)

### Phase 4: Testing & Documentation (Low Complexity)

**Goal:** Ensure CSRF protection works correctly and document it

**Implementation:**
1. Write tests for:
   - Token generation
   - Token validation (success and failure cases)
   - Token refresh
   - Error handling
2. Update security documentation
3. Add configuration examples

**Files to Create/Modify:**
- `apps/api/src/middleware/__tests__/csrf.middleware.test.ts`
- `docs/architecture/security.md` - Add CSRF section
- `docs/getting-started/configuration.md` - Update CSRF config docs

**Complexity:** Low (2-3 hours)

## Total Estimated Complexity

**Time:** 10-15 hours
**Difficulty:** Medium
**Risk:** Low (can be implemented incrementally, doesn't break existing functionality)

## Implementation Strategy

### Option 1: Full Implementation (Recommended)
Implement all phases at once for comprehensive protection.

**Pros:**
- Complete protection immediately
- No partial implementation gaps
- Easier to test end-to-end

**Cons:**
- Requires more upfront work
- All-or-nothing approach

### Option 2: Incremental Implementation
Implement phase by phase, testing after each.

**Pros:**
- Can validate each phase independently
- Lower risk of breaking changes
- Can pause if issues arise

**Cons:**
- Partial protection during implementation
- May need to refactor between phases

## Technical Details

### CSRF Token Strategy: Double Submit Cookie Pattern

**How it works:**
1. Server generates random token, stores in httpOnly cookie
2. Server also sends token in response (header or body)
3. Client reads token and includes in custom header (`X-CSRF-Token`)
4. Server validates header token matches cookie token
5. If match: request is legitimate (same origin)
6. If mismatch: request is CSRF (different origin can't read cookie)

**Why this works:**
- Attacker can't read httpOnly cookie (can't get token)
- Attacker can't set custom headers (browser restriction)
- Only legitimate same-origin requests can include token

### Token Storage Options

**Option A: In-Memory (Recommended)**
- Store tokens in Map/Redis keyed by session ID
- Pros: Fast, scalable, can expire tokens
- Cons: Requires session management

**Option B: Signed Cookie**
- Store token in signed cookie
- Pros: Stateless, simple
- Cons: Harder to invalidate, larger cookies

**Option C: Database**
- Store tokens in database
- Pros: Full control, audit trail
- Cons: Database overhead, slower

**Recommendation:** Start with Option A (in-memory), can migrate to Redis for multi-instance deployments.

### Token Expiration

- **Default:** 24 hours (same as typical session)
- **Refresh:** On each successful validation, extend expiration
- **Invalidation:** On logout, password change, suspicious activity

## Configuration

```typescript
// apps/api/src/config/env.config.ts
export const CSRF_CONFIG = {
  enabled: getEnvBoolean('SECURITY_ENABLE_CSRF', APP_CONFIG.isProduction),
  cookieName: 'csrf-token',
  headerName: 'X-CSRF-Token',
  tokenLength: 32, // bytes
  expirationHours: 24,
  refreshOnUse: true,
} as const;
```

## API Changes

### New Endpoint

```http
GET /api/csrf-token
Response: {
  "token": "base64-encoded-token",
  "expiresAt": "2024-01-01T00:00:00Z"
}
```

### Request Headers

All state-changing requests must include:
```
X-CSRF-Token: <token-from-csrf-endpoint>
```

### Error Response

```json
{
  "error": "CSRF token validation failed",
  "code": "CSRF_TOKEN_INVALID",
  "statusCode": 403
}
```

## Frontend Changes

### Token Management

```typescript
// apps/web/lib/csrf.ts
class CsrfTokenManager {
  private token: string | null = null;
  private expiresAt: Date | null = null;

  async getToken(): Promise<string> {
    if (!this.token || this.isExpired()) {
      await this.refreshToken();
    }
    return this.token!;
  }

  private async refreshToken(): Promise<void> {
    const response = await fetch('/api/csrf-token');
    const data = await response.json();
    this.token = data.token;
    this.expiresAt = new Date(data.expiresAt);
  }
}
```

### Apollo Client Integration

```typescript
// Include CSRF token in all GraphQL requests
const csrfLink = new ApolloLink((operation, forward) => {
  const token = await csrfTokenManager.getToken();
  operation.setContext({
    headers: {
      'X-CSRF-Token': token,
    },
  });
  return forward(operation);
});
```

## Testing Checklist

- [ ] CSRF token generated on first request
- [ ] Token returned in response header/endpoint
- [ ] Token validated on POST requests
- [ ] Token validated on PUT requests
- [ ] Token validated on DELETE requests
- [ ] Token validated on PATCH requests
- [ ] GET requests don't require token (idempotent)
- [ ] Invalid token returns 403
- [ ] Missing token returns 403
- [ ] Token refresh works
- [ ] Token expiration works
- [ ] Multiple concurrent requests work
- [ ] GraphQL requests include token
- [ ] REST requests include token

## Migration Strategy

1. **Phase 1:** Implement backend (no breaking changes)
2. **Phase 2:** Deploy backend, test manually
3. **Phase 3:** Update frontend to include tokens
4. **Phase 4:** Enable CSRF validation
5. **Phase 5:** Monitor for errors, adjust as needed

## Rollback Plan

If issues arise:
1. Set `SECURITY_ENABLE_CSRF=false` to disable
2. Frontend continues to work (just includes unused header)
3. No breaking changes to existing functionality

## Related Security Measures

- **CORS** - Already configured, prevents unauthorized origins
- **SameSite Cookies** - Already implemented, provides partial CSRF protection
- **Helmet** - Security headers already enabled
- **Rate Limiting** - Prevents abuse (already configured)

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Express CSRF Protection](https://expressjs.com/en/advanced/best-practice-security.html#use-csrf-protection)
- [Apollo Server CSRF Prevention](https://www.apollographql.com/docs/apollo-server/security/cors/#preventing-cross-site-request-forgery-csrf)

