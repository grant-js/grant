# Story brief

## Metadata

- **Slug**: notification-email-templates
- **Date**: 2026-09-14
- **Author**: PM agent
- **Status**: in-progress

## Objective

Email-channel notifications use Grant’s branded MJML chrome with a structured heading, summary, key facts, View-in-Grant button, and preferences footer — not a plain-text one-liner. Assignment and membership copy names both sides and distinguishes the subject from observers.

## Acceptance criteria

- [ ] Every catalog event type maps to an email family; a unit test fails when a new type is added without a mapping.
- [ ] Delivery sends HTML + plain text through `sendNotification`, using `renderBaseEmailTemplate` (header, body, button, footer).
- [ ] Emails include actor, workspace, and named entities when those facts exist; they do not dump field-level deltas.
- [ ] Copy is in `email.json` (en + de) and rendered with the default locale.
- [ ] Recipients who are the event subject see “you” copy; other recipients see the subject’s name.
- [ ] `organization.invitation_sent` does not enqueue an email-channel notification (dedicated invitation email already goes out).
- [ ] Missing `event_log` still produces a branded wrapper around stored title/body.
- [ ] User-controlled names are HTML-escaped in MJML.

## Non-goals

- Field-level change lists from `delta`
- Storing a user locale / sending German until a locale is passed in
- Changing invitation, OTP, or magic-link templates
- Notification center UI
- `@grantjs/email` adapter contract changes

## Risk flags

Mark any that apply (forces `security-full` review on affected slices):

- [ ] Auth / sessions / MFA / AAL
- [ ] API keys / tokens
- [ ] Tenancy / RLS / org scoping
- [ ] Permissions / RBAC
- [ ] GDPR export / deletion / PII
- [x] None of the above

HTML escaping of interpolated names is required; review bar stays light.

## Suggested active roles

Project Manager, Principal Engineer, Senior Backend, Senior QA, Verifier.

## Human gate

- [x] Gate 1: Story brief approved — stop here until a human confirms before stack planning.
