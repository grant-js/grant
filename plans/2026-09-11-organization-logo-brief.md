# Story brief

## Metadata

- **Slug**: `organization-logo`
- **Date**: 2026-09-11
- **Author**: human / PM agent
- **Status**: in-progress

## Objective

Organization owners can upload a company logo that replaces name-initials avatars on organization lists, the edit dialog, and the organization switcher.

## Acceptance criteria

- [ ] `organizations.picture_url` stores the public URL of an uploaded logo (nullable).
- [ ] Dedicated GraphQL mutation and REST `POST /api/organizations/:id/picture` upload an image, persist the URL, and reuse existing file-storage validation.
- [ ] `Organization:UploadPicture` is granted to Organization Owner; Admin cannot upload.
- [ ] Cards, table, and edit-dialog avatars show the logo or initials; owners with permission can replace it via the shared crop dialog.
- [ ] Organization switcher displays the logo (display-only).
- [ ] Initials remain until a logo is uploaded. No create-time upload.

## Non-goals

- Upload during organization create
- SVG logos
- Deleting storage blobs on replace
- Clearing a logo without a replacement
- Workspace switcher (Personal vs Organization account type)

## Risk flags

- [ ] Auth / sessions / MFA / AAL
- [ ] API keys / tokens
- [x] Tenancy / RLS / org scoping
- [x] Permissions / RBAC
- [ ] GDPR export / deletion / PII
- [ ] None of the above

## Suggested active roles

PM, Principal, Backend, Frontend, QA, Senior Security (API slice), Verifier.

## Human gate

- [x] Gate 1: Story brief approved — plan approved 2026-09-11.
