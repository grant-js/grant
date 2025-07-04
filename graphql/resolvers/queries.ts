import * as userQueries from './users/queries';
import * as roleQueries from './roles/queries';

export const Query = {
  _empty: () => null,
  users: userQueries.getUsers,
  roles: roleQueries.getRoles,
} as const;
