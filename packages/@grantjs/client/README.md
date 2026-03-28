# @grantjs/client

Browser SDK for Grant authorization platform. Provides a lightweight client for permission checks with React hooks and components for conditional UI rendering.

**Documentation:** [Client SDK](https://github.com/grant-js/grant/blob/main/docs/integration/client-sdk.md) in the official docs.

## Features

- **REST-based API** - Uses native `fetch`, no GraphQL client required
- **Automatic token refresh** - Handles 401 errors with token refresh and retry
- **Built-in caching** - Configurable TTL-based cache to minimize API calls
- **Multi-tenant support** - Dynamic scope switching for session tokens
- **React integration** - Hooks and components for declarative permission checks
- **TypeScript** - Full type safety with types from `@grantjs/schema`

## Installation

```bash
npm install @grantjs/client
# or
pnpm add @grantjs/client
# or
yarn add @grantjs/client
```

## Quick Start

### 1. Create the Client

```typescript
import { GrantClient } from '@grantjs/client';

const grant = new GrantClient({
  apiUrl: 'https://api.your-app.com',

  getAccessToken: () => localStorage.getItem('accessToken'),

  // Cookie-based refresh: your callback calls POST /api/auth/refresh with credentials: 'include',
  // then updates app token storage. Refresh token is in HttpOnly cookie; response body has only accessToken.
  onRefreshWithCredentials: async () => {
    const res = await fetch('https://api.your-app.com/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const { data } = await res.json();
    if (data?.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      return true;
    }
    return false;
  },

  onTokenRefresh: (tokens) => {
    localStorage.setItem('accessToken', tokens.accessToken);
    // tokens.refreshToken may be undefined when using cookie-based refresh
  },

  onUnauthorized: () => {
    window.location.href = '/login';
  },
});

// Check permission
const canEdit = await grant.can('Document', 'Update');
```

### 2. React Setup

Wrap your app with `GrantProvider` and integrate with your auth store:

```tsx
'use client';

import { useMemo } from 'react';
import { GrantProvider, type GrantClientConfig } from '@grantjs/client/react';
import { useAuthStore } from '@/stores/auth.store';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const config = useMemo<GrantClientConfig>(
    () => ({
      apiUrl: process.env.NEXT_PUBLIC_API_URL!,

      getAccessToken: () => useAuthStore.getState().accessToken,

      // Cookie-based refresh: POST /api/auth/refresh with credentials: 'include', then update store
      onRefreshWithCredentials: async () => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) return false;
        const { data } = await res.json();
        if (data?.accessToken) {
          useAuthStore.getState().setAccessToken(data.accessToken);
          return true;
        }
        return false;
      },

      onTokenRefresh: (tokens) => {
        useAuthStore.getState().setAccessToken(tokens.accessToken);
      },

      onUnauthorized: () => {
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
      },

      cache: {
        ttl: 5 * 60 * 1000, // 5 minutes
        prefix: 'grant',
      },
    }),
    []
  );

  return <GrantProvider config={config}>{children}</GrantProvider>;
}
```

### 3. Use useGrant with Scopes

For multi-tenant apps, pass the scope to check permissions in a specific context:

```tsx
'use client';

import { useGrant } from '@grantjs/client/react';
import { Tenant } from '@grantjs/schema';

interface OrganizationActionsProps {
  organization: { id: string; name: string };
}

export function OrganizationActions({ organization }: OrganizationActionsProps) {
  // Scope permissions to this specific organization
  const scope = { tenant: Tenant.Organization, id: organization.id };

  // Check permissions - these call POST /api/auth/is-authorized
  const canUpdate = useGrant('Organization', 'Update', { scope });
  const canDelete = useGrant('Organization', 'Delete', { scope });

  // Hide component entirely if user has no permissions
  if (!canUpdate && !canDelete) {
    return null;
  }

  return (
    <div>
      {canUpdate && <button>Edit</button>}
      {canDelete && <button>Delete</button>}
    </div>
  );
}
```

### 4. Use Components

```tsx
import { GrantGate } from '@grantjs/client/react';
import { Tenant } from '@grantjs/schema';

function Dashboard({ projectId }: { projectId: string }) {
  const scope = { tenant: Tenant.Organization, id: projectId };

  return (
    <div>
      {/* Hide if no permission */}
      <GrantGate resource="Analytics" action="Read" scope={scope}>
        <AnalyticsWidget />
      </GrantGate>

      {/* Show fallback if denied */}
      <GrantGate
        resource="Settings"
        action="Update"
        scope={scope}
        fallback={<p>Contact admin for access</p>}
      >
        <SettingsPanel />
      </GrantGate>

      {/* With loading state */}
      <GrantGate resource="Report" action="Create" scope={scope} loading={<Spinner />}>
        <ExportButton />
      </GrantGate>
    </div>
  );
}
```

## API Reference

### GrantClient

```typescript
const grant = new GrantClient(config: GrantClientConfig);
```

#### Configuration

```typescript
interface GrantClientConfig {
  apiUrl: string;

  getAccessToken?: () => string | null | Promise<string | null>;
  /** Called after cookie-based refresh; use to update app token storage. `tokens.refreshToken` may be undefined. */
  onTokenRefresh?: (tokens: AuthTokens) => void | Promise<void>;
  onUnauthorized?: () => void;
  /** Cookie-based refresh on 401: call POST /api/auth/refresh with credentials: 'include', update token, return true on success. */
  onRefreshWithCredentials?: () => Promise<boolean>;

  fetch?: typeof fetch;
  credentials?: RequestCredentials; // default: 'include'
  cache?: { ttl?: number; prefix?: string };
}
```

#### Methods

```typescript
// Permission checks
grant.can(resource, action, options?): Promise<boolean>
grant.hasPermission(resource, action, options?): Promise<boolean>  // Alias
grant.isAuthorized(resource, action, options?): Promise<AuthorizationResult>

// Cache management
grant.clearCache(): void
grant.clearScopeCache(scope?): void
```

### React Hooks

#### `useGrant(resource, action, options?)`

Returns a boolean by default, or an object with `isGranted` and `isLoading` when `returnLoading: true`.

**Default (boolean):**

```tsx
import { useGrant } from '@grantjs/client/react';
import { Tenant } from '@grantjs/schema';

const canEdit = useGrant('Document', 'Update', {
  scope: { tenant: Tenant.Organization, id: orgId },
});

return <div>{canEdit && <EditButton />}</div>;
```

**With loading state:**

```tsx
const { isGranted, isLoading } = useGrant('Document', 'Update', {
  scope: { tenant: Tenant.Organization, id: orgId },
  returnLoading: true,
});

if (isLoading) return <Spinner />;
if (!isGranted) return null;

return <EditButton />;
```

#### Hook Options

```typescript
interface UseGrantOptions {
  scope?: Scope; // Multi-tenant scope override
  enabled?: boolean; // Skip check if false (default: true)
  useCache?: boolean; // Use cached result (default: true)
  returnLoading?: boolean; // Return object with isGranted and isLoading (default: false)
}

interface UseGrantResult {
  isGranted: boolean; // Whether the user is granted permission
  isLoading: boolean; // Whether the permission check is loading
}
```

### React Components

#### `<GrantGate>`

```tsx
<GrantGate
  resource="Resource"
  action="Action"
  scope={{ tenant: Tenant.Organization, id: '...' }} // Optional
  fallback={<FallbackComponent />} // Optional
  loading={<LoadingSpinner />} // Optional
>
  <ProtectedContent />
</GrantGate>
```

## Multi-Tenant Scope Override

The Grant platform supports multi-tenant authorization with dynamic scope switching:

- **Session tokens**: Can override scope at request time (for users switching between organizations)
- **API key tokens**: Use their embedded scope (cannot be overridden)

```tsx
import { useGrant } from '@grantjs/client/react';
import { Tenant } from '@grantjs/schema';

// User is viewing Organization A
const scopeA = { tenant: Tenant.Organization, id: 'org-a-id' };
const canEditA = useGrant('Project', 'Update', { scope: scopeA });

// User switches to Organization B
const scopeB = { tenant: Tenant.Organization, id: 'org-b-id' };
const canEditB = useGrant('Project', 'Update', { scope: scopeB });
```

Available tenant types (from `@grantjs/schema`):

```typescript
enum Tenant {
  System = 'system',
  Account = 'account',
  Organization = 'organization',
  AccountProject = 'accountProject',
  OrganizationProject = 'organizationProject',
  ProjectUser = 'projectUser',
  // ... and more
}
```

## Caching

The client caches permission results by default (5 minute TTL). You can:

```typescript
// Configure TTL
const grant = new GrantClient({
  apiUrl: '...',
  cache: { ttl: 10 * 60 * 1000 }, // 10 minutes
});

// Bypass cache for a specific check
const fresh = await grant.can('Resource', 'Action', { useCache: false });

// Clear all cache
grant.clearCache();

// Clear cache for a specific scope
grant.clearScopeCache({ tenant: Tenant.Organization, id: orgId });
```

## Authentication Flow

1. **Access token** is sent via `Authorization: Bearer <token>` (when `getAccessToken` is provided).
2. **Cookies** are included by default (`credentials: 'include'`).
3. On **401**, the client uses **cookie-based refresh only** (no body-based refresh for security):
   - If `onRefreshWithCredentials` is set, it is called. Your callback should call `POST /api/auth/refresh` with `credentials: 'include'`, read the new `accessToken` from the response body, update your storage, and return `true` on success.
   - On success the client retries the original request; you may also use `onTokenRefresh` to sync token state.
   - On failure or if `onRefreshWithCredentials` is not set, `onUnauthorized()` is called (e.g. redirect to login).
   - The refresh token lives in an HttpOnly cookie; the API returns only `accessToken` in the refresh response body.

## Development Notes

### React Strict Mode

In development with React Strict Mode enabled (default in Next.js 13+), you'll see **2 API calls** per permission check. This is expected behavior:

1. Component mounts → effect runs → API call #1
2. Strict Mode unmounts component
3. Component remounts → effect runs → API call #2

This only happens in development. Production builds make a single call.

### Stable Scope References

The hooks automatically handle scope object reference changes. You don't need to memoize the scope object:

```tsx
// This is fine - hooks compare by value, not reference
const scope = { tenant: Tenant.Organization, id: organization.id };
const canEdit = useGrant('Resource', 'Action', { scope });
```

## TypeScript

Full type definitions are included. Import types from the package or re-exported from `@grantjs/schema`:

```typescript
import type {
  GrantClientConfig,
  AuthorizationResult,
  Permission,
  Resource,
  Scope,
  Tenant,
} from '@grantjs/client';

// Or import Tenant enum directly from schema
import { Tenant } from '@grantjs/schema';
```

## Contributing

Contributions are welcome! Please see the [main repository](https://github.com/grant-js/grant) for contribution guidelines.

## Support

- **Documentation**: See the [main Grant documentation](https://github.com/grant-js/grant)
- **Issues**: Report bugs or request features on [GitHub Issues](https://github.com/grant-js/grant/issues)
- **Product & account help**: [support@grant.center](mailto:support@grant.center)
- **Security vulnerabilities**: Follow [SECURITY](https://github.com/grant-js/grant/blob/main/SECURITY.md) (reach **engineering@grant.center**)

## License

MIT
