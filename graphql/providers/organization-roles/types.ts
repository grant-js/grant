import {
  MutationAddOrganizationRoleArgs,
  MutationRemoveOrganizationRoleArgs,
  OrganizationRole,
} from '@/graphql/generated/types';

export type GetOrganizationRolesParams = { organizationId: string };
export type GetOrganizationRolesResult = OrganizationRole[];

export type AddOrganizationRoleParams = MutationAddOrganizationRoleArgs;
export type AddOrganizationRoleResult = OrganizationRole;

export type RemoveOrganizationRoleParams = MutationRemoveOrganizationRoleArgs;
export type RemoveOrganizationRoleResult = boolean;

export interface OrganizationRoleDataProvider {
  getOrganizationRoles(params: GetOrganizationRolesParams): Promise<GetOrganizationRolesResult>;
  addOrganizationRole(params: AddOrganizationRoleParams): Promise<AddOrganizationRoleResult>;
  removeOrganizationRole(
    params: RemoveOrganizationRoleParams
  ): Promise<RemoveOrganizationRoleResult>;
}
