import {
  PermissionPage,
  PermissionSortableField,
  PermissionSortOrder,
  QueryPermissionsArgs,
} from '@/graphql/generated/types';
import { getPermissionTagsByTagId } from '@/graphql/providers/permission-tags/faker/dataStore';
import { getPermissions as getPermissionsFromDataStore } from '@/graphql/providers/permissions/faker/dataStore';
const SEARCHABLE_FIELDS = ['name', 'description', 'action'] as const;
const DEFAULT_SORT = { field: PermissionSortableField.Name, order: PermissionSortOrder.Asc };
export async function getPermissions({
  page,
  limit,
  sort,
  search,
  ids,
  tagIds,
}: QueryPermissionsArgs): Promise<PermissionPage> {
  const safePage = typeof page === 'number' && page > 0 ? page : 1;
  const safeLimit = typeof limit === 'number' ? limit : 50;
  let allPermissions =
    ids && ids.length > 0
      ? getPermissionsFromDataStore(sort || DEFAULT_SORT, ids)
      : getPermissionsFromDataStore(sort || DEFAULT_SORT);
  if (tagIds && tagIds.length > 0) {
    const permissionTagRelationships = tagIds.flatMap((tagId: string) =>
      getPermissionTagsByTagId(tagId)
    );
    const permissionIdsWithTags = [
      ...new Set(permissionTagRelationships.map((pt) => pt.permissionId)),
    ];
    allPermissions = allPermissions.filter((permission) =>
      permissionIdsWithTags.includes(permission.id)
    );
  }
  const filteredBySearchPermissions = search
    ? allPermissions.filter((permission) =>
        SEARCHABLE_FIELDS.some((field) =>
          (permission[field] ? String(permission[field]).toLowerCase() : '').includes(
            search.toLowerCase()
          )
        )
      )
    : allPermissions;
  const totalCount = filteredBySearchPermissions.length;
  if (safeLimit <= 0) {
    return {
      permissions: filteredBySearchPermissions,
      totalCount,
      hasNextPage: false,
    };
  }
  const hasNextPage = safePage < Math.ceil(totalCount / safeLimit);
  const startIndex = (safePage - 1) * safeLimit;
  const endIndex = startIndex + safeLimit;
  const permissions = filteredBySearchPermissions.slice(startIndex, endIndex);
  return {
    permissions,
    totalCount,
    hasNextPage,
  };
}
