---
'grant-api': patch
---

A person who takes over an identity Grant created without them now sees the name a new sign-up would have, not the name an import gave them:

- **CDM import:** a user the import creates gets the name a first-time sign-up would. That is the address before `@` for `findBy: email`, and `User` for `findBy: key`. The import never writes the document's `name` to the global user; it stays the project's display name.
- **Export:** CDM export reads each user's project display name, falling back to the global name, so an import followed by an export gives the document's names back.
- **Claim:** claiming an unverified identity gives the person the name of the sign-up path they claim through. Google and GitHub claims (console or project app) use the provider's profile name. Registering from an organization invitation uses the address before `@`. It is an ordinary user update with an audit row, and only when the name differs. Later sign-ins, connecting a provider and accepting invitations never rename.

Users imported by earlier releases keep the document's name as their global name until they claim the identity.
