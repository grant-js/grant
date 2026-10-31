---
'grant-api': minor
'@grantjs/schema': minor
---

Project API keys can carry explicit permissions instead of a role (`CreateApiKeyInput.permissionIds`, `ApiKey.permissions`), bounded by what the creator holds: a permission key is authorized by exactly those permissions in its own project. `apiKeyAttachableGrants` (and `GET /api/api-keys/attachable-grants`) lists what the caller may attach, including machine-only permissions such as `ProjectUser:ExportCredentials` for holders of `ProjectUser:SetPassword`. `setApiKeyPermissions` and `PUT /api/api-keys/{id}/permissions` replace a key's permissions under `ApiKey:Update` (additions bounded by the editor's own permissions, removals always allowed, a role key converted one way), with an audit row per change, an `api_key.updated` event, and effect on the key's next request. Two new routes.
