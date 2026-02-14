import {
  AccountProject,
  AddAccountProjectInput,
  OrganizationProject,
  RemoveAccountProjectInput,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import {
  accountProjectSchema,
  addAccountProjectInputSchema,
  queryAccountProjectArgsSchema,
  queryAccountProjectsArgsSchema,
  removeAccountProjectInputSchema,
} from './account-projects.schemas';
import { createDynamicSingleSchema, validateInput, validateOutput } from './common';

import type {
  IAuditLogger,
  IAccountRepository,
  IProjectRepository,
  IAccountProjectRepository,
  IAccountProjectService,
} from '@grantjs/core';

export class AccountProjectService implements IAccountProjectService {
  constructor(
    private readonly accountRepository: IAccountRepository,
    private readonly projectRepository: IProjectRepository,
    private readonly accountProjectRepository: IAccountProjectRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async accountExists(accountId: string, transaction?: Transaction): Promise<void> {
    const accounts = await this.accountRepository.getAccounts(
      {
        ids: [accountId],
        limit: 1,
      },
      transaction
    );

    if (accounts.accounts.length === 0) {
      throw new NotFoundError('Account');
    }
  }

  private async projectExists(projectId: string, transaction?: Transaction): Promise<void> {
    const projects = await this.projectRepository.getProjects(
      {
        ids: [projectId],
        limit: 1,
      },
      transaction
    );

    if (projects.projects.length === 0) {
      throw new NotFoundError('Project');
    }
  }

  private async accountHasProject(
    accountId: string,
    projectId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.accountExists(accountId, transaction);
    await this.projectExists(projectId, transaction);
    const existingAccountProjects = await this.accountProjectRepository.getAccountProjects(
      { accountId },
      transaction
    );
    return existingAccountProjects.some((ap) => ap.projectId === projectId);
  }

  public async getAccountProjects(
    params: { accountId: string },
    transaction?: Transaction
  ): Promise<OrganizationProject[]> {
    const validationContext = 'AccountProjectService.getAccountProjects';
    const validatedParams = validateInput(
      queryAccountProjectsArgsSchema,
      params,
      validationContext
    );

    const { accountId } = validatedParams;

    await this.accountExists(accountId, transaction);

    const result = await this.accountProjectRepository.getAccountProjects(
      { accountId },
      transaction
    );

    return validateOutput(
      createDynamicSingleSchema(accountProjectSchema).array(),
      result,
      validationContext
    );
  }

  public async getAccountProject(
    params: { projectId: string },
    transaction?: Transaction
  ): Promise<AccountProject> {
    const validationContext = 'AccountProjectService.getAccountProject';
    const validatedParams = validateInput(queryAccountProjectArgsSchema, params, validationContext);
    const { projectId } = validatedParams;

    await this.projectExists(projectId, transaction);

    const result = await this.accountProjectRepository.getAccountProject(
      { projectId },
      transaction
    );

    return validateOutput(
      createDynamicSingleSchema(accountProjectSchema),
      result,
      validationContext
    );
  }

  public async addAccountProject(
    params: AddAccountProjectInput,
    transaction?: Transaction
  ): Promise<OrganizationProject> {
    const context = 'AccountProjectService.addAccountProject';
    const validatedParams = validateInput(addAccountProjectInputSchema, params, context);

    const { accountId, projectId } = validatedParams;
    const hasProject = await this.accountHasProject(accountId, projectId, transaction);

    if (hasProject) {
      throw new ConflictError('Account already has this project', 'AccountProject', 'projectId');
    }

    const accountProject = await this.accountProjectRepository.addAccountProject(
      { accountId, projectId },
      transaction
    );

    const newValues = {
      id: accountProject.id,
      accountId: accountProject.accountId,
      projectId: accountProject.projectId,
      createdAt: accountProject.createdAt,
      updatedAt: accountProject.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logCreate(accountProject.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(accountProjectSchema), accountProject, context);
  }

  public async removeAccountProject(
    params: RemoveAccountProjectInput & DeleteParams,
    transaction?: Transaction
  ): Promise<OrganizationProject> {
    const context = 'AccountProjectService.removeAccountProject';
    const validatedParams = validateInput(removeAccountProjectInputSchema, params, context);

    const { accountId, projectId, hardDelete } = validatedParams;

    const hasProject = await this.accountHasProject(accountId, projectId);

    if (!hasProject) {
      throw new NotFoundError('Project');
    }

    const isHardDelete = hardDelete === true;

    const accountProject = isHardDelete
      ? await this.accountProjectRepository.hardDeleteAccountProject(
          { accountId, projectId },
          transaction
        )
      : await this.accountProjectRepository.softDeleteAccountProject(
          { accountId, projectId },
          transaction
        );

    const oldValues = {
      id: accountProject.id,
      accountId: accountProject.accountId,
      projectId: accountProject.projectId,
      createdAt: accountProject.createdAt,
      updatedAt: accountProject.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: accountProject.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.audit.logHardDelete(accountProject.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(
        accountProject.id,
        oldValues,
        newValues,
        metadata,
        transaction
      );
    }

    return validateOutput(createDynamicSingleSchema(accountProjectSchema), accountProject, context);
  }
}
