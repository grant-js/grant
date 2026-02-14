/**
 * Organization-domain service port interfaces.
 * Covers: Organization, OrganizationUser, OrganizationRole, OrganizationGroup,
 *         OrganizationPermission, OrganizationProject, OrganizationProjectTag,
 *         OrganizationProjectApiKey, OrganizationTag, OrganizationMember,
 *         OrganizationInvitation.
 */
import type { DeleteParams } from './user.service.port';
import type { SelectedFields } from '../repositories/common';
import type {
  AddOrganizationGroupInput,
  AddOrganizationPermissionInput,
  AddOrganizationProjectInput,
  AddOrganizationProjectTagInput,
  AddOrganizationRoleInput,
  AddOrganizationTagInput,
  AddOrganizationUserInput,
  ApiKey,
  CreateOrganizationInput,
  CreateOrganizationInvitationInput,
  GetInvitationQueryVariables,
  MutationDeleteOrganizationArgs,
  MutationUpdateOrganizationArgs,
  Organization,
  OrganizationGroup,
  OrganizationInvitation,
  OrganizationInvitationPage,
  OrganizationMember,
  OrganizationMemberPage,
  OrganizationPage,
  OrganizationPermission,
  OrganizationProject,
  OrganizationProjectApiKey,
  OrganizationProjectTag,
  OrganizationRole,
  OrganizationTag,
  OrganizationUser,
  QueryOrganizationInvitationsArgs,
  QueryOrganizationMembersArgs,
  QueryOrganizationPermissionsInput,
  QueryOrganizationProjectTagInput,
  QueryOrganizationsArgs,
  RemoveOrganizationGroupInput,
  RemoveOrganizationMemberInput,
  RemoveOrganizationPermissionInput,
  RemoveOrganizationProjectInput,
  RemoveOrganizationProjectTagInput,
  RemoveOrganizationRoleInput,
  RemoveOrganizationTagInput,
  RemoveOrganizationUserInput,
  Role,
  UpdateOrganizationInvitationInput,
  UpdateOrganizationMemberInput,
  UpdateOrganizationProjectTagInput,
} from '@grantjs/schema';

// ---------------------------------------------------------------------------
// IOrganizationService
// ---------------------------------------------------------------------------

export interface IOrganizationService {
  getOrganizations(
    params: Omit<QueryOrganizationsArgs, 'scope'> & SelectedFields<Organization>,
    transaction?: unknown
  ): Promise<OrganizationPage>;

  createOrganization(
    params: Omit<CreateOrganizationInput, 'scope'>,
    transaction?: unknown
  ): Promise<Organization>;

  updateOrganization(
    params: MutationUpdateOrganizationArgs,
    transaction?: unknown
  ): Promise<Organization>;

  deleteOrganization(
    params: Omit<MutationDeleteOrganizationArgs, 'scope'> & DeleteParams,
    transaction?: unknown
  ): Promise<Organization>;
}

// ---------------------------------------------------------------------------
// IOrganizationUserService
// ---------------------------------------------------------------------------

export interface IOrganizationUserService {
  getOrganizationUsers(
    params: { organizationId: string },
    transaction?: unknown
  ): Promise<OrganizationUser[]>;

  addOrganizationUser(
    params: AddOrganizationUserInput,
    transaction?: unknown
  ): Promise<OrganizationUser>;

  removeOrganizationUser(
    params: RemoveOrganizationUserInput & DeleteParams,
    transaction?: unknown
  ): Promise<OrganizationUser>;

  getUserOrganizationMemberships(
    userId: string,
    transaction?: unknown
  ): Promise<
    Array<{
      organizationId: string;
      organizationName: string;
      role: string;
      joinedAt: Date;
    }>
  >;
}

// ---------------------------------------------------------------------------
// IOrganizationRoleService
// ---------------------------------------------------------------------------

