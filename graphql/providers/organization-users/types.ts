import {
  MutationAddOrganizationUserArgs,
  MutationRemoveOrganizationUserArgs,
  OrganizationUser,
  QueryOrganizationUsersArgs,
} from '@/graphql/generated/types';
export interface OrganizationUserDataProvider {
  getOrganizationUsers(params: QueryOrganizationUsersArgs): Promise<OrganizationUser[]>;
  addOrganizationUser(params: MutationAddOrganizationUserArgs): Promise<OrganizationUser>;
  removeOrganizationUser(params: MutationRemoveOrganizationUserArgs): Promise<boolean>;
}
