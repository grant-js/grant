import {
  MutationAddOrganizationUserArgs,
  MutationRemoveOrganizationUserArgs,
  OrganizationUser,
  QueryOrganizationUsersArgs,
} from '@/graphql/generated/types';
import {
  IOrganizationUserRepository,
  IOrganizationRepository,
  IUserRepository,
} from '@/graphql/repositories';
import { organizationUsersAuditLogs } from '@/graphql/repositories/organization-users/schema';
import { AuthenticatedUser } from '@/graphql/types';

import { AuditService, validateInput, validateOutput, createDynamicSingleSchema } from '../common';

import { IOrganizationUserService } from './interface';
import {
  getOrganizationUsersParamsSchema,
  addOrganizationUserParamsSchema,
  removeOrganizationUserParamsSchema,
  organizationUserSchema,
} from './schemas';

export class OrganizationUserService extends AuditService implements IOrganizationUserService {
  constructor(
    private readonly organizationUserRepository: IOrganizationUserRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly userRepository: IUserRepository,
    user: AuthenticatedUser | null
  ) {
    super(organizationUsersAuditLogs, 'organizationUserId', user);
  }

  private async organizationExists(organizationId: string): Promise<void> {
    const organizations = await this.organizationRepository.getOrganizations({
      ids: [organizationId],
      limit: 1,
    });

    if (organizations.organizations.length === 0) {
      throw new Error('Organization not found');
    }
  }

  private async userExists(userId: string): Promise<void> {
    const users = await this.userRepository.getUsers({
      ids: [userId],
      limit: 1,
    });

    if (users.users.length === 0) {
      throw new Error('User not found');
    }
  }

  private async organizationHasUser(organizationId: string, userId: string): Promise<boolean> {
    await this.organizationExists(organizationId);
    await this.userExists(userId);
    const existingOrganizationUsers = await this.organizationUserRepository.getOrganizationUsers({
      organizationId,
    });

    return existingOrganizationUsers.some((ou) => ou.userId === userId);
  }

  public async getOrganizationUsers(
    params: Omit<QueryOrganizationUsersArgs, 'scope'>
  ): Promise<OrganizationUser[]> {
    const validatedParams = validateInput(
      getOrganizationUsersParamsSchema,
      params,
      'getOrganizationUsers method'
    );

    await this.organizationExists(validatedParams.organizationId);

    const result = await this.organizationUserRepository.getOrganizationUsers(validatedParams);
    return validateOutput(
      createDynamicSingleSchema(organizationUserSchema).array(),
      result,
      'getOrganizationUsers method'
    );
  }

  public async addOrganizationUser(
    params: MutationAddOrganizationUserArgs
  ): Promise<OrganizationUser> {
    const validatedParams = validateInput(
      addOrganizationUserParamsSchema,
      params,
      'addOrganizationUser method'
    );

    const hasUser = await this.organizationHasUser(
      validatedParams.input.organizationId,
      validatedParams.input.userId
    );

    if (hasUser) {
      throw new Error('Organization already has this user');
    }

    const organizationUser =
      await this.organizationUserRepository.addOrganizationUser(validatedParams);

    const newValues = {
      id: organizationUser.id,
      organizationId: organizationUser.organizationId,
      userId: organizationUser.userId,
      createdAt: organizationUser.createdAt,
      updatedAt: organizationUser.updatedAt,
    };

    const metadata = {
      source: 'add_organization_user_mutation',
    };

    await this.logCreate(organizationUser.id, newValues, metadata);

    return validateOutput(
      createDynamicSingleSchema(organizationUserSchema),
      organizationUser,
      'addOrganizationUser method'
    );
  }

  public async removeOrganizationUser(
    params: MutationRemoveOrganizationUserArgs & { hardDelete?: boolean }
  ): Promise<OrganizationUser> {
    const validatedParams = validateInput(
      removeOrganizationUserParamsSchema,
      params,
      'removeOrganizationUser method'
    );

    const hasUser = await this.organizationHasUser(
      validatedParams.input.organizationId,
      validatedParams.input.userId
    );

    if (!hasUser) {
      throw new Error('Organization does not have this user');
    }

    const isHardDelete = params.hardDelete === true;

    const organizationUser = isHardDelete
      ? await this.organizationUserRepository.hardDeleteOrganizationUser(validatedParams)
      : await this.organizationUserRepository.softDeleteOrganizationUser(validatedParams);

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

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_organization_user_mutation',
      };
      await this.logHardDelete(organizationUser.id, oldValues, metadata);
    } else {
      const metadata = {
        source: 'soft_delete_organization_user_mutation',
      };
      await this.logSoftDelete(organizationUser.id, oldValues, newValues, metadata);
    }

    return validateOutput(
      createDynamicSingleSchema(organizationUserSchema),
      organizationUser,
      'removeOrganizationUser method'
    );
  }
}
