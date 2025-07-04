import { UserDataProvider } from '@/graphql/resolvers/users/providers/types';
import { getUsers } from './getUsers';
import { createUser } from './createUser';
import { updateUser } from './updateUser';
import { deleteUser } from './deleteUser';

export const userFakerProvider: UserDataProvider = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
};
