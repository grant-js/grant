import type { IAuditLogger, IProjectAppRepository, IProjectAppService } from '@grantjs/core';
import type {
  CreateProjectAppInput,
  CreateProjectAppResult,
  MutationDeleteProjectAppArgs,
  ProjectApp,
  ProjectAppPage,
  QueryProjectAppsArgs,
  UpdateProjectAppInput,
} from '@grantjs/schema';

import { NotFoundError } from '@/lib/errors';
import { generateRandomBytes, hashSecret } from '@/lib/token.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams, SelectedFields } from '@/types';

import {
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
  validateInput,
  validateOutput,
  validatePage,
} from './common';
import {
  createProjectAppParamsSchema,
  createProjectAppResultSchema,
  deleteProjectAppParamsSchema,
  getProjectAppsParamsSchema,
  projectAppSchema,
  updateProjectAppParamsSchema,
} from './project-apps.schemas';

export class ProjectAppService implements IProjectAppService {
  constructor(
    private readonly projectAppRepository: IProjectAppRepository,
    private readonly audit: IAuditLogger
  ) {}

  public async getProjectApps(
    params: Omit<QueryProjectAppsArgs, 'scope'> & {
      projectId: string;
    } & SelectedFields<ProjectApp>,
    transaction?: Transaction
  ): Promise<ProjectAppPage> {
    const context = 'ProjectAppService.getProjectApps';
    validateInput(getProjectAppsParamsSchema, params, context);

    const result = await this.projectAppRepository.getProjectApps(params, transaction);

    validatePage(
      createDynamicPaginatedSchema(projectAppSchema, params.requestedFields),
      result.projectApps,
      result,
      context
    );

    return result;
  }

  public async createProjectApp(
    params: Omit<CreateProjectAppInput, 'scope'> & { projectId: string },
    transaction?: Transaction
  ): Promise<CreateProjectAppResult> {
    const context = 'ProjectAppService.createProjectApp';
    const validatedParams = validateInput(createProjectAppParamsSchema, params, context);

    const clientSecret = generateRandomBytes(32).toString('base64url');
    const clientSecretHash = hashSecret(clientSecret);

    const result = await this.projectAppRepository.createProjectApp(
      { ...validatedParams, clientSecretHash },
      transaction
    );

    const newValues = {
      id: result.id,
      clientId: result.clientId,
      name: result.name ?? null,
      redirectUris: result.redirectUris,
      scopes: validatedParams.scopes ?? null,
      createdAt: result.createdAt,
    };
    await this.audit.logCreate(result.id, newValues, { context }, transaction);

    const resultWithSecret: CreateProjectAppResult = {
      ...result,
      clientSecret,
    };
    return validateOutput(
      createDynamicSingleSchema(createProjectAppResultSchema),
      resultWithSecret,
      context
    );
  }

  public async getProjectAppById(
    id: string,
    transaction?: Transaction
  ): Promise<ProjectApp | null> {
    return this.projectAppRepository.getProjectAppById(id, transaction);
  }

  public async getProjectAppByClientId(
    clientId: string,
    transaction?: Transaction
  ): Promise<ProjectApp | null> {
    return this.projectAppRepository.getProjectAppByClientId(clientId, transaction);
  }

  public async updateProjectApp(
    params: { id: string; projectId: string } & Omit<UpdateProjectAppInput, 'scope'>,
    transaction?: Transaction
  ): Promise<ProjectApp> {
    const context = 'ProjectAppService.updateProjectApp';
    const validatedParams = validateInput(updateProjectAppParamsSchema, params, context);

    const existing = await this.projectAppRepository.getProjectAppById(
      validatedParams.id,
      transaction
    );
    if (!existing) {
      throw new NotFoundError('ProjectApp');
    }

    const updated = await this.projectAppRepository.updateProjectApp(validatedParams, transaction);

    const oldValues = {
      id: existing.id,
      name: existing.name,
      redirectUris: existing.redirectUris,
      scopes: existing.scopes,
      enabledProviders: existing.enabledProviders,
      allowSignUp: existing.allowSignUp,
      signUpRoleId: existing.signUpRoleId,
      updatedAt: existing.updatedAt,
    };
    const newValues = {
      id: updated.id,
      name: updated.name,
      redirectUris: updated.redirectUris,
      scopes: updated.scopes,
      enabledProviders: updated.enabledProviders,
      allowSignUp: updated.allowSignUp,
      signUpRoleId: updated.signUpRoleId,
      updatedAt: updated.updatedAt,
    };
    await this.audit.logUpdate(updated.id, oldValues, newValues, { context }, transaction);

    return validateOutput(createDynamicSingleSchema(projectAppSchema), updated, context);
  }

  public async deleteProjectApp(
    params: Omit<MutationDeleteProjectAppArgs, 'scope'> & { projectId: string } & DeleteParams,
    transaction?: Transaction
  ): Promise<ProjectApp> {
    const context = 'ProjectAppService.deleteProjectApp';
    const validatedParams = validateInput(deleteProjectAppParamsSchema, params, context);

    const existing = await this.projectAppRepository.getProjectAppById(
      validatedParams.id,
      transaction
    );
    if (!existing) {
      throw new NotFoundError('ProjectApp');
    }

    const deleted = await this.projectAppRepository.softDeleteProjectApp(
      validatedParams,
      transaction
    );

    const oldValues = {
      id: existing.id,
      name: existing.name,
      redirectUris: existing.redirectUris,
      scopes: existing.scopes,
      updatedAt: existing.updatedAt,
    };
    await this.audit.logSoftDelete(
      deleted.id,
      oldValues,
      {
        ...oldValues,
        deletedAt: deleted.deletedAt ?? new Date(),
      },
      { context },
      transaction
    );

    return validateOutput(createDynamicSingleSchema(projectAppSchema), deleted, context);
  }
}
