/**
 * Tag-domain service port interface.
 * Covers: Tag.
 */
import type { DeleteParams } from './user.service.port';
import type { SelectedFields } from '../repositories/common';
import type {
  CreateTagInput,
  MutationDeleteTagArgs,
  QueryTagsArgs,
  Tag,
  TagPage,
  UpdateTagInput,
} from '@grantjs/schema';

// ---------------------------------------------------------------------------
// ITagService
// ---------------------------------------------------------------------------

export interface ITagService {
  getTags(
    params: Omit<QueryTagsArgs, 'scope'> & SelectedFields<Tag>,
    transaction?: unknown
  ): Promise<TagPage>;

  createTag(params: Omit<CreateTagInput, 'scope'>, transaction?: unknown): Promise<Tag>;

  updateTag(id: string, input: UpdateTagInput, transaction?: unknown): Promise<Tag>;

  deleteTag(
    params: Omit<MutationDeleteTagArgs, 'scope'> & DeleteParams,
    transaction?: unknown
  ): Promise<Tag>;
}
