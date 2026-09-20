---
title: Project OAuth
description: Hosted sign-in for project apps, consent, branding, and social connections
---

# Project OAuth

Projects can register **OAuth apps** (ProjectApp) so a tenant product can send users through Grant’s hosted sign-in and consent pages, then receive a project-scoped JWT. The security model — global user resolution, project membership, token claims — is in [Project OAuth](/architecture/security#project-oauth). This page covers the hosted UI, branding, and how social providers are configured.

## Hosted pages

| Page      | Route                   | Purpose                                                                 |
| --------- | ----------------------- | ----------------------------------------------------------------------- |
| Sign-in   | `/auth/project`         | Choose a provider (GitHub, Google, email) and see requested permissions |
| Email     | `/auth/project/email`   | Request a magic-link when email is enabled                              |
| Authorize | `/auth/project/consent` | Confirm the signed-in account and allow or deny access                  |

Grant’s header stays visible. The client brand is the page subject: app mark, title, and theme. Use **Test OAuth** on the app to check the live pages.

Public metadata for those pages comes from unauthenticated REST:

- `GET /api/auth/project/app-info`
- `GET /api/auth/project/consent-info`

Both return **resolved** branding only. They never expose storage keys, inherit-from-project flags, organization logos, or OAuth client secrets.

## Social connections (GitHub and Google)

Project apps can offer GitHub and Google sign-in. Unlike platform Grant login (which uses env vars — see [Sign-in providers](/core-concepts/sign-in-providers)), **social credentials for project apps are configured per Grant project** as **OAuth connections**.

| Concept              | Where it lives                                                               | Purpose                                                                  |
| -------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **OAuth connection** | Project settings → **OAuth connections**                                     | Customer’s GitHub or Google client id + secret for this project          |
| **ProjectApp**       | App → OAuth card                                                             | Customer product `redirect_uris`, `enabledProviders`, scopes             |
| **Broker callback**  | Grant API env (`GITHUB_PROJECT_CALLBACK_URL`, `GOOGLE_PROJECT_CALLBACK_URL`) | The **only** redirect URI registered on the customer’s GitHub/Google app |

One connection per provider per project. All apps in that project share the same GitHub/Google client. Each app’s **enabled providers** list still controls which methods that app offers.

Email magic-link does **not** use a connection row; it is always available when enabled on the app.

### Operator setup (BYO)

1. Open the project **OAuth connections** page (`…/projects/{projectId}/oauth-connections`).
2. For GitHub or Google, enter the **client id** and **client secret** from the customer’s OAuth app.
3. Copy the **Grant callback URL** shown on that page and register it on the customer’s provider app:
   - Default: `{APP_URL}/api/auth/project/callback` (exact match for Google; GitHub accepts `{APP_URL}/api/auth` as a prefix — see [Security](/architecture/security#configuring-social-oauth-for-project-apps)).
4. On the **ProjectApp** OAuth card, ensure the provider is in **enabled providers**.
5. Set `PROJECT_OAUTH_CONNECTION_ENCRYPTION_KEY` on the API so BYO secrets can be stored (see [Configuration](/getting-started/configuration)).

Secrets are write-only: the API never returns them after save. Rotating a secret requires a new upsert.

### Platform fallback (migration)

When a project has **no** BYO connection for a provider, project OAuth **may** fall back to the platform `GITHUB_*` / `GOOGLE_*` env credentials (same behavior as before this feature). Set `PROJECT_OAUTH_REQUIRE_BYO_SOCIAL=true` to disable fallback so project apps must have BYO connections for social sign-in. Default: `false`.

Hosted sign-in shows a social button only when the provider is **configured** for the project **and** enabled on the app:

```
visible = configuredProviders ∩ enabledProviders
```

`configuredProviders` comes from `app-info` (project connections + fallback policy). Hosted pages do **not** call `GET /api/auth/providers` (that endpoint is for platform login only).

## Branding

Project owners set a default logo and OAuth theme on the project **Branding** page (`…/projects/{projectId}/branding`). Each app can override those values on its **Branding** card.

| Field           | Project         | Project app                                 | Resolved default                                 |
| --------------- | --------------- | ------------------------------------------- | ------------------------------------------------ |
| Picture         | Logo / initials | Override or inherit                         | App → project → initials                         |
| `primaryColor`  | `#RRGGBB`       | Override or inherit                         | App → project → Grant blue                       |
| `showHelpPanel` | On / off        | App sets the value used on hosted pages     | App → project → on                               |
| `themeMode`     | —               | `light` / `dark` / `system` / Grant default | App only; `null` keeps the visitor’s Grant theme |

Organization logos are **not** in the fallback.

Pictures are upload-only. Update inputs do not accept `pictureUrl`. Anyone with **Update** on Project or ProjectApp may upload, clear, or change theme. Storage keys:

- `projects/{projectId}/picture.{ext}`
- `project-apps/{projectAppId}/picture.{ext}`

See [File storage](/advanced-topics/file-storage).

## Consent identity

The authorize page shows who is consenting and **which provider** they used for this sign-in (GitHub, Google, or email). That value is stored on the consent token for this login; it is not inferred from every method on the account.

Long permission lists show the first five scopes, then **Show N more**.

## Related

- [Project OAuth security](/architecture/security#project-oauth) — authorize/callback, tokens, redirect allowlists, IdP callback setup
- [Sign-in providers](/core-concepts/sign-in-providers) — platform GitHub/Google env configuration (Grant account login)
- [ADR 0008](https://github.com/grant-js/grant/blob/main/decisions/0008-per-project-oauth-connections.md) — why connections are per-project and BYO
- [File storage](/advanced-topics/file-storage) — upload adapters and paths
