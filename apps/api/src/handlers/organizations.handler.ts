import { ORGANIZATION_ROLE_DEFINITIONS, RoleKey } from '@grantjs/constants';
import type {
  IFileStorageServicePort,
  IOrganizationGroupService,
  IOrganizationPermissionService,
  IOrganizationProjectService,
  IOrganizationRoleService,
  IOrganizationService,
  IOrganizationTagService,
  IOrganizationUserService,
  ITransactionalConnection,
  IUserRoleService,
} from '@grantjs/core';
import {
  ConfirmOrganizationPictureUploadInput,
  MutationCreateOrganizationArgs,
  MutationDeleteOrganizationArgs,
  MutationUpdateOrganizationArgs,
  Organization,
  OrganizationPage,
  QueryOrganizationsArgs,
  RequestOrganizationPictureUploadUrlInput,
  Tenant,
  UploadOrganizationPictureInput,
  UploadUrl,
} from '@grantjs/schema';

import { config } from '@/config';
import { IEntityCacheAdapter } from '@/lib/cache';
import { BadRequestError, ConfigurationError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams, SelectedFields } from '@/types';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

export class OrganizationHandler extends CacheHandler {
  constructor(
    private readonly organizations: IOrganizationService,
    private readonly organizationRoles: IOrganizationRoleService,
    private readonly organizationUsers: IOrganizationUserService,
    private readonly userRoles: IUserRoleService,
    private readonly organizationProjects: IOrganizationProjectService,
    private readonly organizationGroups: IOrganizationGroupService,
    private readonly organizationPermissions: IOrganizationPermissionService,
    private readonly organizationTags: IOrganizationTagService,
    private readonly fileStorage: IFileStorageServicePort,
    cache: IEntityCacheAdapter,
    scopeServices: ScopeServices,
    private readonly db: ITransactionalConnection<Transaction>
  ) {
    super(cache, scopeServices);
  }

  public async getOrganizations(
    params: Omit<QueryOrganizationsArgs, 'scope'> & SelectedFields<Organization>
  ): Promise<OrganizationPage> {
    const { page, limit, sort, search, ids, requestedFields } = params;

    const organizationsResult = await this.organizations.getOrganizations({
      ids,
      page,
      limit,
      sort,
      search,
      requestedFields,
    });

    return organizationsResult;
  }

  public async createOrganization(
    params: MutationCreateOrganizationArgs,
    userId: string
  ): Promise<Organization> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { input } = params;
      const { name } = input;

      const organization = await this.organizations.createOrganization({ name }, tx);

      const seededRoles = await this.organizationRoles.seedOrganizationRoles(organization.id, tx);

      const ownerRole = seededRoles.find(
        (r) => r.role.name === ORGANIZATION_ROLE_DEFINITIONS[RoleKey.OrganizationOwner].name
      );
      if (!ownerRole) {
        throw new ConfigurationError('Organization Owner role not seeded');
      }

      await this.organizationUsers.addOrganizationUser(
        { organizationId: organization.id, userId, roleId: ownerRole.role.id },
        tx
      );

