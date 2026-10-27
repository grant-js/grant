import type { IProjectPermissionRepository } from '@grantjs/core';
import {
  permissions,
  ProjectPermissionModel,
  projectPermissions,
  resources,
} from '@grantjs/database';
import {
  AddProjectPermissionInput,
  ProjectPermission,
  QueryProjectPermissionsInput,
  RemoveProjectPermissionInput,
} from '@grantjs/schema';
import { and, eq, isNull } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

export class ProjectPermissionRepository
  extends PivotRepository<ProjectPermissionModel, ProjectPermission>
  implements IProjectPermissionRepository
{
  protected table = projectPermissions;
  protected uniqueIndexFields: Array<keyof ProjectPermissionModel> = ['projectId', 'permissionId'];

  protected toEntity(dbPivot: ProjectPermissionModel): ProjectPermission {
    return dbPivot;
  }

  public async getProjectPermissions(
    params: QueryProjectPermissionsInput,
    transaction?: Transaction
  ): Promise<ProjectPermission[]> {
    return this.query(params, transaction);
  }

  public async addProjectPermission(
    params: AddProjectPermissionInput,
    transaction?: Transaction
  ): Promise<ProjectPermission> {
    return this.add(params, transaction);
  }

  public async addProjectPermissions(
    params: readonly AddProjectPermissionInput[],
    transaction?: Transaction
  ): Promise<ProjectPermission[]> {
    return this.addMany(params, transaction);
  }

  public async softDeleteProjectPermission(
    params: RemoveProjectPermissionInput,
    transaction?: Transaction
  ): Promise<ProjectPermission> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteProjectPermission(
    params: RemoveProjectPermissionInput,
    transaction?: Transaction
  ): Promise<ProjectPermission> {
    return this.hardDelete(params, transaction);
  }

  /**
   * Returns allowed OAuth scope slugs (resource:action) for the project, from project permissions.
   */
  public async getScopeSlugsForProject(
    projectId: string,
    transaction?: Transaction
  ): Promise<string[]> {
    const db = transaction ?? this.db;
    const rows = await db
      .select({
        slug: resources.slug,
        action: permissions.action,
      })
      .from(projectPermissions)
      .innerJoin(permissions, eq(projectPermissions.permissionId, permissions.id))
      .innerJoin(
        resources,
        and(eq(permissions.resourceId, resources.id), isNull(resources.deletedAt))
      )
      .where(
        and(
          eq(projectPermissions.projectId, projectId),
          isNull(projectPermissions.deletedAt),
          isNull(permissions.deletedAt)
        )
      );
    return rows.map((r) => `${r.slug}:${r.action}`);
  }

  /**
   * Returns permission name and description for each scope slug (resource:action) that exists in the project.
   */
  public async getScopeSlugLabelsForProject(
    projectId: string,
    scopeSlugs: string[],
    transaction?: Transaction
  ): Promise<{ slug: string; name: string; description: string | null }[]> {
    if (scopeSlugs.length === 0) return [];
    const db = transaction ?? this.db;
    const rows = await db
      .select({
        slug: resources.slug,
        action: permissions.action,
        name: permissions.name,
        description: permissions.description,
      })
      .from(projectPermissions)
      .innerJoin(permissions, eq(projectPermissions.permissionId, permissions.id))
      .innerJoin(
        resources,
        and(eq(permissions.resourceId, resources.id), isNull(resources.deletedAt))
      )
      .where(
        and(
          eq(projectPermissions.projectId, projectId),
          isNull(projectPermissions.deletedAt),
          isNull(permissions.deletedAt)
        )
      );
    const slugToLabel = new Map<string, { name: string; description: string | null }>();
    for (const r of rows) {
      const slug = `${r.slug}:${r.action}`.toLowerCase();
      slugToLabel.set(slug, { name: r.name, description: r.description });
    }
    return scopeSlugs
      .filter((slug) => slugToLabel.has(slug.trim().toLowerCase()))
      .map((slug) => {
        const label = slugToLabel.get(slug.trim().toLowerCase())!;
        return { slug, name: label.name, description: label.description };
      });
  }
}
