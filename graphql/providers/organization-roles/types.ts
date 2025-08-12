import {
  MutationAddOrganizationRoleArgs,
  MutationRemoveOrganizationRoleArgs,
  OrganizationRole,
  QueryOrganizationRolesArgs,
} from '@/graphql/generated/types';
export interface OrganizationRoleDataProvider {
  getOrganizationRoles(params: QueryOrganizationRolesArgs): Promise<OrganizationRole[]>;
  addOrganizationRole(params: MutationAddOrganizationRoleArgs): Promise<OrganizationRole>;
  removeOrganizationRole(params: MutationRemoveOrganizationRoleArgs): Promise<OrganizationRole>;
}
