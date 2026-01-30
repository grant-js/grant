---
title: Grant CLI
description: Setup, authentication, and typings generation with the grant CLI
---

# Grant CLI

The **Grant CLI** (`grant` / `@grantjs/cli`) configures API URL, authentication (session or API key), account/project selection, and generates project-scoped TypeScript typings for use with `@grantjs/server`.

## Installation

```bash
pnpm add -g @grantjs/cli
# or
npm install -g @grantjs/cli
```

## Commands

| Command                                        | Description                                                                                         |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `grant start` (alias: `grant setup`)           | Interactive setup: API URL, auth method, login, account/project, store config.                      |
| `grant generate-types`                         | Generate `ResourceSlug` and `ResourceAction` from the selected project’s resources and permissions. |
| `grant config path \| list \| show \| set ...` | Inspect or change stored config (profiles, API URL, scope, etc.).                                   |
| `grant version`                                | Show CLI version.                                                                                   |

All config-using commands support `-p, --profile <name>` to target a profile (default: default profile).

## Setup: `grant start`

1. **API URL** – Base URL of the Grant API (e.g. `https://api.grant.com` or `http://localhost:4000`).
2. **Auth method** – **Session** (browser login) or **API key** (clientId + secret).
3. **Session path**
   - **Email** – Prompt for email and password; CLI calls the login API and stores access + refresh tokens.
   - **GitHub** – CLI starts a temporary local HTTP server and opens the browser to the API’s GitHub OAuth URL with `redirect=http://localhost:<port>`. After sign-in, the API redirects back with a one-time code; the CLI exchanges it via `POST /api/auth/cli-callback` for tokens. Only `localhost` / `127.0.0.1` redirects are accepted for this flow.
4. **Account and project** – Choose account (personal vs organization), then organization (if applicable), then project. Stored as selected scope (e.g. `accountId:projectId` or `organizationId:projectId`).
5. **API key path** – Prompt for clientId, clientSecret, scope tenant (`accountProject` / `organizationProject`), and scope ID (e.g. `accountId:projectId`). Config stores these; token is obtained by exchange when needed (e.g. for `generate-types`).
6. **Output path for generate-types** – Optional default path for the generated typings file (e.g. `./grant-types.ts`).

Config is saved in the platform config directory (e.g. `~/.config/grant/config.json` on Linux/macOS). Multiple **profiles** are supported; one is the default.

## Generate types: `grant generate-types`

Uses the selected profile’s credentials and scope to:

1. Resolve an access token (session refresh or API key exchange).
2. Call the REST API for **resources** and **permissions** scoped to the selected project.
3. Emit a TypeScript file with `ResourceSlug` and `ResourceAction` constants and types derived from the project’s resources and permission actions.

Use `-o, --output <path>` to set the output file and `--dry-run` to print without writing. The generated file is intended for use with `@grantjs/server` guards so resource and action strings are type-checked against the project’s model.

## Config and profiles

- **`grant config path`** – Print path to the config file.
- **`grant config list`** – List profile names and default.
- **`grant config show [-p <profile>]`** – Show API URL, auth method, scope (no secrets).
- **`grant config set api-url \| auth-method \| credentials \| scope \| generate-types-output \| default-profile ...`** – Update a profile (use `-p <profile>` to target a profile).

See the [@grantjs/cli README](https://github.com/logusgraphics/grant/tree/main/packages/%40grantjs/cli) for full command and option details.
