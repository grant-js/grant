import {
  ACCOUNT_ROLES,
  MACHINE_ONLY_PERMISSIONS,
  machineOnlyGate,
  ORGANIZATION_ROLES,
  ROLES,
} from '@grantjs/constants';
import type {
  ApiKeyAttachableGrantIds,
  GrantAuth,
  IAccountProjectApiKeyRepository,
  IAccountRoleRepository,
  IApiKeyAttenuationService,
  IApiKeyPermissionRepository,
  IGrantService,
  IOrganizationProjectApiKeyRepository,
  IOrganizationRoleRepository,
  IPermissionRepository,
  IRoleRepository,
  PermissionRef,
} from '@grantjs/core';
import { Scope, Tenant } from '@grantjs/schema';

import { AuthorizationError, BadRequestError, NotFoundError } from '@/lib/errors';
import { unboundedList } from '@/lib/pagination.lib';
import {
  accountProjectFromScopeOrThrow,
  organizationProjectFromScopeOrThrow,
} from '@/lib/scope.lib';
import type { Transaction } from '@/lib/transaction-manager.lib';

type PermissionSets = Pick<IGrantService, 'collectPermissionIds' | 'collectRolePermissionIds'>;

const actionKey = (resource: string, action: string) =>
  `${resource.trim().toLowerCase()}:${action.trim().toLowerCase()}`;

interface KeyPivot {
  roleId: string | null;
}

/**
 * What a project API key may carry, and who may manage it, decided by one rule: the key's
 * effective permissions in its project scope must be covered by the caller's, equality
 * allowed. The caller's permissions are collected with the caller's own token type, so a key
 * that creates a key is bound by its own set. A machine-only permission is also covered when
 * the caller holds its gate permission (`attachableByHoldersOf`). Permissions are compared by
 * row id: a row carries its own condition, so a covered row is covered with that condition.
 *
 * A role key carries only a standard role (a standard organization role for an organization
 * project, a standard account role for an account project). A permission set of any other
 * shape is carried by the key itself.
 */
export class ApiKeyAttenuationService implements IApiKeyAttenuationService {
  constructor(
    private readonly permissionSets: PermissionSets,
    private readonly apiKeyPermissionRepository: IApiKeyPermissionRepository,
    private readonly organizationProjectApiKeyRepository: IOrganizationProjectApiKeyRepository,
    private readonly accountProjectApiKeyRepository: IAccountProjectApiKeyRepository,
    private readonly organizationRoleRepository: IOrganizationRoleRepository,
    private readonly accountRoleRepository: IAccountRoleRepository,
    private readonly roleRepository: IRoleRepository,
    private readonly permissionRepository: IPermissionRepository,
    private readonly user: GrantAuth | null
  ) {}

  public async assertAttachable(
    params: { scope: Scope; roleId?: string | null; permissionIds?: readonly string[] | null },
    transaction?: Transaction
  ): Promise<void> {
    const { scope, roleId } = params;
    const permissionIds = params.permissionIds ?? null;
    this.assertProjectScope(scope);

    if (roleId && permissionIds !== null) {
      throw new BadRequestError('An API key carries either a role or permissions, not both');
    }
    if (!roleId && permissionIds === null) {
      throw new BadRequestError('An API key needs a role or at least one permission');
    }
    if (permissionIds !== null && permissionIds.length === 0) {
      throw new BadRequestError('An API key needs at least one permission');
    }

    if (roleId) {
      await this.assertStandardRole(roleId, scope, 'carry', transaction);
    }
    const requested = roleId
      ? await this.permissionSets.collectRolePermissionIds([roleId], scope)
      : await this.livePermissionIds(permissionIds ?? [], transaction);

    const callerCover = await this.callerCover(scope, transaction);
    const uncovered = this.countUncovered(requested, callerCover);
    if (uncovered > 0) {
      throw new AuthorizationError(
        `API key would exceed the creator's permissions (${uncovered} not covered)`
      );
    }
  }

  public async assertCanManage(
    params: { scope: Scope; apiKeyId: string },
    transaction?: Transaction
  ): Promise<void> {
    const { scope, apiKeyId } = params;
    const pivot = await this.getPivot(scope, apiKeyId, transaction);
    const ownPermissionIds = await this.ownPermissionIds(apiKeyId, transaction);

    // A key with neither a role nor permissions is not manageable by anyone.
    if (pivot.roleId === null && ownPermissionIds.length === 0) {
      throw new AuthorizationError('API key is not covered by your permissions');
    }

    if (pivot.roleId !== null) {
      await this.assertStandardRole(pivot.roleId, scope, 'manage', transaction);
    }

    const keyPermissionIds = await this.keyPermissionIds(scope, pivot, ownPermissionIds);
    const callerCover = await this.callerCover(scope, transaction);
    const uncovered = this.countUncovered(keyPermissionIds, callerCover);
    if (uncovered > 0) {
      throw new AuthorizationError(`API key exceeds your permissions (${uncovered} not covered)`);
    }
  }

