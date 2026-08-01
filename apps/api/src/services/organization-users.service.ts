import type {
  IAuditLogger,
  IEventPublisher,
  IOrganizationRepository,
  IOrganizationRoleRepository,
  IOrganizationUserRepository,
  IOrganizationUserService,
  IUserRepository,
} from '@grantjs/core';
import {
  AddOrganizationUserInput,
  OrganizationUser,
  RemoveOrganizationUserInput,
  Tenant,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addOrganizationUserParamsSchema,
  getOrganizationUsersParamsSchema,
  organizationUserSchema,
  removeOrganizationUserParamsSchema,
} from './organization-users.schemas';

export class OrganizationUserService implements IOrganizationUserService {
  constructor(
    private readonly organizationRepository: IOrganizationRepository,
    private readonly userRepository: IUserRepository,
    private readonly organizationUserRepository: IOrganizationUserRepository,
    private readonly organizationRoleRepository: IOrganizationRoleRepository,
    private readonly audit: IAuditLogger,
    private readonly events: IEventPublisher
  ) {}

  private async organizationExists(
    organizationId: string,
    transaction?: Transaction
  ): Promise<void> {
    const organizations = await this.organizationRepository.getOrganizations(
      {
        ids: [organizationId],
        limit: 1,
      },
      transaction
    );

    if (organizations.organizations.length === 0) {
      throw new NotFoundError('Organization');
    }
  }

  private async userExists(userId: string, transaction?: Transaction): Promise<void> {
    const users = await this.userRepository.getUsers(
      {
        ids: [userId],
        limit: 1,
      },
      transaction
    );

    if (users.users.length === 0) {
      throw new NotFoundError('User');
    }
  }

  private async organizationHasUser(
    organizationId: string,
    userId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.organizationExists(organizationId, transaction);
    await this.userExists(userId, transaction);
    const existingOrganizationUsers = await this.organizationUserRepository.getOrganizationUsers(
      {
        organizationId,
      },
      transaction
    );

    return existingOrganizationUsers.some((ou) => ou.userId === userId);
  }

  public async getOrganizationUsers(
    params: {
      organizationId: string;
      userId?: string;
    },
    transaction?: Transaction
  ): Promise<OrganizationUser[]> {
    const context = 'OrganizationUserService.getOrganizationUsers';
    const validatedParams = validateInput(getOrganizationUsersParamsSchema, params, context);
    const { organizationId, userId } = validatedParams;

    await this.organizationExists(organizationId, transaction);

    const result = await this.organizationUserRepository.getOrganizationUsers(
      { organizationId, ...(userId && { userId }) },
      transaction
    );
    return validateOutput(
      createDynamicSingleSchema(organizationUserSchema).array(),
      result,
      context
    );
  }

  public async addOrganizationUser(
    params: AddOrganizationUserInput,
    transaction?: Transaction
  ): Promise<OrganizationUser> {
    const context = 'OrganizationUserService.addOrganizationUser';
    const validatedParams = validateInput(addOrganizationUserParamsSchema, params, context);
    const { organizationId, userId, roleId } = validatedParams;

    await this.organizationExists(organizationId, transaction);
    const orgRoles = await this.organizationRoleRepository.getOrganizationRoles(
      { organizationId },
      transaction
    );
    const roleBelongsToOrg = orgRoles.some((r) => r.roleId === roleId);
    if (!roleBelongsToOrg) {
      throw new NotFoundError('Role', roleId);
    }

    const hasUser = await this.organizationHasUser(organizationId, userId, transaction);

    if (hasUser) {
      throw new ConflictError('Organization already has this user', 'OrganizationUser', 'userId');
    }

    const organizationUser = await this.organizationUserRepository.addOrganizationUser(
      { organizationId, userId, roleId },
      transaction
    );

    const newValues = {
      id: organizationUser.id,
      organizationId: organizationUser.organizationId,
      userId: organizationUser.userId,
      roleId: organizationUser.roleId,
      createdAt: organizationUser.createdAt,
      updatedAt: organizationUser.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logCreate(organizationUser.id, newValues, metadata, transaction);

    await this.events.publish(
      {
        type: 'organization.member_added',
        scope: { tenant: Tenant.Organization, id: organizationUser.organizationId },
        subjectUserId: organizationUser.userId,
        aggregate: { kind: 'organizationUser', id: organizationUser.id },
        data: { after: newValues },
      },
      transaction
    );

    return validateOutput(
      createDynamicSingleSchema(organizationUserSchema),
      organizationUser,
      context
    );
  }

  public async removeOrganizationUser(
    params: RemoveOrganizationUserInput & DeleteParams,
    transaction?: Transaction
  ): Promise<OrganizationUser> {
    const context = 'OrganizationUserService.removeOrganizationUser';
    const validatedParams = validateInput(removeOrganizationUserParamsSchema, params, context);
    const { organizationId, userId, hardDelete } = validatedParams;

    const hasUser = await this.organizationHasUser(organizationId, userId, transaction);

    if (!hasUser) {
      throw new NotFoundError('User');
    }

    const isHardDelete = hardDelete === true;

    const organizationUser = isHardDelete
      ? await this.organizationUserRepository.hardDeleteOrganizationUser(
          validatedParams,
          transaction
        )
      : await this.organizationUserRepository.softDeleteOrganizationUser(
          validatedParams,
          transaction
        );

    const oldValues = {
      id: organizationUser.id,
      organizationId: organizationUser.organizationId,
      userId: organizationUser.userId,
      createdAt: organizationUser.createdAt,
      updatedAt: organizationUser.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: organizationUser.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.audit.logHardDelete(organizationUser.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(
        organizationUser.id,
        oldValues,
        newValues,
        metadata,
        transaction
      );
    }

    await this.events.publish(
      {
        type: 'organization.member_removed',
        scope: { tenant: Tenant.Organization, id: organizationUser.organizationId },
        subjectUserId: organizationUser.userId,
        aggregate: { kind: 'organizationUser', id: organizationUser.id },
        data: { before: oldValues },
      },
      transaction
    );

    return validateOutput(
      createDynamicSingleSchema(organizationUserSchema),
      organizationUser,
      context
    );
  }

  public async getUserOrganizationMemberships(
    userId: string,
    transaction?: Transaction
  ): Promise<
    Array<{
      organizationId: string;
      organizationName: string;
      role: string;
      joinedAt: Date;
    }>
  > {
    const memberships = await this.organizationUserRepository.getUserOrganizationMemberships(
      userId,
      transaction
    );

    return memberships.map((m) => ({
      organizationId: m.organizationId,
      organizationName: m.organizationName,
      role: m.role,
      joinedAt: m.joinedAt instanceof Date ? m.joinedAt : new Date(m.joinedAt),
    }));
  }
}
