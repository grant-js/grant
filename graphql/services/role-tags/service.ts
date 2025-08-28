import {
  QueryRoleTagsArgs,
  MutationAddRoleTagArgs,
  MutationRemoveRoleTagArgs,
  RoleTag,
} from '@/graphql/generated/types';
import { IRoleTagRepository } from '@/graphql/repositories/role-tags/interface';
import { roleTagAuditLogs } from '@/graphql/repositories/role-tags/schema';
import { IRoleRepository } from '@/graphql/repositories/roles/interface';
import { ITagRepository } from '@/graphql/repositories/tags/interface';
import { AuthenticatedUser } from '@/graphql/types';

import { AuditService, validateInput, validateOutput, createDynamicSingleSchema } from '../common';

import { IRoleTagService } from './interface';
import {
  getRoleTagsParamsSchema,
  addRoleTagParamsSchema,
  removeRoleTagParamsSchema,
  roleTagSchema,
} from './schemas';

export class RoleTagService extends AuditService implements IRoleTagService {
  constructor(
    private readonly roleTagRepository: IRoleTagRepository,
    private readonly roleRepository: IRoleRepository,
    private readonly tagRepository: ITagRepository,
    user: AuthenticatedUser | null
  ) {
    super(roleTagAuditLogs, 'roleTagId', user);
  }

  private async roleExists(roleId: string): Promise<void> {
    const roles = await this.roleRepository.getRoles({
      ids: [roleId],
      limit: 1,
    });

    if (roles.roles.length === 0) {
      throw new Error('Role not found');
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

  private async roleHasTag(roleId: string, tagId: string): Promise<boolean> {
    await this.roleExists(roleId);
    await this.tagExists(tagId);
    const existingRoleTags = await this.roleTagRepository.getRoleTags({
      roleId,
    });

    return existingRoleTags.some((rt) => rt.tagId === tagId);
  }

  public async getRoleTags(params: Omit<QueryRoleTagsArgs, 'scope'>): Promise<RoleTag[]> {
    const validatedParams = validateInput(getRoleTagsParamsSchema, params, 'getRoleTags method');

    await this.roleExists(validatedParams.roleId);

    const result = await this.roleTagRepository.getRoleTags(validatedParams);
    return validateOutput(
      createDynamicSingleSchema(roleTagSchema).array(),
      result,
      'getRoleTags method'
    );
  }

  public async addRoleTag(params: MutationAddRoleTagArgs): Promise<RoleTag> {
    const validatedParams = validateInput(addRoleTagParamsSchema, params, 'addRoleTag method');

    const hasTag = await this.roleHasTag(validatedParams.input.roleId, validatedParams.input.tagId);

    if (hasTag) {
      throw new Error('Role already has this tag');
    }

    const roleTag = await this.roleTagRepository.addRoleTag(validatedParams);

    const newValues = {
      id: roleTag.id,
      roleId: roleTag.roleId,
      tagId: roleTag.tagId,
      createdAt: roleTag.createdAt,
      updatedAt: roleTag.updatedAt,
    };

    const metadata = {
      source: 'add_role_tag_mutation',
    };

    await this.logCreate(roleTag.id, newValues, metadata);

    return validateOutput(createDynamicSingleSchema(roleTagSchema), roleTag, 'addRoleTag method');
  }

  public async removeRoleTag(
    params: MutationRemoveRoleTagArgs & { hardDelete?: boolean }
  ): Promise<RoleTag> {
    const validatedParams = validateInput(
      removeRoleTagParamsSchema,
      params,
      'removeRoleTag method'
    );

    const hasTag = await this.roleHasTag(validatedParams.input.roleId, validatedParams.input.tagId);

    if (!hasTag) {
      throw new Error('Role does not have this tag');
    }

    const isHardDelete = params.hardDelete === true;

    const roleTag = isHardDelete
      ? await this.roleTagRepository.hardDeleteRoleTag(validatedParams)
      : await this.roleTagRepository.softDeleteRoleTag(validatedParams);

    const oldValues = {
      id: roleTag.id,
      roleId: roleTag.roleId,
      tagId: roleTag.tagId,
      createdAt: roleTag.createdAt,
      updatedAt: roleTag.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: roleTag.deletedAt,
    };

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_role_tag_mutation',
      };
      await this.logHardDelete(roleTag.id, oldValues, metadata);
    } else {
      const metadata = {
        source: 'soft_delete_role_tag_mutation',
      };
      await this.logSoftDelete(roleTag.id, oldValues, newValues, metadata);
    }

    return validateOutput(
      createDynamicSingleSchema(roleTagSchema),
      roleTag,
      'removeRoleTag method'
    );
  }
}
