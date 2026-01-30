---
title: Client SDK (@grantjs/client)
description: Permission-based UI rendering in the browser with React hooks and components
---

# Client SDK (@grantjs/client)

`@grantjs/client` is the browser SDK for Grant. It calls the Grant API over REST (no GraphQL client) and provides React hooks and components so you can conditionally render UI based on permissions.

## What the package provides

**Entry points:**

- **`@grantjs/client`** – Core: `GrantClient` class and types (`GrantClientConfig`, `AuthTokens`, `Scope`, etc.).
- **`@grantjs/client/react`** – React: `GrantProvider`, `useGrantClient`, `useGrantClientOptional`, `useGrant`, `<GrantGate>`, and the same types.

**React surface:**

| Export                                 | Purpose                                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------- |
| `GrantProvider`                        | Wraps the app; accepts `config` (or `client`) so children can use hooks and GrantGate.  |
| `useGrantClient()`                     | Returns the `GrantClient` instance; throws if used outside `GrantProvider`.             |
| `useGrantClientOptional()`             | Returns the client or `null` if outside `GrantProvider`.                                |
| `useGrant(resource, action, options?)` | Returns a boolean by default, or `{ isGranted, isLoading }` when `returnLoading: true`. |
| `<GrantGate>`                          | Renders `children` when permitted, `fallback` when denied, or `loading` while checking. |

**GrantClient (imperative):** `can()`, `hasPermission()`, `isAuthorized()`, `clearCache()`, `clearScopeCache()`.

## Features

- **REST-based** – Uses `fetch`; no GraphQL client required.
- **Token handling** – Optional token refresh on 401 with retry; callbacks for refresh and unauthorized.
- **Caching** – Configurable TTL-based cache to reduce API calls.
- **Multi-tenant** – Pass a `scope` (e.g. organization or project) to check permissions in that context.
- **TypeScript** – Types from `@grantjs/schema`.

## Installation

```bash
pnpm add @grantjs/client
# or
npm install @grantjs/client
```

**Peer dependencies:** React 18 or 19.

## Quick setup (React)

1. **Wrap the app** with `GrantProvider` and pass config (API URL, token getters, refresh/unauthorized callbacks, optional cache).

2. **Use the `useGrant` hook** to check permissions and render conditionally:

```tsx
import { useGrant } from '@grantjs/client/react';
import { Tenant } from '@grantjs/schema';

function OrganizationActions({ organization }: { organization: { id: string } }) {
  const scope = { tenant: Tenant.Organization, id: organization.id };
  const canUpdate = useGrant('Organization', 'Update', { scope });
  const canDelete = useGrant('Organization', 'Delete', { scope });

  if (!canUpdate && !canDelete) return null;
  return (
    <div>
      {canUpdate && <button>Edit</button>}
      {canDelete && <button>Delete</button>}
    </div>
  );
}
```

For loading states, use `returnLoading: true` to get `{ isGranted, isLoading }`:

```tsx
const { isGranted, isLoading } = useGrant('Document', 'Update', {
  scope: { tenant: Tenant.Organization, id: orgId },
  returnLoading: true,
});
if (isLoading) return <Spinner />;
if (!isGranted) return null;
return <EditButton />;
```

3. **Or use `<GrantGate>`** to wrap content that should only show when the user has permission (see [GrantGate](#grantgate) below).

---

## useGrant

**Signature:** `useGrant(resource, action, options?)`

- **Returns:** By default a `boolean` (permission granted or not; `false` while loading). With `returnLoading: true`, returns `{ isGranted: boolean, isLoading: boolean }`.
- **Options:** `scope?`, `enabled?` (default `true`), `useCache?` (default `true`), `returnLoading?` (default `false`).

Use `scope` for multi-tenant apps so the check is evaluated in that context (e.g. a specific organization or project).

---

## GrantGate

`<GrantGate>` conditionally renders content based on a permission check. It uses `useGrant` internally and supports the same options plus `fallback` and `loading`.

**Props:**

| Prop       | Type          | Required | Description                                                                                          |
| ---------- | ------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `resource` | string        | Yes      | Resource slug (e.g. `"Organization"`, `"Document"`).                                                 |
| `action`   | string        | Yes      | Action to check (e.g. `"Update"`, `"Read"`).                                                         |
| `children` | ReactNode     | Yes      | Rendered when the user has the permission.                                                           |
| `scope`    | Scope \| null | No       | Tenant + id for multi-tenant; omit for default scope.                                                |
| `enabled`  | boolean       | No       | If `false`, skips the check (default `true`).                                                        |
| `useCache` | boolean       | No       | Use cached result (default `true`).                                                                  |
| `fallback` | ReactNode     | No       | Rendered when permission is denied (default: render nothing).                                        |
| `loading`  | ReactNode     | No       | Rendered while the permission check is in progress. If not provided, nothing is shown while loading. |

**Behavior:**

- If `loading` is provided and the check is pending → render `loading`.
- If the user has the permission → render `children`.
- Otherwise → render `fallback`.

**Examples:**

```tsx
import { GrantGate } from '@grantjs/client/react';
import { Tenant } from '@grantjs/schema';

// Basic – hide content when no permission
<GrantGate resource="Document" action="Update">
  <EditButton />
</GrantGate>

// With fallback when denied
<GrantGate
  resource="Settings"
  action="Update"
  fallback={<p>You don’t have access to settings.</p>}
>
  <SettingsPanel />
</GrantGate>

// With loading state
<GrantGate
  resource="Report"
  action="Create"
  loading={<Spinner />}
  fallback={<AccessDenied />}
>
  <ExportButton />
</GrantGate>

// With scope (multi-tenant)
<GrantGate
  resource="Project"
  action="Delete"
  scope={{ tenant: Tenant.Organization, id: projectId }}
  fallback={null}
>
  <DeleteProjectButton />
</GrantGate>
```

---

## GrantProvider and useGrantClient

- **`GrantProvider`** – Wrap your app (or a subtree). Pass either `config: GrantClientConfig` or a pre-built `client: GrantClient`. All hooks and `<GrantGate>` must be used inside a `GrantProvider`.
- **`useGrantClient()`** – Returns the `GrantClient` for the current context. Use it when you need the client directly (e.g. `await grant.can('Resource', 'Action')` or `grant.clearCache()`). Throws if used outside `GrantProvider`.
- **`useGrantClientOptional()`** – Same as `useGrantClient()` but returns `null` instead of throwing when outside `GrantProvider`.

---

## API

Permission checks call `POST /api/auth/is-authorized` with the current token. The client uses `getAccessToken()` (and optionally `getRefreshToken()`) from config; on 401 it can attempt refresh and retry, then call `onTokenRefresh` or `onUnauthorized` as configured.

See the [@grantjs/client README](https://github.com/logusgraphics/grant/tree/main/packages/%40grantjs/client) for full `GrantClientConfig`, `GrantClient` methods, and more examples.

## Documentation

- **Package README:** [@grantjs/client](https://github.com/logusgraphics/grant/tree/main/packages/%40grantjs/client) – Installation, React setup, useGrant, GrantGate, API reference.
- **REST API:** [REST API](/api-reference/rest-api) – Auth and `is-authorized` endpoint.
- **RBAC/ACL:** [RBAC/ACL](/architecture/rbac-acl) – Resources and actions used in permission checks.
