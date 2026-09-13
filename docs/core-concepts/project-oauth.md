---
title: Project OAuth
description: Hosted sign-in for project apps, consent, and branding
---

# Project OAuth

Projects can register **OAuth apps** (ProjectApp) so a tenant product can send users through Grant’s hosted sign-in and consent pages, then receive a project-scoped JWT. The security model — global user resolution, project membership, token claims — is in [Project OAuth](/architecture/security#project-oauth). This page covers the hosted UI and how branding is resolved.

## Hosted pages

| Page | Route | Purpose |
| ---- | ----- | ------- |
| Sign-in | `/auth/project` | Choose a provider (GitHub, Google, email) and see requested permissions |
| Email | `/auth/project/email` | Request a magic-link when email is enabled |
| Authorize | `/auth/project/consent` | Confirm the signed-in account and allow or deny access |

Grant’s header stays visible. The client brand is the page subject: app mark, title, and theme. Use **Test OAuth** on the app to check the live pages.

Public metadata for those pages comes from unauthenticated REST:

- `GET /api/auth/project/app-info`
- `GET /api/auth/project/consent-info`

Both return **resolved** branding only. They never expose storage keys, inherit-from-project flags, or organization logos.

## Branding

Project owners set a default logo and OAuth theme on the project **Branding** page (`…/projects/{projectId}/branding`). Each app can override those values on its **Branding** card.

| Field | Project | Project app | Resolved default |
| ----- | ------- | ----------- | ---------------- |
| Picture | Logo / initials | Override or inherit | App → project → initials |
| `primaryColor` | `#RRGGBB` | Override or inherit | App → project → Grant blue |
| `showHelpPanel` | On / off | App sets the value used on hosted pages | App → project → on |
| `themeMode` | — | `light` / `dark` / `system` / Grant default | App only; `null` keeps the visitor’s Grant theme |

Organization logos are **not** in the fallback.

Pictures are upload-only. Update inputs do not accept `pictureUrl`. Anyone with **Update** on Project or ProjectApp may upload, clear, or change theme. Storage keys:

- `projects/{projectId}/picture.{ext}`
- `project-apps/{projectAppId}/picture.{ext}`

See [File storage](/advanced-topics/file-storage).

## Consent identity

The authorize page shows who is consenting and **which provider** they used for this sign-in (GitHub, Google, or email). That value is stored on the consent token for this login; it is not inferred from every method on the account.

Long permission lists show the first five scopes, then **Show N more**.

## Related

- [Project OAuth security](/architecture/security#project-oauth) — authorize/callback, tokens, redirect allowlists
- [Sign-in providers](/core-concepts/sign-in-providers) — GitHub and Google clients used by project apps
- [File storage](/advanced-topics/file-storage) — upload adapters and paths
