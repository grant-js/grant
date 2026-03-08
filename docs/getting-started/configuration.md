---
title: Configuration
description: Configure Grant with the Config app and environment variables
---

# Configuration

Grant is configured via environment variables. The **Config app** is the recommended way to view and edit them; it writes to the same `.env` files (root, API, database) and groups variables by category.

## Config app

If you already started development with `pnpm dev`, the Config app is already running at [http://localhost:3005](http://localhost:3005).

If you only want the Config app, start it from the repo root:

```bash
pnpm --filter grant-config dev
```

Then open [http://localhost:3005](http://localhost:3005).

- **Sidebar:** Categories (Docker, App, Database, Cache, Auth, GitHub OAuth, Security, Web, Optional) with set/missing status. Hamburger menu on small screens.
- **Content:** Variables for the selected category in collapsible sections. Critical settings first; optional sections collapsed by default. Edit in place, generate passwords, sync shared vars (e.g. `DB_URL`) to the right files.

<div class="config-app-screenshots">
  <figure class="config-app-fig config-app-light">
    <img src="./config-app-light.png" alt="Config app — light theme" />
    <figcaption>Config app — light theme</figcaption>
  </figure>
  <figure class="config-app-fig config-app-dark">
    <img src="./config-app-dark.png" alt="Config app — dark theme" />
    <figcaption>Config app — dark theme</figcaption>
  </figure>
</div>

::: tip
Env files are created automatically when you run `pnpm dev` (predev script). To create or refresh without starting the app: `pnpm env:setup`. You can also edit `.env` files directly.
:::

## What to set

| Priority     | Variable                | Purpose                            |
| ------------ | ----------------------- | ---------------------------------- |
| **Required** | `DB_URL`                | PostgreSQL connection string       |
| **Required** | `SECURITY_FRONTEND_URL` | Frontend URL for CORS (production) |
| Common       | `APP_URL`               | API base URL (JWT issuer)          |
| Common       | `CACHE_STRATEGY`        | `memory` or `redis`                |

Full list, descriptions, and defaults: **`apps/api/.env.example`**. Variables use prefixes (`DB_*`, `JWT_*`, `SECURITY_*`, etc.) for grouping.

## Using config in code

The API reads env via a centralized, type-safe config:

```typescript
import { config } from '@/config';

config.app.port; // number
config.db.url; // string
config.cache.strategy; // 'memory' | 'redis'
```

Implementation: `apps/api/src/config/env.config.ts`. Validated on startup; invalid config throws before the server listens.

## Troubleshooting

| Issue                       | Check                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| Env not loading             | `.env` in `apps/api/`, restart server                                                         |
| Validation error on startup | Message names the variable; fix in Config app or `.env`                                       |
| Redis unreachable           | `CACHE_STRATEGY=redis` → verify Redis running, `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` |
| CORS errors                 | Set `SECURITY_FRONTEND_URL` (and `SECURITY_ADDITIONAL_ORIGINS` if needed)                     |

## Related

- [Quick Start](/getting-started/quick-start) — Get running locally
- [Docker Deployment](/deployment/docker) — Infrastructure and env
- [Security](/architecture/security) — Auth, CORS, GitHub OAuth
- [Caching](/advanced-topics/caching) — Cache strategy and Redis

---

**Next:** [Integration Guide](/integration/guide) to protect your API with Grant.
