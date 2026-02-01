import { ROLES, RoleKey } from '@grantjs/constants';
import { GrantAuth } from '@grantjs/core';
import { DbSchema, accountRoleAuditLogs } from '@grantjs/database';
import {
  AddAccountRoleInput,
  AccountRole,
  RemoveAccountRoleInput,
  Role,
  AccountType,
} from '@grantjs/schema';

import { BadRequestError, ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';

import {
  addAccountRoleInputSchema,
  getAccountRolesParamsSchema,
  accountRoleSchema,
  removeAccountRoleInputSchema,
} from './account-roles.schemas';
import {
  AuditService,
  DeleteParams,
  createDynamicSingleSchema,
  validateInput,
  validateOutput,
} from './common';

export class AccountRoleService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    readonly user: GrantAuth | null,
    readonly db: DbSchema
  ) {
    super(accountRoleAuditLogs, 'accountRoleId', user, db);
  }

  private async accountExists(accountId: string, transaction?: Transaction): Promise<void> {
    const accounts = await this.repositories.accountRepository.getAccounts(
      { ids: [accountId], limit: 1 },
      transaction
    );

    if (accounts.accounts.length === 0) {
      throw new NotFoundError('Account not found', 'errors:notFound.account');
    }
  }

  private async roleExists(roleId: string, transaction?: Transaction): Promise<void> {
    const roles = await this.repositories.roleRepository.getRoles(
      { ids: [roleId], limit: 1 },
      transaction
    );

    if (roles.roles.length === 0) {
      throw new NotFoundError('Role not found', 'errors:notFound.role');
    }
  }

  private async accountHasRole(
    accountId: string,
    roleId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.accountExists(accountId, transaction);
    await this.roleExists(roleId, transaction);
    const existingAccountRoles = await this.repositories.accountRoleRepository.getAccountRoles(
      { accountId },
      transaction
    );

    return existingAccountRoles.some((ar) => ar.roleId === roleId);
  }

  public async getAccountRoles(
    params: {
      accountId: string;
    },
    transaction?: Transaction
  ): Promise<AccountRole[]> {
    const context = 'AccountRoleService.getAccountRoles';
    const validatedParams = validateInput(getAccountRolesParamsSchema, params, context);
    const { accountId } = validatedParams;

    await this.accountExists(accountId, transaction);

    const result = await this.repositories.accountRoleRepository.getAccountRoles(
      params,
      transaction
    );
    return validateOutput(createDynamicSingleSchema(accountRoleSchema).array(), result, context);
  }

  public async addAccountRole(
    params: AddAccountRoleInput,
    transaction?: Transaction
  ): Promise<AccountRole> {
    const context = 'AccountRoleService.addAccountRole';
    const validatedParams = validateInput(addAccountRoleInputSchema, params, context);
    const { accountId, roleId } = validatedParams;

    const hasRole = await this.accountHasRole(accountId, roleId, transaction);

    if (hasRole) {
      throw new ConflictError('Account already has this role', 'errors:conflict.duplicateEntry', {
        resource: 'AccountRole',
        field: 'roleId',
      });
    }

    const accountRole = await this.repositories.accountRoleRepository.addAccountRole(
      { accountId, roleId },
      transaction
    );

    const newValues = {
      id: accountRole.id,
      accountId: accountRole.accountId,
      roleId: accountRole.roleId,
      createdAt: accountRole.createdAt,
      updatedAt: accountRole.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logCreate(accountRole.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(accountRoleSchema), accountRole, context);
  }

  public async removeAccountRole(
    params: RemoveAccountRoleInput & DeleteParams,
    transaction?: Transaction
  ): Promise<AccountRole> {
    const context = 'AccountRoleService.removeAccountRole';
    const validatedParams = validateInput(removeAccountRoleInputSchema, params, context);
    const { accountId, roleId, hardDelete } = validatedParams;

    const hasRole = await this.accountHasRole(accountId, roleId, transaction);

    if (!hasRole) {
      throw new NotFoundError('Account does not have this role', 'errors:notFound.role');
    }

    const isHardDelete = hardDelete === true;

    const accountRole = isHardDelete
      ? await this.repositories.accountRoleRepository.hardDeleteAccountRole(
          { accountId, roleId },
          transaction
        )
      : await this.repositories.accountRoleRepository.softDeleteAccountRole(
          { accountId, roleId },
          transaction
        );

    const oldValues = {
      id: accountRole.id,
      accountId: accountRole.accountId,
      roleId: accountRole.roleId,
      createdAt: accountRole.createdAt,
      updatedAt: accountRole.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: accountRole.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.logHardDelete(accountRole.id, oldValues, metadata, transaction);
    } else {
      await this.logSoftDelete(accountRole.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(accountRoleSchema), accountRole, context);
  }

  public async seedAccountRoles(
    accountId: string,
    transaction?: Transaction
  ): Promise<Array<{ role: Role; accountRole: AccountRole }>> {
    const context = 'AccountRoleService.seedAccountRoles';

    // Get account to determine type
    const accounts = await this.repositories.accountRepository.getAccounts(
      { ids: [accountId], limit: 1 },
      transaction
    );

    if (accounts.accounts.length === 0) {
      throw new NotFoundError('Account not found', 'errors:notFound.account');
    }

    const account = accounts.accounts[0];
    const accountType = account.type;

    // Determine which role to seed based on account type
    let roleKey: string;
    if (accountType === AccountType.Personal) {
      roleKey = RoleKey.PersonalAccountOwner;
    } else if (accountType === AccountType.Organization) {
      roleKey = RoleKey.OrganizationAccountOwner;
    } else {
      throw new BadRequestError(
        `Invalid account type: ${accountType}. Expected 'personal' or 'organization'`,
        'errors:validation.invalidAccountType'
      );
    }

    const ownerRoleDefinition = ROLES[roleKey as keyof typeof ROLES];

    if (!ownerRoleDefinition) {
      throw new NotFoundError(
        `Role definition not found for account type: ${accountType}`,
        'errors:notFound.role'
      );
    }

    const results = [];

    const existingRoles = await this.repositories.roleRepository.getRoles(
      {
        search: ownerRoleDefinition.name,
        limit: 1,
      },
      transaction
    );

    let ownerRole = existingRoles.roles.find((r) => r.name === ownerRoleDefinition.name);

    if (!ownerRole) {
      ownerRole = await this.repositories.roleRepository.createRole(
        {
          name: ownerRoleDefinition.name,
          description: ownerRoleDefinition.description,
        },
        transaction
      );
    }

    const existingAccountRoles = await this.repositories.accountRoleRepository.getAccountRoles(
      { accountId },
      transaction
    );

    if (!existingAccountRoles.some((ar) => ar.roleId === ownerRole!.id)) {
      const accountRole = await this.repositories.accountRoleRepository.addAccountRole(
        {
          accountId,
          roleId: ownerRole.id,
        },
        transaction
      );

      const newValues = {
        id: accountRole.id,
        accountId: accountRole.accountId,
        roleId: accountRole.roleId,
        createdAt: accountRole.createdAt,
        updatedAt: accountRole.updatedAt,
      };

      const metadata = {
        context,
        roleName: ownerRoleDefinition.name,
        seeded: true,
      };

      await this.logCreate(accountRole.id, newValues, metadata, transaction);

      results.push({
        role: ownerRole,
        accountRole,
      });
    } else {
      const existingAccountRole = existingAccountRoles.find((ar) => ar.roleId === ownerRole!.id)!;
      results.push({
        role: ownerRole,
        accountRole: existingAccountRole,
      });
    }

    return results;
  }
}
