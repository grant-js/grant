import {
  QueryProjectTagsArgs,
  MutationAddProjectTagArgs,
  MutationRemoveProjectTagArgs,
  ProjectTag,
} from '@/graphql/generated/types';
import { IProjectTagRepository, IProjectRepository, ITagRepository } from '@/graphql/repositories';
import { projectTagAuditLogs } from '@/graphql/repositories/project-tags/schema';
import { AuthenticatedUser } from '@/graphql/types';

import { AuditService, validateInput, validateOutput, createDynamicSingleSchema } from '../common';

import { IProjectTagService } from './interface';
import {
  getProjectTagsParamsSchema,
  addProjectTagParamsSchema,
  removeProjectTagParamsSchema,
  projectTagSchema,
} from './schemas';

export class ProjectTagService extends AuditService implements IProjectTagService {
  constructor(
    private readonly projectTagRepository: IProjectTagRepository,
    private readonly projectRepository: IProjectRepository,
    private readonly tagRepository: ITagRepository,
    user: AuthenticatedUser | null
  ) {
    super(projectTagAuditLogs, 'projectTagId', user);
  }

  private async projectExists(projectId: string): Promise<void> {
    const projects = await this.projectRepository.getProjects({
      ids: [projectId],
      limit: 1,
    });

    if (projects.projects.length === 0) {
      throw new Error('Project not found');
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

  private async projectHasTag(projectId: string, tagId: string): Promise<boolean> {
    await this.projectExists(projectId);
    await this.tagExists(tagId);
    const existingProjectTags = await this.projectTagRepository.getProjectTags({
      projectId,
    });

    return existingProjectTags.some((pt) => pt.tagId === tagId);
  }

  public async getProjectTags(params: QueryProjectTagsArgs): Promise<ProjectTag[]> {
    const validatedParams = validateInput(
      getProjectTagsParamsSchema,
      params,
      'getProjectTags method'
    );

    await this.projectExists(validatedParams.projectId);

    const result = await this.projectTagRepository.getProjectTags(validatedParams);
    return validateOutput(
      createDynamicSingleSchema(projectTagSchema).array(),
      result,
      'getProjectTags method'
    );
  }

  public async addProjectTag(params: MutationAddProjectTagArgs): Promise<ProjectTag> {
    const validatedParams = validateInput(
      addProjectTagParamsSchema,
      params,
      'addProjectTag method'
    );

    const hasTag = await this.projectHasTag(
      validatedParams.input.projectId,
      validatedParams.input.tagId
    );

    if (hasTag) {
      throw new Error('Project already has this tag');
    }

    const projectTag = await this.projectTagRepository.addProjectTag(validatedParams);

    const newValues = {
      id: projectTag.id,
      projectId: projectTag.projectId,
      tagId: projectTag.tagId,
      createdAt: projectTag.createdAt,
      updatedAt: projectTag.updatedAt,
    };

    const metadata = {
      source: 'add_project_tag_mutation',
    };

    await this.logCreate(projectTag.id, newValues, metadata);

    return validateOutput(
      createDynamicSingleSchema(projectTagSchema),
      projectTag,
      'addProjectTag method'
    );
  }

  public async removeProjectTag(
    params: MutationRemoveProjectTagArgs & { hardDelete?: boolean }
  ): Promise<ProjectTag> {
    const validatedParams = validateInput(
      removeProjectTagParamsSchema,
      params,
      'removeProjectTag method'
    );

    const hasTag = await this.projectHasTag(
      validatedParams.input.projectId,
      validatedParams.input.tagId
    );

    if (!hasTag) {
      throw new Error('Project does not have this tag');
    }

    const isHardDelete = params.hardDelete === true;

    const projectTag = isHardDelete
      ? await this.projectTagRepository.hardDeleteProjectTag(validatedParams)
      : await this.projectTagRepository.softDeleteProjectTag(validatedParams);

    const oldValues = {
      id: projectTag.id,
      projectId: projectTag.projectId,
      tagId: projectTag.tagId,
      createdAt: projectTag.createdAt,
      updatedAt: projectTag.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: projectTag.deletedAt,
    };

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_project_tag_mutation',
      };
      await this.logHardDelete(projectTag.id, oldValues, metadata);
    } else {
      const metadata = {
        source: 'soft_delete_project_tag_mutation',
      };
      await this.logSoftDelete(projectTag.id, oldValues, newValues, metadata);
    }

    return validateOutput(
      createDynamicSingleSchema(projectTagSchema),
      projectTag,
      'removeProjectTag method'
    );
  }
}
