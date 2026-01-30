import { canAssignRole } from '@grantjs/constants';
import { GrantAuth } from '@grantjs/core';
import { DbSchema } from '@grantjs/database';
import { ApiKey, OrganizationProjectApiKey, Role } from '@grantjs/schema';

import { AuthorizationError, BadRequestError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addOrganizationProjectApiKeyParamsSchema,
  getOrganizationProjectApiKeysParamsSchema,
  organizationProjectApiKeySchema,
} from './organization-project-api-keys.schemas';

export class OrganizationProjectApiKeyService {
  constructor(
    private readonly repositories: Repositories,
    private readonly user: GrantAuth | null,
    private readonly db: DbSchema
  ) {}

  private getCurrentUserId(): string {
    if (!this.user?.userId) {
      throw new AuthorizationError('Authentication required', 'errors:auth.unauthorized');
    }
    return this.user.userId;
  }

  private async getUserRoleNameInOrganization(
    organizationId: string,
    userId: string,
    transaction?: Transaction
  ): Promise<string | null> {
    const member = await this.repositories.organizationMemberRepository.getOrganizationMember(
      { organizationId, userId },
      transaction
    );
    return member?.role?.name ?? null;
  }

  private async ensureOrganizationProjectExists(
    organizationId: string,
    projectId: string,
    transaction?: Transaction
  ): Promise<void> {
    const organizationProjects =
      await this.repositories.organizationProjectRepository.getOrganizationProjects(
        { organizationId },
        transaction
      );
    const organizationProject = organizationProjects.find((op) => op.projectId === projectId);
    if (!organizationProject) {
      throw new NotFoundError(
        'Organization project not found for scope',
        'errors:notFound.organizationProject'
      );
    }
  }

  private async ensureOrganizationHasRole(
    organizationId: string,
    roleId: string,
    transaction?: Transaction
  ): Promise<void> {
    const organizationRoles =
      await this.repositories.organizationRoleRepository.getOrganizationRoles(
        { organizationId },
        transaction
      );
    if (!organizationRoles.some((or) => or.roleId === roleId)) {
      throw new BadRequestError(
        'Role is not assigned to this organization',
        'errors:validation.invalid',
        { field: 'roleId' }
      );
    }
  }

  public async getOrganizationProjectApiKeys(
    params: { organizationId?: string; projectId?: string; apiKeyId?: string },
    transaction?: Transaction
  ): Promise<OrganizationProjectApiKey[]> {
    const context = 'OrganizationProjectApiKeyService.getOrganizationProjectApiKeys';
    const validated = validateInput(getOrganizationProjectApiKeysParamsSchema, params, context);
    const result =
      await this.repositories.organizationProjectApiKeyRepository.getOrganizationProjectApiKeys(
        validated,
        transaction
      );
    return validateOutput(
      createDynamicSingleSchema(organizationProjectApiKeySchema).array(),
      result,
      context
    );
  }

  public async validateOrganizationProjectApiKeyRolePermission(
    organizationId: string,
    roleId: string,
    transaction?: Transaction
  ): Promise<void> {
    const currentUserId = this.getCurrentUserId();

    const currentUserRoleName = await this.getUserRoleNameInOrganization(
      organizationId,
      currentUserId,
      transaction
    );

    if (!currentUserRoleName) {
      throw new AuthorizationError(
        'You are not a member of this organization',
        'errors:auth.notOrganizationMember'
      );
    }

    const targetRole = await this.repositories.roleRepository.getRoles(
      { ids: [roleId], limit: 1 },
      transaction
    );

    if (targetRole.roles.length === 0) {
      throw new NotFoundError('Role not found', 'errors:notFound.role', { roleId });
    }

    if (!canAssignRole(currentUserRoleName, targetRole.roles[0].name)) {
      throw new AuthorizationError(
        'Cannot create API keys with equal or higher privilege than your own role',
        'errors:auth.cannotAssignHigherRole'
      );
    }
  }

  public async validateCanManageOrganizationProjectApiKey(
    organizationId: string,
    projectId: string,
    apiKeyId: string,
    transaction?: Transaction
  ): Promise<void> {
    const pivot = await this.getByApiKeyAndOrganizationAndProject(
      apiKeyId,
      organizationId,
      projectId,
      transaction
    );

    if (!pivot) {
      throw new NotFoundError('Organization project API key not found', 'errors:notFound.apiKey', {
        apiKeyId,
      });
    }

    const currentUserId = this.getCurrentUserId();
    const currentUserRoleName = await this.getUserRoleNameInOrganization(
      organizationId,
      currentUserId,
      transaction
    );

    if (!currentUserRoleName) {
      throw new AuthorizationError(
        'You are not a member of this organization',
        'errors:auth.notOrganizationMember'
      );
    }

    const keyRole = await this.repositories.roleRepository.getRoles(
      { ids: [pivot.organizationRoleId], limit: 1 },
      transaction
    );

    if (keyRole.roles.length === 0) {
      throw new NotFoundError('Role not found', 'errors:notFound.role', {
        roleId: pivot.organizationRoleId,
      });
    }

    if (!canAssignRole(currentUserRoleName, keyRole.roles[0].name)) {
      throw new AuthorizationError(
        'Cannot manage API keys with equal or higher privilege than your own role',
        'errors:auth.insufficientPrivilege'
      );
    }
  }

  public async filterApiKeysByManageable(
    organizationId: string,
    apiKeys: (ApiKey & { role?: Role | null })[],
    transaction?: Transaction
  ): Promise<(ApiKey & { role?: Role | null })[]> {
    const currentUserId = this.getCurrentUserId();
    const currentUserRoleName = await this.getUserRoleNameInOrganization(
      organizationId,
      currentUserId,
      transaction
    );

    if (!currentUserRoleName) {
      return [];
    }

    return apiKeys.filter(
      (key) => !key.role?.name || canAssignRole(currentUserRoleName, key.role!.name!)
    );
  }

  public async addOrganizationProjectApiKey(
    params: {
      organizationId: string;
      projectId: string;
      apiKeyId: string;
      organizationRoleId: string;
    },
    transaction?: Transaction
  ): Promise<OrganizationProjectApiKey> {
    const context = 'OrganizationProjectApiKeyService.addOrganizationProjectApiKey';
    const validated = validateInput(addOrganizationProjectApiKeyParamsSchema, params, context);
    const { organizationId, projectId, organizationRoleId } = validated;

    await this.ensureOrganizationProjectExists(organizationId, projectId, transaction);
    await this.ensureOrganizationHasRole(organizationId, organizationRoleId, transaction);

    const pivot =
      await this.repositories.organizationProjectApiKeyRepository.addOrganizationProjectApiKey(
        validated,
        transaction
      );
    return validateOutput(
      createDynamicSingleSchema(organizationProjectApiKeySchema),
      pivot,
      context
    );
  }

  public async getByApiKeyAndOrganizationAndProject(
    apiKeyId: string,
    organizationId: string,
    projectId: string,
    transaction?: Transaction
  ): Promise<OrganizationProjectApiKey | null> {
    const context = 'OrganizationProjectApiKeyService.getByApiKeyAndOrganizationAndProject';
    const result =
      await this.repositories.organizationProjectApiKeyRepository.getByApiKeyAndOrganizationAndProject(
        apiKeyId,
        organizationId,
        projectId,
        transaction
      );
    if (result === null) {
      return null;
    }
    return validateOutput(
      createDynamicSingleSchema(organizationProjectApiKeySchema),
      result,
      context
    );
  }
}
