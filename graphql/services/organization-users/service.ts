import {
  AddOrganizationUserInput,
  OrganizationUser,
  RemoveOrganizationUserInput,
} from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { Repositories } from '@/graphql/repositories';
import { organizationUsersAuditLogs } from '@/graphql/repositories/organization-users/schema';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  DeleteParams,
} from '../common';

import {
  getOrganizationUsersParamsSchema,
  addOrganizationUserParamsSchema,
  removeOrganizationUserParamsSchema,
  organizationUserSchema,
} from './schemas';

export class OrganizationUserService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(organizationUsersAuditLogs, 'organizationUserId', user, db);
  }

  private async organizationExists(organizationId: string): Promise<void> {
    const organizations = await this.repositories.organizationRepository.getOrganizations({
      ids: [organizationId],
      limit: 1,
    });

    if (organizations.organizations.length === 0) {
      throw new Error('Organization not found');
    }
  }

  private async userExists(userId: string): Promise<void> {
    const users = await this.repositories.userRepository.getUsers({
      ids: [userId],
      limit: 1,
    });

    if (users.users.length === 0) {
      throw new Error('User not found');
    }
  }

  private async organizationHasUser(
    organizationId: string,
    userId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.organizationExists(organizationId);
    await this.userExists(userId);
    const existingOrganizationUsers =
      await this.repositories.organizationUserRepository.getOrganizationUsers(
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

    await this.organizationExists(organizationId);

    const result = await this.repositories.organizationUserRepository.getOrganizationUsers(
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
      throw new Error('Organization already has this user');
    }

    const organizationUser = await this.repositories.organizationUserRepository.addOrganizationUser(
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

    await this.logCreate(organizationUser.id, newValues, metadata, transaction);

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
      throw new Error('Organization does not have this user');
    }

    const isHardDelete = hardDelete === true;

    const organizationUser = isHardDelete
      ? await this.repositories.organizationUserRepository.hardDeleteOrganizationUser(
          validatedParams,
          transaction
        )
      : await this.repositories.organizationUserRepository.softDeleteOrganizationUser(
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
      await this.logHardDelete(organizationUser.id, oldValues, metadata, transaction);
    } else {
      await this.logSoftDelete(organizationUser.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(
      createDynamicSingleSchema(organizationUserSchema),
      organizationUser,
      context
    );
  }
}
