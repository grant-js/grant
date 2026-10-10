# @grantjs/cli

Grant CLI for profiles, REST API access, and typings generation. Agents and scripts should use `grant api` or `grant <resource> <verb>` with `--output json` (or `GRANT_*` environment variables).

## Install

```bash
pnpm add -g @grantjs/cli
# or
npm install -g @grantjs/cli
```

## Commands overview

| Command                       | Description                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `grant version`               | Show CLI version (`-j, --json` for JSON)                                                       |
| `grant help` / `grant --help` | Show help                                                                                      |
| `grant start`                 | Interactive setup (API URL, auth, profile, scope); alias: `grant setup`                        |
| `grant whoami`                | Show the authenticated caller (`GET /api/me`)                                                  |
| `grant api <method> <path>`   | Call any REST path with the resolved profile                                                   |
| `grant <resource> <verb>`     | Named REST commands from OpenAPI (e.g. `grant users list`)                                     |
| `grant generate-types`        | Generate project-scoped `ResourceSlug` and `ResourceAction` TypeScript (uses selected profile) |
| `grant config path`           | Print path to the config file                                                                  |
| `grant config list`           | List profiles and which is default                                                             |
| `grant config show`           | Show config summary for a profile (no secrets)                                                 |
| `grant config set <key>`      | Set a config value for a profile (see below)                                                   |

All commands that use config accept **`-p, --profile <name>`** (or `GRANT_PROFILE`). API commands also accept `--output json|text` (JSON when stdout is not a TTY).

Environment: `GRANT_API_URL`, `GRANT_ACCESS_TOKEN`, `GRANT_CLIENT_ID`, `GRANT_CLIENT_SECRET`, `GRANT_SCOPE_TENANT`, `GRANT_SCOPE_ID`, `GRANT_ORIGIN_VERIFY`. Flags win over env, env over the profile file.

```bash
export GRANT_PROFILE=ci
grant whoami --output json
grant users list --output json
grant api post /api/roles --body '{"name":"Reviewer"}'
```

---

## Setup: `grant start`

Interactive flow:

1. **Grant API base URL** – Default: `http://localhost:4000` (or existing value).
2. **Authentication method** – **Session** (browser login) or **API key**.
3. **Profile name** – Name for this config (e.g. `default`, `staging`). Override with `--profile <name>` to skip the prompt.
4. **Session flow** – Sign in with **Email** (email + password) or **GitHub** (browser OAuth). Then choose account → organization (if applicable) → project.
5. **API key flow** – Client ID (UUID), client secret (min 32 chars), scope tenant (`accountProject` / `organizationProject`), scope ID (e.g. `accountId:projectId` or `organizationId:projectId`).
6. **Default output for generate-types** – Optional path (e.g. `./src/grant-types.ts`). Leave empty for `./grant-types.ts`.

Config is saved to the platform config dir (e.g. `~/.config/grant/config.json` on Linux/macOS). The first profile created becomes the default; change it with `grant config set default-profile <name>`.

### Session authentication

- **Email** – You are prompted for email and password; the CLI calls the Grant API login endpoint and stores the returned access and refresh tokens.
- **GitHub** – The CLI starts a temporary local HTTP server and opens your browser to the Grant API’s GitHub OAuth URL with a `redirect` to `http://localhost:<port>`. After you sign in with GitHub, the API redirects back to that URL with a one-time code. The CLI exchanges the code for access and refresh tokens via `POST /api/auth/cli-callback`. No tokens are sent in the URL; the code is single-use and short-lived (e.g. 60 seconds). The API only accepts `localhost` (or `127.0.0.1`) as the redirect for this flow.

**Examples:**

```bash
grant start
grant start --profile staging
```

---

## Generate types: `grant generate-types`

Loads the selected profile, exchanges API key for a token if needed, fetches resources and permissions for the project scope, and writes a TypeScript file with `ResourceSlug` and `ResourceAction` constants.

- **`-o, --output <path>`** – Output file (default: profile’s `generateTypesOutputPath` or `./grant-types.ts`).
- **`--dry-run`** – Print what would be generated without writing.
- **`-p, --profile <name>`** – Profile to use (default: default profile).

**Examples:**

```bash
grant generate-types
grant generate-types --profile staging -o ./src/grant-types.ts
grant generate-types --dry-run
```

---

## Config: `grant config`

### `grant config path`

Prints the path to the config file (no profile).

### `grant config list`

Lists profile names and marks the default.

### `grant config show`

Shows config summary for a profile (API URL, auth method, scope, generate-types output; no secrets).

- **`-p, --profile <name>`** – Profile to show (default: default profile).

### `grant config set`

Set a value for a profile. Use **`-p, --profile <name>`** to target a profile (default: default profile).

| Subcommand                                          | Description                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| `grant config set api-url <url>`                    | Set Grant API base URL (e.g. `http://localhost:4000`)               |
| `grant config set auth-method <session \| api-key>` | Set authentication method                                           |
| `grant config set credentials`                      | Set API key and scope (see options below)                           |
| `grant config set scope`                            | Set selected project scope only                                     |
| `grant config set generate-types-output <path>`     | Set default output path for `grant generate-types` (empty to clear) |
| `grant config set origin-verify [secret]`           | Set `x-origin-verify` when `apiUrl` is the raw API origin           |
| `grant config set default-profile <name>`           | Set which profile is used when `--profile` is omitted               |

**Credentials options** (all required for `credentials`):

- `--client-id <id>` – API key client ID (UUID)
- `--client-secret <secret>` – API key client secret (min 32 characters)
- `--scope-tenant <tenant>` – `accountProject` or `organizationProject`
- `--scope-id <id>` – e.g. `accountId:projectId` or `organizationId:projectId`

**Scope options** (for `scope`):

- `--tenant <tenant>` – `accountProject` or `organizationProject`
- `--scope-id <id>` – Scope ID string

**Examples:**

```bash
grant config set api-url http://localhost:4000
grant config set api-url http://localhost:4000 --profile staging
grant config set credentials --client-id <uuid> --client-secret <secret> --scope-tenant organizationProject --scope-id <orgId>:<projectId>
grant config set scope --tenant organizationProject --scope-id <orgId>:<projectId>
grant config set generate-types-output ./src/grant-types.ts
grant config set default-profile staging
```

---

## Development (from monorepo)

```bash
pnpm --filter @grantjs/cli run build
node packages/@grantjs/cli/dist/index.mjs version
# or link globally: from packages/@grantjs/cli run pnpm link --global
```

**Interactive TUI:** Run `grant start` (and any prompts) in a real terminal so the process has a TTY. Running via IDE "Run" or in CI often has no stdin and prompts will not work.

**Documentation:** [Grant CLI](https://github.com/grant-js/grant/blob/main/docs/integration/cli.md) in the official docs.

**Publishing:** See [RELEASE.md](./RELEASE.md) for versioning and npm publish (Changesets).

**Tests:**

```bash
pnpm --filter @grantjs/cli test
pnpm --filter @grantjs/cli test:watch
```

---