export interface IOrganizationRoleService {
  getOrganizationRoles(
    params: { organizationId: string },
    transaction?: unknown
  ): Promise<OrganizationRole[]>;

  addOrganizationRole(
    params: AddOrganizationRoleInput,
    transaction?: unknown
  ): Promise<OrganizationRole>;

  removeOrganizationRole(
    params: RemoveOrganizationRoleInput & DeleteParams,
    transaction?: unknown
  ): Promise<OrganizationRole>;

  seedOrganizationRoles(
    organizationId: string,
    transaction?: unknown
  ): Promise<Array<{ role: Role; organizationRole: OrganizationRole }>>;
}

// ---------------------------------------------------------------------------
// IOrganizationGroupService
// ---------------------------------------------------------------------------

export interface IOrganizationGroupService {
  getOrganizationGroups(
    params: { organizationId: string } & SelectedFields<OrganizationGroup>,
    transaction?: unknown
  ): Promise<OrganizationGroup[]>;

  addOrganizationGroup(
    params: AddOrganizationGroupInput,
    transaction?: unknown
  ): Promise<OrganizationGroup>;

  removeOrganizationGroup(
    params: RemoveOrganizationGroupInput & DeleteParams,
    transaction?: unknown
  ): Promise<OrganizationGroup>;
}

// ---------------------------------------------------------------------------
// IOrganizationPermissionService
// ---------------------------------------------------------------------------

export interface IOrganizationPermissionService {
  getOrganizationPermissions(
    params: QueryOrganizationPermissionsInput,
    transaction?: unknown
  ): Promise<OrganizationPermission[]>;

  addOrganizationPermission(
    params: AddOrganizationPermissionInput,
    transaction?: unknown
  ): Promise<OrganizationPermission>;

  removeOrganizationPermission(
    params: RemoveOrganizationPermissionInput & DeleteParams,
    transaction?: unknown
  ): Promise<OrganizationPermission>;
}

// ---------------------------------------------------------------------------
// IOrganizationProjectService
// ---------------------------------------------------------------------------

export interface IOrganizationProjectService {
  getOrganizationProjects(
    params: { organizationId: string },
    transaction?: unknown
  ): Promise<OrganizationProject[]>;

  getOrganizationProject(
    params: { projectId: string },
    transaction?: unknown
  ): Promise<OrganizationProject>;

  addOrganizationProject(
    params: AddOrganizationProjectInput,
    transaction?: unknown
  ): Promise<OrganizationProject>;

  removeOrganizationProject(
    params: RemoveOrganizationProjectInput & DeleteParams,
    transaction?: unknown
  ): Promise<OrganizationProject>;
}

// ---------------------------------------------------------------------------
// IOrganizationProjectTagService
// ---------------------------------------------------------------------------

export interface IOrganizationProjectTagService {
  getOrganizationProjectTags(
    params: QueryOrganizationProjectTagInput,
    transaction?: unknown
  ): Promise<OrganizationProjectTag[]>;

  getOrganizationProjectTagIntersection(
    organizationId: string,
    projectIds: string[],
    tagIds: string[]
  ): Promise<OrganizationProjectTag[]>;

  addOrganizationProjectTag(
    params: AddOrganizationProjectTagInput,
    transaction?: unknown
  ): Promise<OrganizationProjectTag>;

  updateOrganizationProjectTag(
    params: UpdateOrganizationProjectTagInput,
    transaction?: unknown
  ): Promise<OrganizationProjectTag>;

  removeOrganizationProjectTag(
    params: RemoveOrganizationProjectTagInput & DeleteParams,
    transaction?: unknown
  ): Promise<OrganizationProjectTag>;
}

// ---------------------------------------------------------------------------
// IOrganizationProjectApiKeyService
// ---------------------------------------------------------------------------

export interface IOrganizationProjectApiKeyService {
  getOrganizationProjectApiKeys(
    params: { organizationId?: string; projectId?: string; apiKeyId?: string },
    transaction?: unknown
  ): Promise<OrganizationProjectApiKey[]>;

