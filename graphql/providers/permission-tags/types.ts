import {
  MutationAddPermissionTagArgs,
  MutationRemovePermissionTagArgs,
  PermissionTag,
  QueryPermissionTagsArgs,
} from '@/graphql/generated/types';

export interface PermissionTagDataProvider {
  getPermissionTags(params: QueryPermissionTagsArgs): Promise<PermissionTag[]>;
  addPermissionTag(params: MutationAddPermissionTagArgs): Promise<PermissionTag>;
  removePermissionTag(params: MutationRemovePermissionTagArgs): Promise<PermissionTag>;
}
