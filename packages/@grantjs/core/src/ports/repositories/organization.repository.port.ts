/**
 * Organization-domain repository port interfaces.
 * Implementations (Drizzle-based) live in apps/api.
 */
import type { SelectedFields } from './common';
import type {
  AddOrganizationGroupInput,
  AddOrganizationPermissionInput,
  AddOrganizationProjectApiKeyInput,
  AddOrganizationProjectInput,
  AddOrganizationProjectTagInput,
  AddOrganizationRoleInput,
  AddOrganizationTagInput,
  AddOrganizationUserInput,
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
  QueryOrganizationGroupsInput,
  QueryOrganizationInvitationsArgs,
  QueryOrganizationMembersArgs,
  QueryOrganizationPermissionsInput,
  QueryOrganizationProjectApiKeysInput,
  QueryOrganizationProjectsInput,
  QueryOrganizationProjectTagInput,
  QueryOrganizationRolesInput,
  QueryOrganizationTagsInput,
  QueryOrganizationUsersInput,
  QueryOrganizationsArgs,
  RemoveOrganizationGroupInput,
  RemoveOrganizationPermissionInput,
  RemoveOrganizationProjectInput,
  RemoveOrganizationProjectTagInput,
  RemoveOrganizationRoleInput,
  RemoveOrganizationTagInput,
  RemoveOrganizationUserInput,
  UpdateOrganizationInvitationInput,
  UpdateOrganizationProjectTagInput,
  UpdateOrganizationTagInput,
} from '@grantjs/schema';

export interface IOrganizationRepository {
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

  softDeleteOrganization(
    params: Omit<MutationDeleteOrganizationArgs, 'scope'>,
    transaction?: unknown
  ): Promise<Organization>;

  hardDeleteOrganization(
    params: Omit<MutationDeleteOrganizationArgs, 'scope'>,
    transaction?: unknown
  ): Promise<Organization>;
}

export interface IOrganizationUserRepository {
  getOrganizationUsers(
    params: QueryOrganizationUsersInput,
    transaction?: unknown
  ): Promise<OrganizationUser[]>;

  addOrganizationUser(
    params: AddOrganizationUserInput,
    transaction?: unknown
  ): Promise<OrganizationUser>;

  softDeleteOrganizationUser(
    params: RemoveOrganizationUserInput,
    transaction?: unknown
  ): Promise<OrganizationUser>;

