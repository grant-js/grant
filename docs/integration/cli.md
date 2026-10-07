---
title: Grant CLI
description: Interactive setup, multi-profile configuration, and TypeScript type generation
---

# Grant CLI

The **Grant CLI** (`@grantjs/cli`) is the fastest way to connect your project to a Grant instance. It walks you through authentication, account/project selection, and stores everything in a local config file — ready for type generation and SDK usage.

## Installation

```bash
pnpm add -g @grantjs/cli
# or
npm install -g @grantjs/cli
```

## Commands

| Command                | Description                                             |
| ---------------------- | ------------------------------------------------------- |
| `grant start`          | Interactive setup wizard (API URL, auth, scope)         |
| `grant generate-types` | Generate TypeScript types from your project's resources |
| `grant config list`    | List all profiles                                       |
| `grant config show`    | Show current profile details                            |
| `grant config set ...` | Update profile settings                                 |
| `grant version`        | Show CLI version                                        |

All commands support **`-p, --profile <name>`** to target a specific profile.

## Interactive Setup: `grant start`

The `start` command walks you through connecting to a Grant instance. There are two authentication paths — **Session** (browser login) and **API key** (machine-to-machine).

### Session Authentication (Email)

```ansi
$ grant start

? Profile name: default
? Grant API base URL: http://localhost:4000
? Authentication method: Session (log in via browser)
? Sign-in method: Email
? Email: admin@example.com
? Password: ********

? Select account or organization:
  ❯ Personal account
    Acme Corp
    Startup Inc

? Select project:
    Internal Tools (internal-tools)
  ❯ My App (my-app)
    Staging (staging)

? Default output path for generate-types (optional, leave empty for ./grant-types.ts):
  ./src/grant-types.ts

Setup complete. Config saved to: /home/user/.config/grant/config.json
  Profile: default
  API URL: http://localhost:4000
  Auth: Session
  Scope tenant: organizationProject
  Scope id: 8a3b...c1d2:f4e5...a6b7
  Generate-types output: ./src/grant-types.ts
```

### Session Authentication (GitHub)

```ansi
$ grant start

? Profile name: default
? Grant API base URL: http://localhost:4000
? Authentication method: Session (log in via browser)
? Sign-in method: GitHub

Opening browser for GitHub sign-in…
```

The CLI opens your browser to complete GitHub OAuth. After sign-in, the browser shows **"Successfully signed in with GitHub. You can close this tab and return to the terminal."** and the CLI continues with account/project selection.

### API Key Authentication

Use this path for CI/CD pipelines, scripts, or any non-interactive environment.

::: warning Project-Level API Keys Required
The CLI requires a **project-level** API key — scoped to `accountProject` or `organizationProject`. These keys represent a service identity tied to a **role**, not a specific user.

This is different from a **user API key** (scoped to `accountProjectUser` or `organizationProjectUser`), which is tied to an individual user's permissions within a project. User API keys are created for personal access and inherit the user's roles; project-level keys are created for automation and carry their own role directly.