  public async attachableGrants(
    scope: Scope,
    transaction?: Transaction
  ): Promise<ApiKeyAttachableGrantIds> {
    this.assertProjectScope(scope);
    const callerCover = await this.callerCover(scope, transaction);
    const machineOnlyIds = await this.machineOnlyPermissionIds(transaction);

    const attachable = new Set([...callerCover.held, ...callerCover.machineOnlyAttachable]);
    const permissions = [...attachable].map((permissionId) => ({
      permissionId,
      machineOnly: machineOnlyIds.has(permissionId),
    }));

    const roleIds: string[] = [];
    for (const candidateRoleId of await this.parentTenantRoleIds(scope, transaction)) {
      if (!(await this.isStandardRole(candidateRoleId, scope, transaction))) {
        continue;
      }
      const roleSet = await this.permissionSets.collectRolePermissionIds([candidateRoleId], scope);
      if (this.countUncovered(roleSet, callerCover) === 0) {
        roleIds.push(candidateRoleId);
      }
    }

    return { permissions, roleIds };
  }

  public async effectivePermissionIdsForKey(
    params: { scope: Scope; apiKeyId: string },
    transaction?: Transaction
  ): Promise<string[]> {
    const pivot = await this.getPivot(params.scope, params.apiKeyId, transaction);
    const own = await this.ownPermissionIds(params.apiKeyId, transaction);
    return this.keyPermissionIds(params.scope, pivot, own);
  }

  private assertProjectScope(scope: Scope): void {
    if (scope.tenant !== Tenant.OrganizationProject && scope.tenant !== Tenant.AccountProject) {
      throw new BadRequestError(`Unsupported scope for API key permissions: ${scope.tenant}`);
    }
  }

  private requireUser(): GrantAuth {
    if (!this.user?.userId) {
      throw new AuthorizationError('Authentication required');
    }
    return this.user;
  }

  /** What the caller covers in the scope: held permissions and gated machine-only ones. */
  private async callerCover(
    scope: Scope,
    transaction?: Transaction
  ): Promise<{ held: Set<string>; machineOnlyAttachable: Set<string> }> {
    const user = this.requireUser();
    const held = new Set(
      await this.permissionSets.collectPermissionIds(user.userId, scope, user.type)
    );
    return { held, machineOnlyAttachable: await this.gatedMachineOnlyIds(held, transaction) };
  }

  private countUncovered(
    requested: Iterable<string>,
    cover: { held: Set<string>; machineOnlyAttachable: Set<string> }
  ): number {
    let uncovered = 0;
    for (const permissionId of new Set(requested)) {
      if (!cover.held.has(permissionId) && !cover.machineOnlyAttachable.has(permissionId)) {
        uncovered += 1;
      }
    }
    return uncovered;
  }

  private groupByAction(refs: PermissionRef[]): Map<string, string[]> {
    const byKey = new Map<string, string[]>();
    for (const ref of refs) {
      const key = actionKey(ref.resource, ref.action);
      byKey.set(key, [...(byKey.get(key) ?? []), ref.id]);
    }
    return byKey;
  }

  private async machineOnlyRefs(transaction?: Transaction): Promise<Map<string, string[]>> {
    const pairs = MACHINE_ONLY_PERMISSIONS.flatMap((permission) => [
      { resource: permission.resource, action: permission.action },
      ...(permission.attachableByHoldersOf ? [permission.attachableByHoldersOf] : []),
    ]);
    return this.groupByAction(
      await this.permissionRepository.getPermissionRefsByActions(pairs, transaction)
    );
  }

  private async machineOnlyPermissionIds(transaction?: Transaction): Promise<Set<string>> {
    const refs = await this.machineOnlyRefs(transaction);
    return new Set(
      MACHINE_ONLY_PERMISSIONS.flatMap(
        (permission) => refs.get(actionKey(permission.resource, permission.action)) ?? []
      )
    );
  }

