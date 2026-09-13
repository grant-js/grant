/**
 * Tag-domain repository port interfaces.
 * Implementations (Drizzle-based) live in apps/api.
 */
import type {
  CreateTagInput,
  MutationDeleteTagArgs,
  QueryTagsArgs,
  Tag,
  TagPage,
  UpdateTagInput,
} from '@grantjs/schema';

import type { IEntityExistence, SelectedFields } from './common';

export interface ITagRepository extends IEntityExistence {
  getTags(
    params: Omit<QueryTagsArgs, 'scope'> & SelectedFields<Tag>,
    transaction?: unknown
  ): Promise<TagPage>;

  createTag(params: Omit<CreateTagInput, 'scope'>, transaction?: unknown): Promise<Tag>;

  updateTag(id: string, input: UpdateTagInput, transaction?: unknown): Promise<Tag>;

  softDeleteTag(params: Omit<MutationDeleteTagArgs, 'scope'>, transaction?: unknown): Promise<Tag>;

  hardDeleteTag(params: Omit<MutationDeleteTagArgs, 'scope'>, transaction?: unknown): Promise<Tag>;
}
