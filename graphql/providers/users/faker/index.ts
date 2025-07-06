import { UserDataProvider } from '@/graphql/providers/users/types';
import { getUsers } from '@/graphql/providers/users/faker/getUsers';
import { createUser } from '@/graphql/providers/users/faker/createUser';
import { updateUser } from '@/graphql/providers/users/faker/updateUser';
import { deleteUser } from '@/graphql/providers/users/faker/deleteUser';

export const userFakerProvider: UserDataProvider = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
};
