import {
  MutationAddOrganizationPermissionArgs,
  MutationRemoveOrganizationPermissionArgs,
  OrganizationPermission,
} from '@/graphql/generated/types';

export type GetOrganizationPermissionsParams = { organizationId: string };
export type GetOrganizationPermissionsResult = OrganizationPermission[];

export type AddOrganizationPermissionParams = MutationAddOrganizationPermissionArgs;
export type AddOrganizationPermissionResult = OrganizationPermission;

export type RemoveOrganizationPermissionParams = MutationRemoveOrganizationPermissionArgs;
export type RemoveOrganizationPermissionResult = boolean;

export interface OrganizationPermissionDataProvider {
  getOrganizationPermissions(
    params: GetOrganizationPermissionsParams
  ): Promise<GetOrganizationPermissionsResult>;
  addOrganizationPermission(
    params: AddOrganizationPermissionParams
  ): Promise<AddOrganizationPermissionResult>;
  removeOrganizationPermission(
    params: RemoveOrganizationPermissionParams
  ): Promise<RemoveOrganizationPermissionResult>;
}