      return organization;
    });
  }

  public async updateOrganization(params: MutationUpdateOrganizationArgs): Promise<Organization> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const updatedOrganization = await this.organizations.updateOrganization(params, tx);
      return updatedOrganization;
    });
  }

  public async deleteOrganization(
    params: Omit<MutationDeleteOrganizationArgs, 'scope'> & DeleteParams
  ): Promise<Organization> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { id: organizationId } = params;
      const [
        organizationProjects,
        organizationUsers,
        organizationRoles,
        organizationGroups,
        organizationPermissions,
        organizationTags,
      ] = await Promise.all([
        this.organizationProjects.getOrganizationProjects({ organizationId }, tx),
        this.organizationUsers.getOrganizationUsers({ organizationId }, tx),
        this.organizationRoles.getOrganizationRoles({ organizationId }, tx),
        this.organizationGroups.getOrganizationGroups({ organizationId }, tx),
        this.organizationPermissions.getOrganizationPermissions({ organizationId }, tx),
        this.organizationTags.getOrganizationTags({ organizationId }, tx),
      ]);
      const orgRoleIds = organizationRoles.map((or) => or.roleId);
      const userRolesForOrgRoles = await Promise.all(
        orgRoleIds.map((roleId) => this.userRoles.getUserRoles({ roleId }, tx))
      );

      await Promise.all([
        ...organizationProjects.map((op) =>
          this.organizationProjects.removeOrganizationProject(
            { organizationId, projectId: op.projectId },
            tx
          )
        ),
        ...organizationUsers.map((ou) =>
          this.organizationUsers.removeOrganizationUser({ organizationId, userId: ou.userId }, tx)
        ),
        ...organizationRoles.map((or) =>
          this.organizationRoles.removeOrganizationRole({ organizationId, roleId: or.roleId }, tx)
        ),
        ...organizationGroups.map((og) =>
          this.organizationGroups.removeOrganizationGroup(
            { organizationId, groupId: og.groupId },
            tx
          )
        ),
        ...organizationPermissions.map((op) =>
          this.organizationPermissions.removeOrganizationPermission(
            { organizationId, permissionId: op.permissionId },
            tx
          )
        ),
        ...organizationTags.map((ot) =>
          this.organizationTags.removeOrganizationTag({ organizationId, tagId: ot.tagId }, tx)
        ),
        ...userRolesForOrgRoles
          .flat()
          .map((ur) => this.userRoles.removeUserRole({ userId: ur.userId, roleId: ur.roleId }, tx)),
      ]);

      return await this.organizations.deleteOrganization(params, tx);
    });
  }

  private assertOrganizationPictureScope(
    organizationId: string,
    scope: UploadOrganizationPictureInput['scope']
  ): void {
    if (scope.tenant === Tenant.Organization && scope.id !== organizationId) {
      throw new BadRequestError('Organization id must match scope');
    }
  }

  private organizationPicturePath(organizationId: string, filename: string): string {
    return this.fileStorage.sanitizeExtensionAndGeneratePath(
      filename,
      `organizations/${organizationId}/picture`
    );
  }

  public async requestOrganizationPictureUploadUrl(
    params: RequestOrganizationPictureUploadUrlInput
  ): Promise<UploadUrl> {
    const { organizationId, filename, contentType, contentLength, scope } = params;

    this.assertOrganizationPictureScope(organizationId, scope);
    this.fileStorage.validateUploadRequest({ contentType, filename, contentLength });

    const minted = await this.fileStorage.getUploadUrl(
      this.organizationPicturePath(organizationId, filename),
      {
        contentType,
        contentLength,
        expiresInSeconds: config.storage.upload.urlExpirySeconds,
      }
    );

    return {
      url: minted.url,
      method: minted.method,
      expiresAt: minted.expiresAt,
      headers: Object.entries(minted.headers).map(([name, value]) => ({ name, value })),
    };
  }

  public async confirmOrganizationPictureUpload(
    params: ConfirmOrganizationPictureUploadInput
  ): Promise<{ url: string; path: string }> {
    const { organizationId, filename, scope } = params;

    this.assertOrganizationPictureScope(organizationId, scope);

    const storagePath = this.organizationPicturePath(organizationId, filename);
    await this.fileStorage.assertStoredWithinPolicy(storagePath);

    return await this.db.withTransaction(async (tx: Transaction) => {
      const url = await this.fileStorage.getUrl(storagePath);

      await this.organizations.setOrganizationPicture(
        organizationId,
        { picturePath: storagePath },
        tx
      );

      return { url, path: storagePath };
    });
  }

  public async uploadOrganizationPicture(
    params: UploadOrganizationPictureInput
  ): Promise<{ url: string; path: string }> {
    const { organizationId, file, contentType, filename, scope } = params;

    this.assertOrganizationPictureScope(organizationId, scope);

    const fileBuffer = this.fileStorage.validateAndDecodeUpload({
      file,
      contentType,
      filename,
    });

    const storagePath = this.organizationPicturePath(organizationId, filename);

    return await this.db.withTransaction(async (tx: Transaction) => {
      const result = await this.fileStorage.upload(fileBuffer, storagePath, {
        contentType,
        public: true,
      });

      await this.organizations.setOrganizationPicture(
        organizationId,
        { picturePath: result.path },
        tx
      );

      return {
        url: result.url,
        path: result.path,
      };
    });
  }
}
