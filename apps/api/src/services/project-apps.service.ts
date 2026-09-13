import type {
  IAuditLogger,
  IFileStorageService,
  IProjectAppRepository,
  IProjectAppService,
} from '@grantjs/core';
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
import {
  hydratePictureUrl,
  hydratePictureUrls,
  picturePathWhenSettingUrl,
} from '@/lib/picture-url.lib';
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
  setProjectAppPictureParamsSchema,
  updateProjectAppParamsSchema,
} from './project-apps.schemas';

export class ProjectAppService implements IProjectAppService {
  constructor(
    private readonly projectAppRepository: IProjectAppRepository,
    private readonly audit: IAuditLogger,
    private readonly fileStorage: IFileStorageService
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
    await hydratePictureUrls(this.fileStorage, result.projectApps);

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
    const app = await this.projectAppRepository.getProjectAppById(id, transaction);
    if (app) {
      await hydratePictureUrl(this.fileStorage, app);
    }
    return app;
  }

  public async getProjectAppByClientId(
    clientId: string,
    transaction?: Transaction
  ): Promise<ProjectApp | null> {
    const app = await this.projectAppRepository.getProjectAppByClientId(clientId, transaction);
    if (app) {
      await hydratePictureUrl(this.fileStorage, app);
    }
    return app;
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
      primaryColor: existing.primaryColor ?? null,
      showHelpPanel: existing.showHelpPanel ?? null,
      themeMode: existing.themeMode ?? null,
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
      primaryColor: updated.primaryColor ?? null,
      showHelpPanel: updated.showHelpPanel ?? null,
      themeMode: updated.themeMode ?? null,
      updatedAt: updated.updatedAt,
    };
    await this.audit.logUpdate(updated.id, oldValues, newValues, { context }, transaction);

    await hydratePictureUrl(this.fileStorage, updated);
    return validateOutput(createDynamicSingleSchema(projectAppSchema), updated, context);
  }

  public async setProjectAppPicture(
    projectAppId: string,
    input: { picturePath?: string | null; pictureUrl?: string | null },
    transaction?: Transaction
  ): Promise<ProjectApp> {
    const context = 'ProjectAppService.setProjectAppPicture';
    const validatedParams = validateInput(
      setProjectAppPictureParamsSchema,
      { projectAppId, ...picturePathWhenSettingUrl(input) },
      context
    );

    const existing = await this.projectAppRepository.getProjectAppById(
      validatedParams.projectAppId,
      transaction
    );
    if (!existing) {
      throw new NotFoundError('ProjectApp');
    }

    const updated = await this.projectAppRepository.setProjectAppPicture(
      validatedParams.projectAppId,
      {
        ...(validatedParams.pictureUrl !== undefined
          ? { pictureUrl: validatedParams.pictureUrl }
          : {}),
        ...(validatedParams.picturePath !== undefined
          ? { picturePath: validatedParams.picturePath }
          : {}),
      },
      transaction
    );

    await this.audit.logUpdate(
      updated.id,
      { id: existing.id, pictureUrl: existing.pictureUrl ?? null },
      { id: updated.id, pictureUrl: updated.pictureUrl ?? null },
      { context },
      transaction
    );

    await hydratePictureUrl(this.fileStorage, updated);
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
