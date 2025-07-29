import {
  MutationAddRoleTagArgs,
  MutationRemoveRoleTagArgs,
  QueryRoleTagsArgs,
  RoleTag,
} from '@/graphql/generated/types';

export type GetRoleTagsParams = QueryRoleTagsArgs;
export type GetRoleTagsResult = RoleTag[];

export type AddRoleTagParams = MutationAddRoleTagArgs;
export type AddRoleTagResult = RoleTag;

export type RemoveRoleTagParams = MutationRemoveRoleTagArgs;
export type RemoveRoleTagResult = RoleTag;

export interface RoleTagDataProvider {
  getRoleTags(params: GetRoleTagsParams): Promise<GetRoleTagsResult>;
  addRoleTag(params: AddRoleTagParams): Promise<AddRoleTagResult>;
  removeRoleTag(params: RemoveRoleTagParams): Promise<RemoveRoleTagResult>;
}
