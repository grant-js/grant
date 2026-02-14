import { ROLES, RoleKey } from '@grantjs/constants';
import {
  AddAccountRoleInput,
  AccountRole,
  RemoveAccountRoleInput,
  Role,
  AccountType,
} from '@grantjs/schema';

import { BadRequestError, ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import {
  addAccountRoleInputSchema,
  getAccountRolesParamsSchema,
  accountRoleSchema,
  removeAccountRoleInputSchema,
} from './account-roles.schemas';
import { createDynamicSingleSchema, validateInput, validateOutput } from './common';

import type {
  IAuditLogger,
  IAccountRepository,
  IRoleRepository,
  IAccountRoleRepository,
  IAccountRoleService,
} from '@grantjs/core';

export class AccountRoleService implements IAccountRoleService {
  constructor(
    private readonly accountRepository: IAccountRepository,
    private readonly roleRepository: IRoleRepository,
    private readonly accountRoleRepository: IAccountRoleRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async accountExists(accountId: string, transaction?: Transaction): Promise<void> {
    const accounts = await this.accountRepository.getAccounts(
      { ids: [accountId], limit: 1 },
      transaction
    );

    if (accounts.accounts.length === 0) {
      throw new NotFoundError('Account');
    }
  }

  private async roleExists(roleId: string, transaction?: Transaction): Promise<void> {
    const roles = await this.roleRepository.getRoles({ ids: [roleId], limit: 1 }, transaction);

    if (roles.roles.length === 0) {
      throw new NotFoundError('Role');
    }
  }

  private async accountHasRole(
    accountId: string,
    roleId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.accountExists(accountId, transaction);
    await this.roleExists(roleId, transaction);
    const existingAccountRoles = await this.accountRoleRepository.getAccountRoles(
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

    const result = await this.accountRoleRepository.getAccountRoles(params, transaction);
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
      throw new ConflictError('Account already has this role', 'AccountRole', 'roleId');
    }

    const accountRole = await this.accountRoleRepository.addAccountRole(
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

    await this.audit.logCreate(accountRole.id, newValues, metadata, transaction);

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
      throw new NotFoundError('Role');
    }

    const isHardDelete = hardDelete === true;

    const accountRole = isHardDelete
      ? await this.accountRoleRepository.hardDeleteAccountRole({ accountId, roleId }, transaction)
      : await this.accountRoleRepository.softDeleteAccountRole({ accountId, roleId }, transaction);

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
      await this.audit.logHardDelete(accountRole.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(accountRole.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(accountRoleSchema), accountRole, context);
  }

  public async seedAccountRoles(
    accountId: string,
    transaction?: Transaction
  ): Promise<Array<{ role: Role; accountRole: AccountRole }>> {
    const context = 'AccountRoleService.seedAccountRoles';

    // Get account to determine type
    const accounts = await this.accountRepository.getAccounts(
      { ids: [accountId], limit: 1 },
      transaction
    );

    if (accounts.accounts.length === 0) {
      throw new NotFoundError('Account');
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
        `Invalid account type: ${accountType}. Expected 'personal' or 'organization'`
      );
    }

    const ownerRoleDefinition = ROLES[roleKey as keyof typeof ROLES];

    if (!ownerRoleDefinition) {
      throw new NotFoundError('Role');
    }

    const results = [];

    const existingRoles = await this.roleRepository.getRoles(
      {
        search: ownerRoleDefinition.name,
        limit: 1,
      },
      transaction
    );

    let ownerRole = existingRoles.roles.find((r) => r.name === ownerRoleDefinition.name);

    if (!ownerRole) {
      ownerRole = await this.roleRepository.createRole(
        {
          name: ownerRoleDefinition.name,
          description: ownerRoleDefinition.description,
        },
        transaction
      );
    }

    const existingAccountRoles = await this.accountRoleRepository.getAccountRoles(
      { accountId },
      transaction
    );

    if (!existingAccountRoles.some((ar) => ar.roleId === ownerRole!.id)) {
      const accountRole = await this.accountRoleRepository.addAccountRole(
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

      await this.audit.logCreate(accountRole.id, newValues, metadata, transaction);

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
