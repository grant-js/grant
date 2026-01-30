# @grantjs/cli

Grant CLI for setup, authentication, profiles, and typings generation.

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
| `grant generate-types`        | Generate project-scoped `ResourceSlug` and `ResourceAction` TypeScript (uses selected profile) |
| `grant config path`           | Print path to the config file                                                                  |
| `grant config list`           | List profiles and which is default                                                             |
| `grant config show`           | Show config summary for a profile (no secrets)                                                 |
| `grant config set <key>`      | Set a config value for a profile (see below)                                                   |

All commands that use config accept **`-p, --profile <name>`** to target a profile (default: the configured default profile).

---

## Setup: `grant start`

Interactive flow:

1. **Grant API base URL** – Default: `http://localhost:4000` (or existing value).
2. **Authentication method** – Session (browser) or API key. Session is not yet implemented; use API key.
3. **Profile name** – Name for this config (e.g. `default`, `staging`). Override with `--profile <name>` to skip the prompt.
4. **API key** – Client ID (UUID), client secret (min 32 chars), scope tenant (`accountProject` / `organizationProject`), scope ID (e.g. `accountId:projectId` or `organizationId:projectId`).
5. **Default output for generate-types** – Optional path (e.g. `./src/grant-types.ts`). Leave empty for `./grant-types.ts`.

Config is saved to the platform config dir (e.g. `~/.config/grant/config.json` on Linux/macOS). The first profile created becomes the default; change it with `grant config set default-profile <name>`.

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

**Tests:**

```bash
pnpm --filter @grantjs/cli test
pnpm --filter @grantjs/cli test:watch
```

---

## Implementation plan

See [Grant CLI/TUI Implementation Plan](../../../docs/implementation-plans/grant-cli-tui.md).
