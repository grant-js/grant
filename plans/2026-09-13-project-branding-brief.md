# Story brief

## Metadata

- **Slug**: `project-branding`
- **Date**: 2026-09-13
- **Author**: human / PM agent
- **Status**: in-progress

## Objective

Project owners can set a project logo and OAuth theme (primary color, help-panel visibility). Each project app can override those values. The project-app OAuth sign-in, email, and consent pages show the resolved brand instead of looking like unbranded Grant.

## Acceptance criteria

- [ ] `projects` and `project_apps` store `picture_url` / `picture_path`, `primary_color` (`#RRGGBB`), and `show_help_panel` (nullable; null = inherit or Grant default).
- [ ] Picture writes use org-style mint / confirm / upload plus a clear/remove action. Update inputs do not accept `pictureUrl`.
- [ ] Anyone with `Update` on Project / ProjectApp may upload, clear, or change theme. No new `UploadPicture` action.
- [ ] OAuth branding resolves app → project → initials / Grant blue / help panel on. Organization logo is not in the fallback.
- [ ] `GET /api/auth/project/app-info` and consent-info return resolved `pictureUrl`, `projectName`, `primaryColor`, `showHelpPanel`.
- [ ] Project cards, table, edit dialog (display-only), and switcher show the project picture. App cards, table, and detail show the app picture.
- [ ] Project Branding page at `.../projects/[projectId]/branding` (account and organization). App Branding card on app detail shows inherit vs override. Edit dialog stays name / description / tags.
- [ ] OAuth entry, email, and consent keep the Grant header; apply resolved logo, “by {project}”, primary color on the help panel and primary buttons; hide the help panel as a single column when off.
- [ ] Test OAuth remains the visual check. No dedicated settings preview.

## Non-goals

- Header white-label / hiding Grant chrome
- Custom help copy, custom CSS, favicon, custom domain
- Branded magic-link emails
- Dedicated live preview widget
- SVG, create-time upload, external `pictureUrl` on Update, storage blob GC
- Org logo in the OAuth fallback
- Popup OAuth
- CDM import/export of images or theme fields
- Adding `UploadPicture` to Project / ProjectApp

## Risk flags

- [ ] Auth / sessions / MFA / AAL
- [ ] API keys / tokens
- [x] Tenancy / RLS / org scoping
- [x] Permissions / RBAC
- [ ] GDPR export / deletion / PII
- [ ] None of the above

Public unauthenticated branding on project OAuth app-info / consent-info also forces **security-full** on the API slice.

## Suggested active roles

PM, Principal, Backend, Frontend, QA, Senior Security (API slice), Verifier.

## Human gate

- [x] Gate 1: Story brief approved — implement-the-plan 2026-09-13.
