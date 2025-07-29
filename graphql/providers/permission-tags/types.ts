import {
  MutationAddPermissionTagArgs,
  MutationRemovePermissionTagArgs,
  QueryPermissionTagsArgs,
  PermissionTag,
} from '@/graphql/generated/types';

export type GetPermissionTagsParams = QueryPermissionTagsArgs;
export type GetPermissionTagsResult = PermissionTag[];

export type AddPermissionTagParams = MutationAddPermissionTagArgs;
export type AddPermissionTagResult = PermissionTag;

export type RemovePermissionTagParams = MutationRemovePermissionTagArgs;
export type RemovePermissionTagResult = PermissionTag;

export interface PermissionTagDataProvider {
  getPermissionTags(params: GetPermissionTagsParams): Promise<GetPermissionTagsResult>;
  addPermissionTag(params: AddPermissionTagParams): Promise<AddPermissionTagResult>;
  removePermissionTag(params: RemovePermissionTagParams): Promise<RemovePermissionTagResult>;
}
