import {
  AddOrganizationUserInput,
  OrganizationUser,
  RemoveOrganizationUserInput,
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

import type {
  IAuditLogger,
  IOrganizationRepository,
  IOrganizationUserRepository,
  IOrganizationUserService,
  IUserRepository,
} from '@grantjs/core';

export class OrganizationUserService implements IOrganizationUserService {
  constructor(
    private readonly organizationRepository: IOrganizationRepository,
    private readonly userRepository: IUserRepository,
    private readonly organizationUserRepository: IOrganizationUserRepository,
    private readonly audit: IAuditLogger
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
    },
    transaction?: Transaction
  ): Promise<OrganizationUser[]> {
    const context = 'OrganizationUserService.getOrganizationUsers';
    const validatedParams = validateInput(getOrganizationUsersParamsSchema, params, context);
    const { organizationId } = validatedParams;

    await this.organizationExists(organizationId, transaction);

    const result = await this.organizationUserRepository.getOrganizationUsers(
      {
        organizationId,
      },
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
    const { organizationId, userId } = validatedParams;

    const hasUser = await this.organizationHasUser(organizationId, userId, transaction);

    if (hasUser) {
      throw new ConflictError('Organization already has this user', 'OrganizationUser', 'userId');
    }

    const organizationUser = await this.organizationUserRepository.addOrganizationUser(
      { organizationId, userId },
      transaction
    );

    const newValues = {
      id: organizationUser.id,
      organizationId: organizationUser.organizationId,
      userId: organizationUser.userId,
      createdAt: organizationUser.createdAt,
      updatedAt: organizationUser.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logCreate(organizationUser.id, newValues, metadata, transaction);

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