  hardDeleteOrganizationUser(
    params: RemoveOrganizationUserInput,
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

export interface IOrganizationRoleRepository {
  getOrganizationRoles(
    params: QueryOrganizationRolesInput,
    transaction?: unknown
  ): Promise<OrganizationRole[]>;

  addOrganizationRole(
    params: AddOrganizationRoleInput,
    transaction?: unknown
  ): Promise<OrganizationRole>;

  softDeleteOrganizationRole(
    params: RemoveOrganizationRoleInput,
    transaction?: unknown
  ): Promise<OrganizationRole>;

  hardDeleteOrganizationRole(
    params: RemoveOrganizationRoleInput,
    transaction?: unknown
  ): Promise<OrganizationRole>;
}

export interface IOrganizationGroupRepository {
  getOrganizationGroups(
    params: QueryOrganizationGroupsInput,
    transaction?: unknown
  ): Promise<OrganizationGroup[]>;

  addOrganizationGroup(
    params: AddOrganizationGroupInput,
    transaction?: unknown
  ): Promise<OrganizationGroup>;

  softDeleteOrganizationGroup(
    params: RemoveOrganizationGroupInput,
    transaction?: unknown
  ): Promise<OrganizationGroup>;

  hardDeleteOrganizationGroup(
    params: RemoveOrganizationGroupInput,
    transaction?: unknown
  ): Promise<OrganizationGroup>;
}

export interface IOrganizationPermissionRepository {
  getOrganizationPermissions(
    params: QueryOrganizationPermissionsInput,
    transaction?: unknown
  ): Promise<OrganizationPermission[]>;

  addOrganizationPermission(
    params: AddOrganizationPermissionInput,
    transaction?: unknown
  ): Promise<OrganizationPermission>;

  softDeleteOrganizationPermission(
    params: RemoveOrganizationPermissionInput,
    transaction?: unknown
  ): Promise<OrganizationPermission>;

  hardDeleteOrganizationPermission(
    params: RemoveOrganizationPermissionInput,
    transaction?: unknown
  ): Promise<OrganizationPermission>;
}

export interface IOrganizationProjectRepository {
  getOrganizationProjects(
    params: QueryOrganizationProjectsInput,
    transaction?: unknown
  ): Promise<OrganizationProject[]>;

  getOrganizationProject(
    params: QueryOrganizationProjectsInput,
    transaction?: unknown
  ): Promise<OrganizationProject>;

  addOrganizationProject(
    params: AddOrganizationProjectInput,
    transaction?: unknown
  ): Promise<OrganizationProject>;

  softDeleteOrganizationProject(
    params: RemoveOrganizationProjectInput,
    transaction?: unknown
  ): Promise<OrganizationProject>;

  hardDeleteOrganizationProject(
    params: RemoveOrganizationProjectInput,
    transaction?: unknown
  ): Promise<OrganizationProject>;

  getFirstByProjectId(
    projectId: string,
    transaction?: unknown
  ): Promise<OrganizationProject | null>;
}

export interface IOrganizationProjectTagRepository {
  getOrganizationProjectTags(
    params: QueryOrganizationProjectTagInput,
    transaction?: unknown
  ): Promise<OrganizationProjectTag[]>;

  getOrganizationProjectTagIntersection(
    organizationId: string,
    projectIds: string[],
    tagIds: string[],
    transaction?: unknown
  ): Promise<OrganizationProjectTag[]>;

  getOrganizationProjectTag(
    params: QueryOrganizationProjectTagInput,
    transaction?: unknown
  ): Promise<OrganizationProjectTag>;

  addOrganizationProjectTag(
    params: AddOrganizationProjectTagInput,
    transaction?: unknown
  ): Promise<OrganizationProjectTag>;

  updateOrganizationProjectTag(
    params: UpdateOrganizationProjectTagInput,
    transaction?: unknown
  ): Promise<OrganizationProjectTag>;

  softDeleteOrganizationProjectTag(
    params: RemoveOrganizationProjectTagInput,
    transaction?: unknown
  ): Promise<OrganizationProjectTag>;

  hardDeleteOrganizationProjectTag(
    params: RemoveOrganizationProjectTagInput,
    transaction?: unknown
  ): Promise<OrganizationProjectTag>;
}

export interface IOrganizationProjectApiKeyRepository {
  getOrganizationProjectApiKeys(
    params: QueryOrganizationProjectApiKeysInput,
    transaction?: unknown
  ): Promise<OrganizationProjectApiKey[]>;

  addOrganizationProjectApiKey(
    params: AddOrganizationProjectApiKeyInput,
    transaction?: unknown
  ): Promise<OrganizationProjectApiKey>;

  getByApiKeyAndOrganizationAndProject(
    apiKeyId: string,
    organizationId: string,
    projectId: string,
    transaction?: unknown
  ): Promise<OrganizationProjectApiKey | null>;
}

export interface IOrganizationTagRepository {
  getOrganizationTags(
    params: QueryOrganizationTagsInput,
    transaction?: unknown
  ): Promise<OrganizationTag[]>;

  addOrganizationTag(
    params: AddOrganizationTagInput,
    transaction?: unknown
  ): Promise<OrganizationTag>;

  updateOrganizationTag(
    params: UpdateOrganizationTagInput,
    transaction?: unknown
  ): Promise<OrganizationTag>;

  softDeleteOrganizationTag(
    params: RemoveOrganizationTagInput,
    transaction?: unknown
  ): Promise<OrganizationTag>;

  hardDeleteOrganizationTag(
    params: RemoveOrganizationTagInput,
    transaction?: unknown
  ): Promise<OrganizationTag>;
}

export interface IOrganizationMemberRepository {
  getOrganizationMembers(
    params: QueryOrganizationMembersArgs,
    transaction?: unknown
  ): Promise<OrganizationMemberPage>;

  getOrganizationMember(
    params: { organizationId: string; userId: string },
    transaction?: unknown
  ): Promise<OrganizationMember | null>;
}

export interface IOrganizationInvitationRepository {
  createInvitation(
    params: CreateOrganizationInvitationInput,
    transaction?: unknown
  ): Promise<OrganizationInvitation>;

  getInvitationById(id: string, transaction?: unknown): Promise<OrganizationInvitation | null>;

  getInvitationByToken(
    params: GetInvitationQueryVariables & SelectedFields<OrganizationInvitation>,
    transaction?: unknown
  ): Promise<OrganizationInvitation | null>;

  getOrganizationInvitations(
    params: QueryOrganizationInvitationsArgs,
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

  softDeleteInvitation(id: string, transaction?: unknown): Promise<OrganizationInvitation>;
}
