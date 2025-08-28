import {
  QueryPermissionTagsArgs,
  MutationAddPermissionTagArgs,
  MutationRemovePermissionTagArgs,
  PermissionTag,
} from '@/graphql/generated/types';
import {
  IPermissionTagRepository,
  IPermissionRepository,
  ITagRepository,
} from '@/graphql/repositories';
import { permissionTagAuditLogs } from '@/graphql/repositories/permission-tags/schema';
import { AuthenticatedUser } from '@/graphql/types';

import { AuditService, validateInput, validateOutput, createDynamicSingleSchema } from '../common';

import { IPermissionTagService } from './interface';
import {
  getPermissionTagsParamsSchema,
  addPermissionTagParamsSchema,
  removePermissionTagParamsSchema,
  permissionTagSchema,
} from './schemas';

export class PermissionTagService extends AuditService implements IPermissionTagService {
  constructor(
    private readonly permissionTagRepository: IPermissionTagRepository,
    private readonly permissionRepository: IPermissionRepository,
    private readonly tagRepository: ITagRepository,
    user: AuthenticatedUser | null
  ) {
    super(permissionTagAuditLogs, 'permissionTagId', user);
  }

  private async permissionExists(permissionId: string): Promise<void> {
    const permissions = await this.permissionRepository.getPermissions({
      ids: [permissionId],
      limit: 1,
    });

    if (permissions.permissions.length === 0) {
      throw new Error('Permission not found');
    }
  }

  private async tagExists(tagId: string): Promise<void> {
    const tags = await this.tagRepository.getTags({
      ids: [tagId],
      limit: 1,
    });

    if (tags.tags.length === 0) {
      throw new Error('Tag not found');
    }
  }

  private async permissionHasTag(permissionId: string, tagId: string): Promise<boolean> {
    await this.permissionExists(permissionId);
    await this.tagExists(tagId);
    const existingPermissionTags = await this.permissionTagRepository.getPermissionTags({
      permissionId,
    });

    return existingPermissionTags.some((pt) => pt.tagId === tagId);
  }

  public async getPermissionTags(
    params: Omit<QueryPermissionTagsArgs, 'scope'>
  ): Promise<PermissionTag[]> {
    const validatedParams = validateInput(
      getPermissionTagsParamsSchema,
      params,
      'getPermissionTags method'
    );

    await this.permissionExists(validatedParams.permissionId);

    const result = await this.permissionTagRepository.getPermissionTags(validatedParams);
    return validateOutput(
      createDynamicSingleSchema(permissionTagSchema).array(),
      result,
      'getPermissionTags method'
    );
  }

  public async addPermissionTag(params: MutationAddPermissionTagArgs): Promise<PermissionTag> {
    const validatedParams = validateInput(
      addPermissionTagParamsSchema,
      params,
      'addPermissionTag method'
    );

    const hasTag = await this.permissionHasTag(
      validatedParams.input.permissionId,
      validatedParams.input.tagId
    );

    if (hasTag) {
      throw new Error('Permission already has this tag');
    }

    const permissionTag = await this.permissionTagRepository.addPermissionTag(validatedParams);

    const newValues = {
      id: permissionTag.id,
      permissionId: permissionTag.permissionId,
      tagId: permissionTag.tagId,
      createdAt: permissionTag.createdAt,
      updatedAt: permissionTag.updatedAt,
    };

    const metadata = {
      source: 'add_permission_tag_mutation',
    };

    await this.logCreate(permissionTag.id, newValues, metadata);

    return validateOutput(
      createDynamicSingleSchema(permissionTagSchema),
      permissionTag,
      'addPermissionTag method'
    );
  }

  public async removePermissionTag(
    params: MutationRemovePermissionTagArgs & { hardDelete?: boolean }
  ): Promise<PermissionTag> {
    const validatedParams = validateInput(
      removePermissionTagParamsSchema,
      params,
      'removePermissionTag method'
    );

    const hasTag = await this.permissionHasTag(
      validatedParams.input.permissionId,
      validatedParams.input.tagId
    );

    if (!hasTag) {
      throw new Error('Permission does not have this tag');
    }

    const isHardDelete = params.hardDelete === true;

    const permissionTag = isHardDelete
      ? await this.permissionTagRepository.hardDeletePermissionTag(validatedParams)
      : await this.permissionTagRepository.softDeletePermissionTag(validatedParams);

    const oldValues = {
      id: permissionTag.id,
      permissionId: permissionTag.permissionId,
      tagId: permissionTag.tagId,
      createdAt: permissionTag.createdAt,
      updatedAt: permissionTag.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: permissionTag.deletedAt,
    };

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_permission_tag_mutation',
      };
      await this.logHardDelete(permissionTag.id, oldValues, metadata);
    } else {
      const metadata = {
        source: 'soft_delete_permission_tag_mutation',
      };
      await this.logSoftDelete(permissionTag.id, oldValues, newValues, metadata);
    }

    return validateOutput(
      createDynamicSingleSchema(permissionTagSchema),
      permissionTag,
      'removePermissionTag method'
    );
  }
}
