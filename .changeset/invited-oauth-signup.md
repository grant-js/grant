---
'grant-api': patch
---

Invited people can sign up with Google or GitHub on a closed install (`AUTH_PUBLIC_SIGNUP_ENABLED=false`). A first-time sign-up is admitted when the provider is authoritative for the address and a pending, unexpired organization invitation exists for it in any organization; the verified address is the mailbox proof. The OAuth callback passes it to `register` as a trusted argument that REST and GraphQL callers cannot set. Previously the sign-up failed with `PUBLIC_SIGNUP_DISABLED`.
