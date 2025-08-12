import {
  Tag,
  TagPage,
  QueryTagsArgs,
  MutationCreateTagArgs,
  MutationUpdateTagArgs,
  MutationDeleteTagArgs,
} from '@/graphql/generated/types';
export interface TagDataProvider {
  getTags(params: QueryTagsArgs): Promise<TagPage>;
  createTag(params: MutationCreateTagArgs): Promise<Tag>;
  updateTag(params: MutationUpdateTagArgs): Promise<Tag>;
  deleteTag(params: MutationDeleteTagArgs): Promise<Tag>;
}