  /** Machine-only permission ids whose gate permission the caller holds. */
  private async gatedMachineOnlyIds(
    held: Set<string>,
    transaction?: Transaction
  ): Promise<Set<string>> {
    const refs = await this.machineOnlyRefs(transaction);
    const attachable = new Set<string>();
    for (const permission of MACHINE_ONLY_PERMISSIONS) {
      const gate = machineOnlyGate(permission.resource, permission.action);
      const gateIds = gate ? (refs.get(actionKey(gate.resource, gate.action)) ?? []) : [];
      if (gateIds.some((gateId) => held.has(gateId))) {
        for (const id of refs.get(actionKey(permission.resource, permission.action)) ?? []) {
          attachable.add(id);
        }
      }
    }
    return attachable;
  }

  private async assertStandardRole(
    roleId: string,
    scope: Scope,
    use: 'carry' | 'manage',
    transaction?: Transaction
  ): Promise<void> {
    if (!(await this.isStandardRole(roleId, scope, transaction))) {
      throw new AuthorizationError(
        use === 'carry'
          ? 'API keys can only carry a standard role'
          : 'API keys can only be managed when their role is a standard role'
      );
    }
  }

  /**
   * A standard role of the scope's tenant: its name is one of the seeded names for the tenant
   * and exactly one live role row carries that name. An unknown role id is not found.
   */
  private async isStandardRole(
    roleId: string,
    scope: Scope,
    transaction?: Transaction
  ): Promise<boolean> {
    const page = await this.roleRepository.getRoles({ ids: [roleId], limit: 1 }, transaction);
    const role = page.roles[0];
    if (!role) {
      throw new NotFoundError('Role', roleId);
    }

    const standardKeys =
      scope.tenant === Tenant.OrganizationProject ? ORGANIZATION_ROLES : ACCOUNT_ROLES;
    if (!standardKeys.some((key) => ROLES[key].name === role.name)) {
      return false;
    }

    const sameName = await this.roleRepository.getRoles(
      unboundedList({ search: role.name, limit: -1 }),
      transaction
    );
    return sameName.roles.filter((row) => row.name === role.name).length === 1;
  }

  private async livePermissionIds(
    permissionIds: readonly string[],
    transaction?: Transaction
  ): Promise<string[]> {
    const unique = [...new Set(permissionIds)];
    const live = await this.permissionRepository.getPermissionRefsByIds(unique, transaction);
    if (live.length !== unique.length) {
      throw new BadRequestError('One or more permissions do not exist');
    }
    return unique;
  }

  private async ownPermissionIds(apiKeyId: string, transaction?: Transaction): Promise<string[]> {
    const rows = await this.apiKeyPermissionRepository.listForKey(apiKeyId, transaction);
    return rows.map((row) => row.permissionId);
  }

  private async keyPermissionIds(
    scope: Scope,
    pivot: KeyPivot,
    ownPermissionIds: string[]
  ): Promise<string[]> {
    const roleSet = pivot.roleId
      ? await this.permissionSets.collectRolePermissionIds([pivot.roleId], scope)
      : [];
    return [...new Set([...roleSet, ...ownPermissionIds])];
  }

  private async getPivot(
    scope: Scope,
    apiKeyId: string,
    transaction?: Transaction
  ): Promise<KeyPivot> {
    this.assertProjectScope(scope);
    if (scope.tenant === Tenant.OrganizationProject) {
      const { organizationId, projectId } = organizationProjectFromScopeOrThrow(scope);
      const pivot =
        await this.organizationProjectApiKeyRepository.getByApiKeyAndOrganizationAndProject(
          apiKeyId,
          organizationId,
          projectId,
          transaction
        );
      if (!pivot) {
        throw new NotFoundError('ApiKey', apiKeyId);
      }
      return { roleId: pivot.organizationRoleId };
    }
    const { accountId, projectId } = accountProjectFromScopeOrThrow(scope);
    const pivot = await this.accountProjectApiKeyRepository.getByApiKeyAndAccountAndProject(
      apiKeyId,
      accountId,
      projectId,
      transaction
    );
    if (!pivot) {
      throw new NotFoundError('ApiKey', apiKeyId);
    }
    return { roleId: pivot.accountRoleId };
  }

  private async parentTenantRoleIds(scope: Scope, transaction?: Transaction): Promise<string[]> {
    if (scope.tenant === Tenant.OrganizationProject) {
      const { organizationId } = organizationProjectFromScopeOrThrow(scope);
      const rows = await this.organizationRoleRepository.getOrganizationRoles(
        { organizationId },
        transaction
      );
      return rows.map((row) => row.roleId);
    }
    const { accountId } = accountProjectFromScopeOrThrow(scope);
    const rows = await this.accountRoleRepository.getAccountRoles({ accountId }, transaction);
    return rows.map((row) => row.roleId);
  }
}
