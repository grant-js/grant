---
'grant-api': patch
---

Operator set-email and create-user now record the operation on their authentication-method audit row, are rate-limited per operator and scope, and the unverified state of an operator-set address is documented.

- **Audit.** `setProjectUserEmail`, `PUT /api/users/:id/email` and `createUser` with an e-mail write their authentication-method audit row with `metadata.operation` set to `operator-set-email` (the first two) or `operator-create-user`, next to the actor in `performed_by` and the previous and new address in `old_values` and `new_values`. A refused call (non-member target, address held by another account, scope mismatch) writes no row.
- **Rate limit.** These operations (`PUT /api/users/:id/email`, `POST /api/users` with an `email`, and the GraphQL `setProjectUserEmail` and `createUser` with an `email`) share one bucket per operator and request scope, on by default and independent of the optional per-tenant limit: 20 operations per 15 minutes, then `429`. The conflict error says whether an address is held by any account in the instance, so without a bound a scoped operator could test addresses across organizations. Set `SECURITY_RATE_LIMIT_SET_EMAIL_MAX` and `SECURITY_RATE_LIMIT_SET_EMAIL_WINDOW_MINUTES` to change it, or `SECURITY_RATE_LIMIT_SET_EMAIL_ENABLED=false` to turn it off. It follows `SECURITY_ENABLE_RATE_LIMIT` like the other buckets.
- **Docs.** An operator-set address is stored unverified; the RBAC reference now says where that matters and how the user clears it.
