import {
  MutationAddOrganizationUserArgs,
  MutationRemoveOrganizationUserArgs,
  OrganizationUser,
} from '@/graphql/generated/types';

export type GetOrganizationUsersParams = { organizationId: string };
export type GetOrganizationUsersResult = OrganizationUser[];

export type AddOrganizationUserParams = MutationAddOrganizationUserArgs;
export type AddOrganizationUserResult = OrganizationUser;

export type RemoveOrganizationUserParams = MutationRemoveOrganizationUserArgs;
export type RemoveOrganizationUserResult = boolean;

export interface OrganizationUserDataProvider {
  getOrganizationUsers(params: GetOrganizationUsersParams): Promise<GetOrganizationUsersResult>;
  addOrganizationUser(params: AddOrganizationUserParams): Promise<AddOrganizationUserResult>;
  removeOrganizationUser(
    params: RemoveOrganizationUserParams
  ): Promise<RemoveOrganizationUserResult>;
}
