---
'grant-api': minor
'@grantjs/schema': minor
---

In a project that opted in to exportable API-key secrets, Grant keeps an encrypted copy of a project-user API key's secret at create and rotate (AES-256-GCM under the dedicated `API_KEY_EXPORTABLE_SECRET_ENCRYPTION_KEY`) and issues such secrets as 88-character standard base64 of 64 random bytes (bcrypt verifies the first 72 bytes only); the copy is removed on revoke, delete, CDM replace delete or rotate, and opt-out. Every project-user key created, rotated or imported from this release on also stores a fingerprint, the SHA-256 of the secret string as issued (`null` for a key created earlier and not rotated since), which holders of `ProjectUser:ExportCredentials` read through the new `User.apiKeyCredentials` (`ProjectUserApiKeyCredential`: `fingerprint`, and whether a copy exists). New table `api_key_exportable_secrets` and column `api_keys.client_secret_fingerprint` (migration 0095); no route changes. Nothing decrypts a copy yet.
