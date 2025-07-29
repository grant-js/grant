import { createUser } from '@/graphql/providers/users/faker/createUser';
import { deleteUser } from '@/graphql/providers/users/faker/deleteUser';
import { getUsers } from '@/graphql/providers/users/faker/getUsers';
import { updateUser } from '@/graphql/providers/users/faker/updateUser';
import { UserDataProvider } from '@/graphql/providers/users/types';

export const userFakerProvider: UserDataProvider = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
};
