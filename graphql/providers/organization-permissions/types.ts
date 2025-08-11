import {
  MutationAddOrganizationPermissionArgs,
  MutationRemoveOrganizationPermissionArgs,
  OrganizationPermission,
  QueryOrganizationPermissionsArgs,
} from '@/graphql/generated/types';

export interface OrganizationPermissionDataProvider {
  getOrganizationPermissions(
    params: QueryOrganizationPermissionsArgs
  ): Promise<OrganizationPermission[]>;
  addOrganizationPermission(
    params: MutationAddOrganizationPermissionArgs
  ): Promise<OrganizationPermission>;
  removeOrganizationPermission(params: MutationRemoveOrganizationPermissionArgs): Promise<boolean>;
}
