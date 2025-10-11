import { accountProjectsAuditLogs, DbSchema } from '@logusgraphics/grant-database';
import {
  AddAccountProjectInput,
  OrganizationProject,
  RemoveAccountProjectInput,
} from '@logusgraphics/grant-schema';

import {
  accountProjectSchema,
  addAccountProjectInputSchema,
  queryAccountProjectArgsSchema,
  queryAccountProjectsArgsSchema,
  removeAccountProjectInputSchema,
} from './account-projects.schemas';
import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  DeleteParams,
} from './common';

import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';
import { AuthenticatedUser } from '@/types';

export class AccountProjectService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(accountProjectsAuditLogs, 'accountProjectId', user, db);
  }

  private async accountExists(accountId: string, transaction?: Transaction): Promise<void> {
    const accounts = await this.repositories.accountRepository.getAccounts(
      {
        ids: [accountId],
        limit: 1,
      },
      transaction
    );

    if (accounts.accounts.length === 0) {
      throw new Error('Account not found');
    }
  }

  private async projectExists(projectId: string, transaction?: Transaction): Promise<void> {
    const projects = await this.repositories.projectRepository.getProjects(
      {
        ids: [projectId],
        limit: 1,
      },
      transaction
    );

    if (projects.projects.length === 0) {
      throw new Error('Project not found');
    }
  }

  private async accountHasProject(
    accountId: string,
    projectId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.accountExists(accountId, transaction);
    await this.projectExists(projectId, transaction);
    const existingAccountProjects =
      await this.repositories.accountProjectRepository.getAccountProjects(
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

    const result = await this.repositories.accountProjectRepository.getAccountProjects(
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
  ): Promise<OrganizationProject> {
    const validationContext = 'AccountProjectService.getAccountProject';
    const validatedParams = validateInput(queryAccountProjectArgsSchema, params, validationContext);
    const { projectId } = validatedParams;

    await this.projectExists(projectId, transaction);

    const result = await this.repositories.accountProjectRepository.getAccountProject(
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
      throw new Error('Account already has this project');
    }

    const accountProject = await this.repositories.accountProjectRepository.addAccountProject(
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

    await this.logCreate(accountProject.id, newValues, metadata, transaction);

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
      throw new Error('Account does not have this project');
    }

    const isHardDelete = hardDelete === true;

    const accountProject = isHardDelete
      ? await this.repositories.accountProjectRepository.hardDeleteAccountProject(
          { accountId, projectId },
          transaction
        )
      : await this.repositories.accountProjectRepository.softDeleteAccountProject(
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
      await this.logHardDelete(accountProject.id, oldValues, metadata, transaction);
    } else {
      await this.logSoftDelete(accountProject.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(accountProjectSchema), accountProject, context);
  }
}