To create a project-level API key, see [Step 8 of the Integration Guide](/integration/guide#step-8-create-an-api-key) or use the Grant web dashboard under **Project > API Keys**.
:::

```ansi
$ grant start

? Profile name: ci
? Grant API base URL: https://grant.example.com
? Authentication method: API key (clientId + secret)
? API key client ID (UUID): 3f2a1b4c-5d6e-7f8a-9b0c-1d2e3f4a5b6c
? API key client secret: ********************************
? Scope tenant:
  ❯ Organization project (organizationId:projectId)
    Account project (accountId:projectId)
? Scope ID (e.g. organizationId:projectId): 8a3bc1d2-...:f4e5a6b7-...
? Default output path for generate-types (optional, leave empty for ./grant-types.ts):

Setup complete. Config saved to: /home/user/.config/grant/config.json
  Profile: ci
  API URL: https://grant.example.com
  Auth: API key
  Scope tenant: organizationProject
  Scope id: 8a3bc1d2-...:f4e5a6b7-...
  Generate-types output: ./grant-types.ts
```

## Profiles

::: tip Multi-Environment Workflow
Profiles let you store separate configurations for each environment — local development, staging, production, CI — in a single config file. Switch between them with `-p`:

```bash
grant generate-types              # uses default profile
grant generate-types -p staging   # uses staging profile
grant generate-types -p ci        # uses CI profile
```

:::

Run `grant start` multiple times with different profile names to set up each environment:

```bash
grant start                  # creates/updates "default" profile
grant start -p staging       # creates/updates "staging" profile
grant start -p production    # creates/updates "production" profile
```

### Managing Profiles

```ansi
$ grant config list

Config path: /home/user/.config/grant/config.json
Exists: true
Default profile: default
  - default (default)
  - staging
  - production
  - ci
```

```ansi
$ grant config show

Config path: /home/user/.config/grant/config.json
Exists: true
Profile: default
API URL: http://localhost:4000
Auth method: session
Selected scope: organizationProject:8a3bc1d2-...:f4e5a6b7-...
Generate-types output: ./src/grant-types.ts
```

```ansi
$ grant config show -p ci

Config path: /home/user/.config/grant/config.json
Exists: true
Profile: ci
API URL: https://grant.example.com
Auth method: api-key
Selected scope: organizationProject:8a3bc1d2-...:f4e5a6b7-...
Generate-types output: ./grant-types.ts
```

### Updating Settings

```bash
# Change the default profile
grant config set default-profile staging

# Update API URL for a profile
grant config set api-url https://new-api.example.com -p staging

# Update API key credentials
grant config set credentials \
  --client-id 3f2a1b4c-... \
  --client-secret "..." \
  --scope-tenant organizationProject \
  --scope-id "orgId:projectId" \
  -p ci

# Update selected scope
grant config set scope \
  --tenant organizationProject \
  --scope-id "orgId:projectId" \
  -p staging

# Update generate-types output path
grant config set generate-types-output ./src/types/grant.ts -p default
```

### Config File Structure

The config file is stored at `~/.config/grant/config.json` (Linux/macOS) or `%APPDATA%\grant\config.json` (Windows) with `0600` permissions (owner read/write only).

::: info Secrets Handling
Session tokens and API key secrets are stored in the config file. The file is created with restrictive permissions (`0600`). For CI/CD, prefer environment variables or secret managers over storing credentials on disk.
:::

```json
{
  "defaultProfile": "default",
  "profiles": {
    "default": {
      "apiUrl": "http://localhost:4000",
      "authMethod": "session",
      "session": {
        "token": "eyJhbG...",
        "refreshToken": "eyJhbG..."
      },
      "selectedScope": {
        "tenant": "organizationProject",
        "id": "8a3bc1d2-...:f4e5a6b7-..."
      },
      "generateTypesOutputPath": "./src/grant-types.ts"
    },
    "ci": {
      "apiUrl": "https://grant.example.com",
      "authMethod": "api-key",
      "apiKey": {
        "clientId": "3f2a1b4c-5d6e-7f8a-9b0c-1d2e3f4a5b6c",
        "clientSecret": "...",
        "scope": {
          "tenant": "organizationProject",
          "id": "8a3bc1d2-...:f4e5a6b7-..."
        }
      },
      "selectedScope": {
        "tenant": "organizationProject",
        "id": "8a3bc1d2-...:f4e5a6b7-..."
      }
    }
  }
}
```

## Generate Types: `grant generate-types`

Generates a TypeScript file with `ResourceSlug` and `ResourceAction` constants derived from your project's resources and permissions. Use these with `@grantjs/server` guards for compile-time safety.

```ansi
$ grant generate-types

✔ Resolved access token
✔ Fetched 3 resources and 12 permissions
✔ Written to ./src/grant-types.ts
```

The generated file looks like:

```typescript
// Auto-generated by @grantjs/cli — do not edit manually

export const ResourceSlug = {
  Document: 'document',
  User: 'user',
  Report: 'report',
} as const;

export type ResourceSlug = (typeof ResourceSlug)[keyof typeof ResourceSlug];

export const ResourceAction = {
  Create: 'Create',
  Read: 'Read',
  Update: 'Update',
  Delete: 'Delete',
  Query: 'Query',
} as const;

export type ResourceAction = (typeof ResourceAction)[keyof typeof ResourceAction];
```

### Options

| Flag                   | Description                                     |
| ---------------------- | ----------------------------------------------- |
| `-o, --output <path>`  | Override the output file path                   |
| `--dry-run`            | Print generated types to stdout without writing |
| `-p, --profile <name>` | Use a specific profile                          |

```bash
# Override output path
grant generate-types -o ./types/grant.ts

# Preview without writing
grant generate-types --dry-run

# Generate from staging profile
grant generate-types -p staging
```

::: tip Type-Safe Guards
After generating types, use them in your `@grantjs/server` guards to catch typos at compile time:

```typescript
import { ResourceSlug, ResourceAction } from './grant-types';
import { grant } from '@grantjs/server/express';

app.get(
  '/documents',
  grant(grantClient, {
    resource: ResourceSlug.Document,
    action: ResourceAction.Query,
  }),
  (req, res) => res.json({ data: [] })
);
```

:::

## Closed install and origin-verify

When the API requires `ORIGIN_VERIFY_SECRET` (`SECURITY_ORIGIN_VERIFY_REQUIRED=true`), it refuses requests that did not come through a trusted front. The CLI does **not** send `x-origin-verify`.

| You run Grant behind…      | Set **Grant API base URL** to…                     | Why                                                                                         |
| -------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Docker (Next is the front) | Public `APP_URL` (web origin, typically port 3000) | Next `proxy.ts` attaches the header. Do not use `http://host:4000`.                         |
| Kubernetes (Ingress → web) | `global.appUrl`                                    | Same as Docker.                                                                             |
| Kubernetes (split Ingress) | The Ingress host                                   | Ingress `proxy_set_header` / Traefik headers attach the secret.                             |
| AWS CloudFront             | `-c appUrl=` / `APP_URL`                           | CloudFront **origin custom headers** attach it. Never the API Function URL.                 |
| Local, gate off (default)  | `http://localhost:4000`                            | Empty `ORIGIN_VERIFY_SECRET` and `SECURITY_ORIGIN_VERIFY_REQUIRED=false` is a pass-through. |

```bash
grant start
# ? Grant API base URL: https://grant.example.com

grant config set api-url https://grant.example.com -p production
```

Direct `curl` against the API origin must send the header (`-H "x-origin-verify: $ORIGIN_VERIFY_SECRET"`). Direct `curl` against the web origin must not — the front attaches it. The secret must never appear as `NEXT_PUBLIC_*`. `SECURITY_API_KEY` is unused and is not this gate.

See [Configuration](/getting-started/configuration#closed-install-public-signup-and-origin-verify), [Docker](/deployment/docker#closed-install-origin-verify-and-public-signup), [Kubernetes](/deployment/kubernetes#closed-install-origin-verify-and-public-signup), [AWS](/deployment/aws-serverless#security-model).

---

**Related:**

- [Integration Guide](/integration/guide) — End-to-end tutorial from resource creation to guarded endpoints
- [Server SDK](/integration/server-sdk) — Express, Fastify, NestJS, Next.js middleware
- [API Keys](/core-concepts/api-keys) — Token exchange and scoping details