  validateOrganizationProjectApiKeyRolePermission(
    organizationId: string,
    roleId: string,
    transaction?: unknown
  ): Promise<void>;

  validateCanManageOrganizationProjectApiKey(
    organizationId: string,
    projectId: string,
    apiKeyId: string,
    transaction?: unknown
  ): Promise<void>;

  filterApiKeysByManageable(
    organizationId: string,
    apiKeys: (ApiKey & { role?: Role | null })[],
    transaction?: unknown
  ): Promise<(ApiKey & { role?: Role | null })[]>;

  addOrganizationProjectApiKey(
    params: {
      organizationId: string;
      projectId: string;
      apiKeyId: string;
      organizationRoleId: string;
    },
    transaction?: unknown
  ): Promise<OrganizationProjectApiKey>;

  getByApiKeyAndOrganizationAndProject(
    apiKeyId: string,
    organizationId: string,
    projectId: string,
    transaction?: unknown
  ): Promise<OrganizationProjectApiKey | null>;
}

// ---------------------------------------------------------------------------
// IOrganizationTagService
// ---------------------------------------------------------------------------

export interface IOrganizationTagService {
  getOrganizationTags(
    params: { organizationId: string },
    transaction?: unknown
  ): Promise<OrganizationTag[]>;

  addOrganizationTag(
    params: AddOrganizationTagInput,
    transaction?: unknown
  ): Promise<OrganizationTag>;

  removeOrganizationTag(
    params: RemoveOrganizationTagInput & DeleteParams,
    transaction?: unknown
  ): Promise<OrganizationTag>;
}

// ---------------------------------------------------------------------------
// IOrganizationMemberService
// ---------------------------------------------------------------------------

export interface IOrganizationMemberService {
  getOrganizationMembers(
    params: QueryOrganizationMembersArgs & SelectedFields<OrganizationMember>,
    transaction?: unknown
  ): Promise<OrganizationMemberPage>;

  getOrganizationMember(
    organizationId: string,
    userId: string,
    transaction?: unknown
  ): Promise<OrganizationMember | null>;

  updateOrganizationMember(
    userId: string,
    input: UpdateOrganizationMemberInput,
    transaction?: unknown
  ): Promise<OrganizationMember>;

  removeOrganizationMember(
    userId: string,
    input: RemoveOrganizationMemberInput,
    transaction?: unknown
  ): Promise<OrganizationMember>;
}

// ---------------------------------------------------------------------------
// IOrganizationInvitationService
// ---------------------------------------------------------------------------

export interface IOrganizationInvitationService {
  validateInvitationRolePermission(
    organizationId: string,
    roleId: string,
    transaction?: unknown
  ): Promise<void>;

  createInvitation(
    params: CreateOrganizationInvitationInput,
    transaction?: unknown
  ): Promise<OrganizationInvitation>;

  getInvitationByToken(
    params: GetInvitationQueryVariables & SelectedFields<OrganizationInvitation>,
    transaction?: unknown
  ): Promise<OrganizationInvitation | null>;

  getInvitationById(id: string, transaction?: unknown): Promise<OrganizationInvitation | null>;

  getInvitationsByOrganization(
    params: QueryOrganizationInvitationsArgs & SelectedFields<OrganizationInvitation>,
    transaction?: unknown
  ): Promise<OrganizationInvitationPage>;

  checkPendingInvitation(
    email: string,
    organizationId: string,
    transaction?: unknown
  ): Promise<OrganizationInvitation | null>;

  updateInvitation(
    id: string,
    input: UpdateOrganizationInvitationInput,
    transaction?: unknown
  ): Promise<OrganizationInvitation>;

  revokeInvitation(id: string, transaction?: unknown): Promise<OrganizationInvitation>;

  isUserInOrganization(
    organizationId: string,
    userId: string,
    transaction?: unknown
  ): Promise<boolean>;
}
