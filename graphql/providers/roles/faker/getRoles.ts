import {
  QueryRolesArgs,
  RolePage,
  RoleSortableField,
  RoleSortOrder,
} from '@/graphql/generated/types';
import { getRoleTagsByTagId } from '@/graphql/providers/role-tags/faker/dataStore';
import { getRoles as getRolesFromDataStore } from '@/graphql/providers/roles/faker/dataStore';
const SEARCHABLE_FIELDS = ['name', 'description'] as const;
const DEFAULT_SORT = { field: RoleSortableField.Name, order: RoleSortOrder.Asc };
export async function getRoles({
  page = 1,
  limit = 50,
  sort,
  search,
  ids,
  tagIds,
}: QueryRolesArgs): Promise<RolePage> {
  const safePage = typeof page === 'number' && page > 0 ? page : 1;
  const safeLimit = typeof limit === 'number' ? limit : 50;
  let allRoles =
    ids && ids.length > 0
      ? getRolesFromDataStore(sort || DEFAULT_SORT, ids)
      : getRolesFromDataStore(sort || DEFAULT_SORT);
  if (tagIds && tagIds.length > 0) {
    const roleTagRelationships = tagIds.flatMap((tagId: string) => getRoleTagsByTagId(tagId));
    const roleIdsWithTags = [...new Set(roleTagRelationships.map((rt) => rt.roleId))];
    allRoles = allRoles.filter((role) => roleIdsWithTags.includes(role.id));
  }
  const filteredBySearchRoles = search
    ? allRoles.filter((role) =>
        SEARCHABLE_FIELDS.some((field) =>
          (role[field] ? String(role[field]).toLowerCase() : '').includes(search.toLowerCase())
        )
      )
    : allRoles;
  const totalCount = filteredBySearchRoles.length;
  if (safeLimit <= 0) {
    return {
      roles: filteredBySearchRoles,
      totalCount,
      hasNextPage: false,
    };
  }
  const hasNextPage = safePage < Math.ceil(totalCount / safeLimit);
  const startIndex = (safePage - 1) * safeLimit;
  const endIndex = startIndex + safeLimit;
  const roles = filteredBySearchRoles.slice(startIndex, endIndex);
  return {
    roles,
    totalCount,
    hasNextPage,
  };
}
