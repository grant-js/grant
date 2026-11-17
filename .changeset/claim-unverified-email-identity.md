---
'grant-api': patch
---

Fix onboarding for people whose address already exists in Grant as an unverified identity with no platform password, such as users a CDM import or an operator created. Every console path refused them: register failed with `An account with this email already exists`, password login had no credential to check, and Google or GitHub failed with `Email is not verified`. The only way in was a password reset followed by a login from the invitation link.

Such an identity can now be claimed on a mailbox proof:

- **OAuth** (console and project apps), when the provider is authoritative for the address: Google for a Gmail address or an address in the Workspace domain it reports in `hd`, GitHub for an address it lists as verified.
- **Register from an organization invitation**, whose link carries an emailed proof token: the person sets their platform password and is signed in.

A claim is allowed only when the Email method is unverified, its address equals the proven one exactly, and the user has no other authentication method and no MFA factor. It marks the method verified, removes the platform credential and revokes every session set before the proof, so an account someone pre-registered with another person's address cannot survive that person's sign-in. The user id, memberships, roles and project credentials stay. Anything that does not qualify fails as before.
