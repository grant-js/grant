import { DbSchema } from '@logusgraphics/grant-database';
import { organizationUsersAuditLogs } from '@logusgraphics/grant-database';
import {
  AddOrganizationUserInput,
  OrganizationUser,
  RemoveOrganizationUserInput,
} from '@logusgraphics/grant-schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';
import { AuthenticatedUser } from '@/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  DeleteParams,
} from './common';
import {
  getOrganizationUsersParamsSchema,
  addOrganizationUserParamsSchema,
  removeOrganizationUserParamsSchema,
  organizationUserSchema,
} from './organization-users.schemas';

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
      throw new NotFoundError('Organization not found', 'errors:notFound.organization');
    }
  }

  private async userExists(userId: string): Promise<void> {
    const users = await this.repositories.userRepository.getUsers({
      ids: [userId],
      limit: 1,
    });

    if (users.users.length === 0) {
      throw new NotFoundError('User not found', 'errors:notFound.user');
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
      throw new ConflictError(
        'Organization already has this user',
        'errors:conflict.duplicateEntry',
        { resource: 'OrganizationUser', field: 'userId' }
      );
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
      throw new NotFoundError('Organization does not have this user', 'errors:notFound.user');
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
