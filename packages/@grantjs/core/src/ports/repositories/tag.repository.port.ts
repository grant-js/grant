/**
 * Tag-domain repository port interfaces.
 * Implementations (Drizzle-based) live in apps/api.
 */
import type { SelectedFields } from './common';
import type {
  CreateTagInput,
  MutationDeleteTagArgs,
  QueryTagsArgs,
  Tag,
  TagPage,
  UpdateTagInput,
} from '@grantjs/schema';

export interface ITagRepository {
  getTags(
    params: Omit<QueryTagsArgs, 'scope'> & SelectedFields<Tag>,
    transaction?: unknown
  ): Promise<TagPage>;

  createTag(params: Omit<CreateTagInput, 'scope'>, transaction?: unknown): Promise<Tag>;

  updateTag(id: string, input: UpdateTagInput, transaction?: unknown): Promise<Tag>;

  softDeleteTag(params: Omit<MutationDeleteTagArgs, 'scope'>, transaction?: unknown): Promise<Tag>;

  hardDeleteTag(params: Omit<MutationDeleteTagArgs, 'scope'>, transaction?: unknown): Promise<Tag>;
}
