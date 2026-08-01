import type {
  IAuditLogger,
  IProjectRepository,
  IProjectUserRepository,
  IProjectUserService,
  IUserAuthenticationMethodRepository,
  IUserRepository,
} from '@grantjs/core';
import { AddProjectUserInput, ProjectUser, RemoveProjectUserInput } from '@grantjs/schema';

import { mergeCdmImporterMetadata } from '@/constants/cdm-import.constants';
import {
  mergeProjectUserMetadataApplyUpdate,
  toMetadataRecord,
} from '@/lib/effective-project-user-metadata.lib';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { syncProjectUserSearchDocument } from '@/lib/sync-project-user-search-document.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addProjectUserParamsSchema,
  getProjectUsersParamsSchema,
  mergeProjectUserCdmMetadataParamsSchema,
  projectUserSchema,
  removeProjectUserParamsSchema,
  updateProjectUserMetadataParamsSchema,
  updateProjectUserProfileParamsSchema,
} from './project-users.schemas';

export class ProjectUserService implements IProjectUserService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly userRepository: IUserRepository,
    private readonly projectUserRepository: IProjectUserRepository,
    private readonly audit: IAuditLogger,
    private readonly userAuthenticationMethods?: IUserAuthenticationMethodRepository
  ) {}

  private async projectExists(projectId: string, transaction?: Transaction): Promise<void> {
    const projects = await this.projectRepository.getProjects(
      { ids: [projectId], limit: 1 },
      transaction
    );

    if (projects.projects.length === 0) {
      throw new NotFoundError('Project');
    }
  }

  private async userExists(userId: string, transaction?: Transaction): Promise<void> {
    const users = await this.userRepository.getUsers({ ids: [userId], limit: 1 }, transaction);

    if (users.users.length === 0) {
      throw new NotFoundError('User');
    }
  }

  private async projectHasUser(
    projectId: string,
    userId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.projectExists(projectId, transaction);
    await this.userExists(userId, transaction);
    const existingProjectUsers = await this.projectUserRepository.getProjectUsers(
      {
        projectId,
      },
      transaction
    );

    return existingProjectUsers.some((pu) => pu.userId === userId);
  }

  public async getProjectUsers(
    params: { projectId?: string; userId?: string },
    transaction?: Transaction
  ): Promise<ProjectUser[]> {
    const context = 'ProjectUserService.getProjectUsers';
    const validatedParams = validateInput(getProjectUsersParamsSchema, params, context);

    if (validatedParams.projectId) {
      await this.projectExists(validatedParams.projectId, transaction);
    }

    const result = await this.projectUserRepository.getProjectUsers(validatedParams, transaction);
    return validateOutput(createDynamicSingleSchema(projectUserSchema).array(), result, context);
  }

  public async addProjectUser(
    params: AddProjectUserInput,
    transaction?: Transaction
  ): Promise<ProjectUser> {
    const context = 'ProjectUserService.addProjectUser';
    const validatedParams = validateInput(addProjectUserParamsSchema, params, context);
    const { projectId, userId, metadata: metadataInput } = validatedParams;

    const hasUser = await this.projectHasUser(projectId, userId, transaction);

    if (hasUser) {
      throw new ConflictError('Project already has this user', 'ProjectUser', 'userId');
    }

    const metadata =
      metadataInput !== undefined
        ? mergeCdmImporterMetadata({}, metadataInput as Record<string, unknown>)
        : {};

    const projectUser = await this.projectUserRepository.addProjectUser(
      {
        projectId,
        userId,
        metadata,
      },
      transaction
    );

    await this.syncProjectUserSearchDocument({ projectId, userId }, transaction);

    const newValues = {
      id: projectUser.id,
      projectId: projectUser.projectId,
      userId: projectUser.userId,
      metadata: projectUser.metadata,
      createdAt: projectUser.createdAt,
      updatedAt: projectUser.updatedAt,
    };

    const auditMetadata = {
      context,
    };

    await this.audit.logCreate(projectUser.id, newValues, auditMetadata, transaction);

    return validateOutput(createDynamicSingleSchema(projectUserSchema), projectUser, context);
  }

  public async syncProjectUserSearchDocument(
    params: {
      projectId: string;
      userId: string;
      searchable?: Record<string, unknown> | null;
    },
    transaction?: Transaction
  ): Promise<void> {
    await syncProjectUserSearchDocument(
      this.projectUserRepository,
      this.userRepository,
      params,
      transaction,
      this.userAuthenticationMethods
    );
  }

  public async filterUserIdsBySearchDocument(
    params: {
      projectId: string;
      userIds: readonly string[];
      search: string;
    },
    transaction?: Transaction
  ): Promise<string[]> {
    return this.projectUserRepository.filterUserIdsBySearchDocument(params, transaction);
  }

  public async mergeProjectUserCdmMetadata(
    params: {
      projectId: string;
      userId: string;
      importerMetadata: Record<string, unknown> | null | undefined;
    },
    transaction?: Transaction
  ): Promise<ProjectUser> {
    const context = 'ProjectUserService.mergeProjectUserCdmMetadata';
    const validatedParams = validateInput(mergeProjectUserCdmMetadataParamsSchema, params, context);

    await this.projectExists(validatedParams.projectId, transaction);
    await this.userExists(validatedParams.userId, transaction);

    const projectUser = await this.projectUserRepository.mergeProjectUserCdmMetadata(
      {
        projectId: validatedParams.projectId,
        userId: validatedParams.userId,
        importerMetadata: validatedParams.importerMetadata ?? null,
      },
      transaction
    );

    await this.syncProjectUserSearchDocument(
      {
        projectId: validatedParams.projectId,
        userId: validatedParams.userId,
      },
      transaction
    );

    return validateOutput(createDynamicSingleSchema(projectUserSchema), projectUser, context);
  }

  public async updateProjectUserMetadata(
    params: {
      projectId: string;
      userId: string;
      metadata: Record<string, unknown>;
    },
    transaction?: Transaction
  ): Promise<ProjectUser> {
    const context = 'ProjectUserService.updateProjectUserMetadata';
    const validatedParams = validateInput(updateProjectUserMetadataParamsSchema, params, context);

    await this.projectExists(validatedParams.projectId, transaction);
    await this.userExists(validatedParams.userId, transaction);

    const existingRows = await this.projectUserRepository.getProjectUsers(
      {
        projectId: validatedParams.projectId,
        userId: validatedParams.userId,
      },
      transaction
    );
    if (existingRows.length === 0) {
      throw new NotFoundError('ProjectUser');
    }

    const previous = existingRows[0];
    const currentMd = toMetadataRecord(previous.metadata);
    const mergedMd = mergeProjectUserMetadataApplyUpdate(currentMd, validatedParams.metadata);

    const projectUser = await this.projectUserRepository.updateProjectUserMetadata(
      {
        projectId: validatedParams.projectId,
        userId: validatedParams.userId,
        metadata: mergedMd,
      },
      transaction
    );

    const oldValues = {
      id: previous.id,
      projectId: previous.projectId,
      userId: previous.userId,
      metadata: previous.metadata,
      createdAt: previous.createdAt,
      updatedAt: previous.updatedAt,
    };

    const newValues = {
      id: projectUser.id,
      projectId: projectUser.projectId,
      userId: projectUser.userId,
      metadata: projectUser.metadata,
      createdAt: projectUser.createdAt,
      updatedAt: projectUser.updatedAt,
    };

    await this.audit.logUpdate(projectUser.id, oldValues, newValues, { context }, transaction);

    await this.syncProjectUserSearchDocument(
      {
        projectId: validatedParams.projectId,
        userId: validatedParams.userId,
      },
      transaction
    );

    return validateOutput(createDynamicSingleSchema(projectUserSchema), projectUser, context);
  }

  public async updateProjectUserProfile(
    params: {
      projectId: string;
      userId: string;
      displayName?: string | null;
      pictureUrl?: string | null;
    },
    transaction?: Transaction
  ): Promise<ProjectUser> {
    const context = 'ProjectUserService.updateProjectUserProfile';
    const validatedParams = validateInput(updateProjectUserProfileParamsSchema, params, context);

    await this.projectExists(validatedParams.projectId, transaction);
    await this.userExists(validatedParams.userId, transaction);

    const existingRows = await this.projectUserRepository.getProjectUsers(
      {
        projectId: validatedParams.projectId,
        userId: validatedParams.userId,
      },
      transaction
    );
    if (existingRows.length === 0) {
      throw new NotFoundError('ProjectUser');
    }

    const previous = existingRows[0];
    const projectUser = await this.projectUserRepository.updateProjectUserProfile(
      validatedParams,
      transaction
    );

    const oldValues = {
      id: previous.id,
      projectId: previous.projectId,
      userId: previous.userId,
      metadata: previous.metadata,
      displayName: previous.displayName,
      pictureUrl: previous.pictureUrl,
      createdAt: previous.createdAt,
      updatedAt: previous.updatedAt,
    };

    const newValues = {
      id: projectUser.id,
      projectId: projectUser.projectId,
      userId: projectUser.userId,
      metadata: projectUser.metadata,
      displayName: projectUser.displayName,
      pictureUrl: projectUser.pictureUrl,
      createdAt: projectUser.createdAt,
      updatedAt: projectUser.updatedAt,
    };

    await this.audit.logUpdate(projectUser.id, oldValues, newValues, { context }, transaction);

    await this.syncProjectUserSearchDocument(
      {
        projectId: validatedParams.projectId,
        userId: validatedParams.userId,
      },
      transaction
    );

    return validateOutput(createDynamicSingleSchema(projectUserSchema), projectUser, context);
  }

  public async removeProjectUser(
    params: RemoveProjectUserInput & DeleteParams,
    transaction?: Transaction
  ): Promise<ProjectUser> {
    const context = 'ProjectUserService.removeProjectUser';
    const validatedParams = validateInput(removeProjectUserParamsSchema, params, context);

    const { projectId, userId, hardDelete } = validatedParams;

    const hasUser = await this.projectHasUser(projectId, userId, transaction);

    if (!hasUser) {
      throw new NotFoundError('User');
    }

    const isHardDelete = hardDelete === true;

    const projectUser = isHardDelete
      ? await this.projectUserRepository.hardDeleteProjectUser({ projectId, userId }, transaction)
      : await this.projectUserRepository.softDeleteProjectUser({ projectId, userId }, transaction);

    const oldValues = {
      id: projectUser.id,
      projectId: projectUser.projectId,
      userId: projectUser.userId,
      createdAt: projectUser.createdAt,
      updatedAt: projectUser.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: projectUser.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.audit.logHardDelete(projectUser.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(projectUser.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(projectUserSchema), projectUser, context);
  }

  public async getUserProjectMemberships(
    userId: string,
    transaction?: Transaction
  ): Promise<
    Array<{
      projectId: string;
      projectName: string;
      displayName: string | null;
      pictureUrl: string | null;
      metadata: Record<string, unknown>;
      role: string | null;
      joinedAt: Date;
      organizationId: string | null;
      organizationName: string | null;
      accountId: string | null;
    }>
  > {
    const memberships = await this.projectUserRepository.getProjectUserMemberships(
      userId,
      transaction
    );

    return memberships.map((m) => ({
      projectId: m.projectId,
      projectName: m.projectName,
      displayName: m.displayName,
      pictureUrl: m.pictureUrl,
      metadata: m.metadata,
      role: m.role,
      joinedAt: m.joinedAt instanceof Date ? m.joinedAt : new Date(m.joinedAt),
      organizationId: m.organizationId,
      organizationName: m.organizationName,
      accountId: m.accountId,
    }));
  }
}
