import { GET_PERMISSIONS } from './queries';

export const updatePermissionsCache = (cache: any, newPermission: any) => {
  // Update the permissions list in cache
  const existingData = cache.readQuery({ query: GET_PERMISSIONS });
  if (existingData) {
    cache.writeQuery({
      query: GET_PERMISSIONS,
      data: {
        permissions: {
          ...existingData.permissions,
          permissions: [...existingData.permissions.permissions, newPermission],
          totalCount: existingData.permissions.totalCount + 1,
        },
      },
    });
  }
};
