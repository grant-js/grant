---
'grant-api': minor
'@grantjs/schema': minor
---

**BREAKING (data and behaviour; the request and response contracts are unchanged).** A password is now a credential with a scope, not a field of the Email authentication method (ADR 0011). This release moves the platform (console) password out of the Email method.

- **Hashes move.** Platform password hashes leave `providerData.hashedPassword` of the Email method and live in a new `user_credentials` table. Anything that reads `providerData.hashedPassword` or `providerData.passwordSource` breaks; `providerData` no longer carries a hash. The login request (`provider: email`, `providerData.password`), register, change-password and reset-password requests are unchanged, and `hasPassword` is preserved (it now means "a platform credential exists").
- **The upgrade migrates passwords, it does not wipe them.** Migration `0087` copies every Grant-set hash verbatim (bcrypt keeps its cost), so nobody resets: `source: migrated`. A hash a CDM import wrote is carried only when the address is verified (`source: migrated-import`); **unverified `cdm-import` hashes are dropped** (the person signs in by another method or resets). The migration also removes the plain-text password-reset tokens it finds: **an outstanding reset email stops working and the person requests a new one**, because reset tokens are now stored as a SHA-256 digest and looked up by it (no more scanning every Email method for a plain-text token).
- **An imported password no longer opens the platform.** A CDM import with `users[].password` no longer writes anything into the Email method. Until project credentials land (next release) the hash is validated and ignored: the user is provisioned without a password, the job result carries one warning with the count, and no `passwords*` counter moves.
- **Database-enforced separation.** The restricted RLS role of scoped requests has no privileges on the platform credential tables (migration `0088`). Platform credential operations run on the base connection inside the credential service, in their own short transaction when the request is scoped (one extra pooled connection while they run).
- A Grant-set password must meet the password policy in every flow, and a rejected password is never echoed in an error.
