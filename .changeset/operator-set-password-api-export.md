---
'grant-api': patch
---

Adds the audited credential export for a downstream identity mirror: the `exportProjectUserCredentials` GraphQL query and `POST /api/users/credentials/export` (body `{ scope, userIds, kinds }`; project scope only). It returns `{ algorithm: 'bcrypt', hash }` for each requested project member who has a project credential and `password: null` for one who has none, in request order, and is the only place a project password hash leaves Grant. It requires `ProjectUser:ExportCredentials`, which no standard group holds, so an organization grants it deliberately to the role a mirror's API key carries; Owner and Admin are denied. `userIds` is capped at one page, and any id that is not a member of the project fails the whole call as not found (no partial export). The REST response is sent `Cache-Control: no-store`.

Every successful export writes exactly one `export` row on the project credential audit log in the same transaction as the read (the caller, the number of users and credentials, the kinds; never a hash), so a failed audit write fails the export. A refused call writes none.

Adds `User.passwordCredential { source, updatedAt, fingerprint }`, where `fingerprint` is the lowercase hex SHA-256 of the stored hash: a change detector, not a secret. It resolves to `null`, never an error, for any caller without `ProjectUser:ExportCredentials`, so existing documents keep working. It resolves in the request's project scope and is `null` for any other scope.
