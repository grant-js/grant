# 0014 — API-key scopes: a key carries a role or a set of permissions, never more than its creator holds

- **Status**: Proposed
- **Date**: 2026-10-31
- **Context**: story `api-key-scopes` (plans `2026-10-31-api-key-scopes-*.md`); the slice pull requests [#679](https://github.com/grant-js/grant/pull/679) (the model and the attenuation check), [#682](https://github.com/grant-js/grant/pull/682) (resolution, the API surface and editing), the web slice, and the slice that carries this record
- **Related**: [API keys](/core-concepts/api-keys#two-grant-kinds-a-role-or-a-set-of-permissions), [RBAC](/architecture/rbac#api-keys-are-attenuated), ADR [0011](./0011-password-as-a-scoped-credential.md) § 3 (`ProjectUser:ExportCredentials` has no default holder), [0013](./0013-exportable-api-key-secrets.md) (the credential export a mirror's key calls)
- **Scope**: project API keys, that is keys created in an `accountProject` or `organizationProject` scope. Project-user keys (`projectUser`, `accountProjectUser`, `organizationProjectUser`), every CDM path, session principals and the standard groups are unchanged, except that `ApiKey:Update` is added to the three API-key groups.
- **Compatibility**: additive. `roleId` keeps working and existing keys keep their role. One migration (`0096`), one new action (`ApiKey:Update`), new fields on `CreateApiKeyInput` and `ApiKey`, one query, one mutation, two routes and one event type. Minor release.

## Context

A project API key is authorized by the parent-tenant role it was created with: the key's principal id is the key's own id, the pivot row of the project (`organization_project_api_keys`, `account_project_api_keys`) names one role, and the key has whatever that role resolves to in the project. That is a coarse unit. A role is a bundle written for people, so a key for one narrow job (reading members, starting a sync job) has to carry a whole role.

A receiver that mirrors Grant into another system is the case that forced the question. Its key reads the members of a project, starts and reads CDM sync jobs and, since ADR 0011 and ADR 0013, calls the credential export. That last call needs `ProjectUser:ExportCredentials`, a permission placed in no standard group on purpose, so that nobody holds it by default. ADR 0011 left the carrier to the organization ("grants it to the group of the role a mirror's API key carries"): every deployment had to build a role and a group around one permission.

Two things follow. A key needs to carry an explicit set of permissions, the way a fine-grained token does on other platforms. And whatever a key carries needs one rule that bounds it by the person or credential that gave it. API-key role assignment was hardened in v1.22.1; this record builds on that and states one rule for every way of giving a key its permissions.

## Decision

**A project key carries exactly one of a standard role or an explicit set of permissions. Whatever it carries must be contained in what its creator, or later its editor, can do in the key's project scope. A small set of machine-only permissions may be attached by a holder of a declared gate permission. Scopes are editable under the same rule.**

### 1. The model: one pivot for permissions, a nullable role, exactly one grant kind

- `api_key_permissions (id, api_key_id, permission_id, project_id, created_at, deleted_at)`, with a partial unique index on `(api_key_id, permission_id)` where `deleted_at IS NULL` and the project row-level-security pair of `api_key_exportable_secrets` (migration `0096`, `packages/@grantjs/database/src/schemas/api-key-permissions.schema.ts`). **One table for both tenants**: the tenant is already on the existing pivot row, the permission set is a property of the key, and one repository and one resolution join serve both.
- `organization_role_id` and `account_role_id` on the two pivots become **nullable** (`organization-project-api-keys.schema.ts:31`, `account-project-api-keys.schema.ts:31`). A key has a role or permissions, never both, and never neither.
- **The invariant lives in the service, not in a database constraint**, because it spans three tables. `ApiKeyAttenuationService.assertAttachable` refuses a request that names both (`BadRequestError`), neither, or an empty set (`apps/api/src/services/api-key-attenuation.service.ts:66`); `assertCanManage` refuses a key that has neither (`:100`). Unit tests pin each refusal.
- **Permissions are named by id** (`permissionIds`), not by `resource:action` slug. Resolution works on permission rows, a row carries its own condition, and custom permissions exist; a slug cannot name a conditional row, and the dashboard already works with `Permission` entities.
- **A role key carries only a standard role**: a standard organization role for an organization project, a standard account role for an account project. `isStandardRole` (`api-key-attenuation.service.ts:266`) holds when the role's name is one of the seeded names for the tenant and exactly one live role row carries it. Any other role is refused at create and its key is not manageable. A permission set is the way to carry anything a standard role does not.
- **Project-user keys are untouched.** They are the credential of their project user, with no role and no permissions; `permissionIds` is refused for them, since a list could not narrow a principal that is the user.

### 2. Attenuation: containment in the key's project scope, equality allowed

The rule, in one sentence: **the key's effective permissions must be contained in the effective permissions of the caller, evaluated in the key's project scope.**

- **The caller's set** is `GrantService.collectPermissionIds(userId, scope, tokenType)` (`apps/api/src/services/grant.service.ts:124`), the id collection that `getUserPermissions` already ran before it filtered by one action, extracted so that authorizing a request and checking a key share one code path. It is evaluated in the key's own scope (`OrganizationProject` or `AccountProject`) and with the caller's **actual token type**, so the rule is transitive: a key that creates a key is bound by its own permissions.
- **The key's set** is its own rows in `api_key_permissions`, or, for a role key, the role's effective set in the same scope (`collectRolePermissionIds`, `grant.service.ts:157`: the role's groups and its project-filtered direct permissions), the set the key would resolve to.
- **Compared by row id.** A permission row carries its own condition, so a covered row is covered with that condition; a caller who holds a conditional row does not cover the unconditional one.
- **Equality is allowed.** A key may do exactly what its creator can, as a personal access token does. What the rule protects is that a key never exceeds its giver, and a strict subset adds nothing to that for sets, where "one level lower" has no meaning. A refusal is `AuthorizationError` naming the count of uncovered permissions and never their names (`api-key-attenuation.service.ts:95`).
- **One rule, three moments.** The handler calls `assertAttachable` in both the account-project and the organization-project create branches (`apps/api/src/handlers/api-keys.handler.ts:238,269`), and `assertCanManage` before revoke, rotate and delete in both (`:320`). The level comparison `canAssignRole` (`packages/@grantjs/constants/src/permissions/roles.ts:68`) is **no longer applied to keys**: its levels exist only for the four standard organization roles, while a key's reach is a set of permissions. It stays for member role changes and invitations (`organization-members.service.ts:94,177`, `organization-invitations.service.ts:114`), which are not this record's.
- **Not compared: how a role was authored.** The check compares effective sets, whatever a role contains. Containment when authoring roles and groups is a separate decision (Consequences).

### 3. Machine-only permissions and the gate that attaches them

`ProjectUser:ExportCredentials` sits in no standard group, so no creator's set contains it and containment alone would make it unattachable. The rule that lets it be attached is declared **on the permission's template**, not in the check:

- `StandalonePermission.attachableByHoldersOf?: { resource, action }` (`packages/@grantjs/constants/src/permissions/permissions.ts:1289`). `MACHINE_ONLY_PERMISSIONS` is the standalone entries that declare it, and `machineOnlyGate(resource, action)` returns the gate (`:1305,:1309`). `ProjectUser:ExportCredentials` declares `ProjectUser:SetPassword` (`:1298`).
- A creator who **holds the gate permission in the key's project scope** may attach the machine-only permission without holding it (`gatedMachineOnlyIds`, `api-key-attenuation.service.ts:229`). `ProjectUser:SetPassword` is held by the `ProjectUserOwner` group (Organization Owner, Personal Account Owner, Organization Account Owner) and `ProjectUserAdmin` (Organization Admin), and by no Dev, Viewer or common group (ADR 0011 § 3), which reads "Owner and Admin may attach it" without naming a role, covers account projects, and stays inside the permission model attenuation is built on.
- **The flag describes attachability and nothing else.** It does not deny the permission to sessions: an organization that grants `ProjectUser:ExportCredentials` to a group keeps working as before. Denying it to session principals is a possible later decision.
- The cohort query returns machine-only permissions flagged `machineOnly: true`, so a client can show them as a distinct kind.

### 4. Resolution: a scope key is authorized by exactly its permissions

- `GrantRepository.getPermissionIdsForApiKey(apiKeyId, scope)` (`apps/api/src/repositories/grant.repository.ts:623`) reads the key's live rows **joined through the pivot of the named scope**, so a key's permissions apply only in its own `(tenant, id)` and nowhere else, as the role path does. `collectPermissionIds` unions it when the token type is `ApiKey` and the scope is a project scope (`grant.service.ts:138,144`). A pivot row with no role yields no roles (`grant.repository.ts:284,374`), so a scope key resolves nothing from any role.
- **The token does not change.** It keeps `sub`, `jti`, `type`, `scope`; permissions are read at authorization time and cached, so an edit takes effect without a new token.
- **Dependency, stated so it is not lost:** the principal id of a project key is the key's own id (`apps/api/src/services/api-keys.service.ts:266,275`). If that ever changes, `getPermissionIdsForApiKey` must key on the token id (`jti`) instead.
- **Cache rule.** Authorization results are cached per principal. A key's principal id is its id, so an edit drops them with the existing call, `invalidateAuthorizationResultsForUser(apiKeyId)`, after the transaction commits (`api-keys.handler.ts:411`). The edit reaches the key's next request.

### 5. Editable scopes under the same rule

`setApiKeyPermissions` and `PUT /api/api-keys/{id}/permissions` replace the permissions of a project key; they require `ApiKey:Update` (a new action, held by Owner, Admin and Dev) at the transport (`apps/api/src/graphql/resolvers/mutations.ts:632`, `apps/api/src/rest/routes/api-keys.routes.ts:154-162`); the handler is `api-keys.handler.ts:360`.

- The editor must **cover the key as it is** (`assertCanManage`), the same rule as for revoke, rotate and delete.
- Every permission the edit **adds** must be attachable by the editor (`assertAttachable` on the additions only, `:382`), machine-only ones through their gate. **Removals are always allowed.** The set may not be empty.
- **One-way conversion.** Applied to a role key, the call converts it: the role is cleared on the pivot and the listed permissions are stored. Every listed permission counts as an addition, so the conversion is bounded by the **editor's** permissions, not by what the old role held. A permission key never converts back to a role.
- **Audit.** One `ADD_PERMISSION` or `REMOVE_PERMISSION` row per permission on `api_key_audit_logs` (`{ permissionId, resource, action }`, and `fromRoleId` on the rows of a conversion), and one `UPDATE_API_KEY_PERMISSIONS` row of counts (`apps/api/src/services/api-key-permissions.service.ts:72`). The audit value columns are `varchar(1000)` and a full catalogue of permission ids does not fit in one row, which is why the trail is a row per change. A create writes the same `ADD_PERMISSION` rows, and `CREATE_API_KEY` metadata records `grant: 'role' | 'permissions'` and `permissionCount`. No row holds a secret.
- **Event.** `api_key.updated` (`aggregate { kind: 'apiKey', id }`, `data.before` and `data.after` carry `id`, `name` and `permissionCount`; the project ids come from the pivot; no owning user, since a project key has none). It is webhook-only in the `security` category, like `api_key.deleted`, and is published only when something changed (`api-keys.handler.ts:398`; `publishApiKeyUpdated`, `api-keys.service.ts:899`). It names no permission and no secret.
- **The key keeps its id, client id and secret.** Nothing new is handed out by an edit.
- **Residual risk and its mitigation.** An editable key can grow after its consumer was vetted. The edit is as sensitive as creation and takes the same check, so it cannot grow past what its editor holds; the audit rows name each added permission and who added it, the `api_key.updated` event reaches security subscribers, and a deployment that wants a frozen key gives `ApiKey:Update` to nobody who should not have it.

### 6. What the cohort query answers

`apiKeyAttachableGrants(scope)` and `GET /api/api-keys/attachable-grants` return the permissions the caller may attach in a project scope (flagged `machineOnly`) and the standard roles whose set the caller covers (`api-keys.handler.ts:166`; `ApiKeyAttenuationService.attachableGrants`, `api-key-attenuation.service.ts:125`). They require `ApiKey:Create`, take a project scope the request is authorized in, and are not paged. A client cannot compute containment from role names, so it asks the server; it uses the answer to show what would succeed, never to decide.

## Why not the alternatives

**Two pivots, one per tenant** (`organization_project_api_key_permissions`, `account_project_api_key_permissions`), mirroring the role columns. Rejected: the permission set belongs to the key, the tenant is already on the pivot row, and two tables would double the port, the repository, the service and the resolution path for no difference in meaning.

**A union of role and scopes on one key.** Rejected: it makes the effective set "role plus scopes" and any picker a diff against a role, and the one-way conversion exists precisely so that a key is one thing. It would also let an old key be extended without anyone naming what it now is.

**`resource:action` slugs as scopes**, as project apps use. Rejected: they read better in a request but need a resolution step and cannot name a conditional row (§ 1).

**A strict subset, equality refused.** Rejected: one rule with one definition ("contained") is simpler than two, and a key that does exactly what its creator can is the case a mirror run by an Owner is.

**The parent tenant as the comparand** (`Organization` / `Account`) instead of the key's project scope. Rejected: a key never acts in the parent scope, and the comparison would not be transitive for a key that creates a key.

**A role-list gate for machine-only permissions** (`attachableBy: [OrganizationOwner, OrganizationAdmin, …]`). Rejected: it names roles inside a rule whose purpose is not to depend on role names, and needs a role lookup the check otherwise does not make. A permission gate, `ProjectUser:SetPassword`, is a fact the permission model already holds.

**Enforcing machine-only on sessions in `Grant.isAuthorized`.** Deferred: it changes behaviour for grants that exist today (§ 3).

**Immutable scopes, so that a change is a new key.** Rejected: every change of scope would put a new secret into every consumer, which pushes people to over-scope at creation, the opposite of what scopes are for. Editing takes the same check as creation, so it hands out nothing new (§ 5).

**Keeping the level comparison beside containment**, or deriving "may manage" in the client from role levels. Rejected: two rules for one question, and levels are defined for four organization role names only. The client cannot compute containment, so it asks the server (§ 6).

**A scopes claim in the token.** Rejected: an edit would not apply until the next token, and the cache already holds decisions per principal.

## Consequences

- **A key's reach is whatever its creator could do in the project, at most.** A mirror gets one key per function (reading state, writing credentials, importing), each carrying only the permissions that function uses; the writer's key carries `ProjectUser:ExportCredentials`, attached by an Owner or Admin (see [the worked example](/core-concepts/api-keys#a-key-for-a-receiver-that-mirrors-grant-into-another-system)). No custom role or group is needed for it.
- **Concurrent edits are not serialized.** An edit reads the key's current set, computes its difference and applies it, with no lock. Two concurrent edits both land, and the result can be a combination neither editor wrote; each addition was still checked against its own editor, and both edits leave audit rows. Serializing edits (a row lock on the key's pivot row) is open.
- **Tokens already issued keep identifying the key until they expire**, as for role keys. What a token may do follows the key's current permissions, since they are read when a request is authorized, so an edit reaches its next request. Revoking a key stops new exchanges and does not stop tokens already issued (the residual window, [Security](/architecture/security#residual-access-jwt-window)), unchanged by this record.
- **Role and group authoring containment is a separate decision.** The check compares effective sets, so it holds whatever a role contains, but who may create or edit roles and groups, and with which permissions (`createRole`, `updateRole`, `addRoleGroup`, `assignRolePermission`, `assignGroupPermission`), is not bounded here.
- **Not provided:** converting a permission key back to a role, per-key permission conditions beyond the rows' own, scopes for `Account` and `Organization` keys (the exchange does not support them), and denying machine-only permissions to sessions.
- **`ApiKey:Update` reaches existing organizations through `seedAll`**, like every standard permission (ADR 0001); the account-project owner group already listed it and now has a row to hold.
- **Operators** need do nothing: a key created before this release keeps its role and resolves as before, and nothing is back-filled.

## References

- Model: `packages/@grantjs/database/src/schemas/api-key-permissions.schema.ts`, `organization-project-api-keys.schema.ts`, `account-project-api-keys.schema.ts`, migration `0096_api_key_permissions.sql`
- The check: `apps/api/src/services/api-key-attenuation.service.ts` (`assertAttachable`, `assertCanManage`, `attachableGrants`, `effectivePermissionIdsForKey`), port `IApiKeyAttenuationService` in `packages/@grantjs/core/src/ports/services/api-key.service.port.ts`
- Machine-only rule: `packages/@grantjs/constants/src/permissions/permissions.ts` (`STANDALONE_PERMISSIONS`, `MACHINE_ONLY_PERMISSIONS`, `machineOnlyGate`)
- Resolution: `apps/api/src/services/grant.service.ts` (`collectPermissionIds`, `collectRolePermissionIds`), `apps/api/src/repositories/grant.repository.ts` (`getPermissionIdsForApiKey`)
- Create, edit, cohort: `apps/api/src/handlers/api-keys.handler.ts`, `apps/api/src/services/api-key-permissions.service.ts`, `apps/api/src/rest/routes/api-keys.routes.ts`, `packages/@grantjs/schema/src/schema/api-keys/`
- Event: `apps/api/src/services/api-keys.service.ts` (`publishApiKeyUpdated`), `packages/@grantjs/schema/src/events/event-catalog.ts`
- Tests: `apps/api/tests/unit/services/api-key-attenuation.service.test.ts`, `apps/api/tests/unit/handlers/api-keys.handler.attenuation.test.ts`, `apps/api/tests/e2e/scenarios/api-key-attenuation.e2e.test.ts`, `apps/api/tests/e2e/scenarios/api-key-scopes.e2e.test.ts`
