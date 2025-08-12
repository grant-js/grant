import {
  QueryUsersArgs,
  MutationCreateUserArgs,
  MutationUpdateUserArgs,
  MutationDeleteUserArgs,
  User,
  UserPage,
} from '@/graphql/generated/types';
export interface UserDataProvider {
  getUsers(params: QueryUsersArgs): Promise<UserPage>;
  createUser(params: MutationCreateUserArgs): Promise<User>;
  updateUser(params: MutationUpdateUserArgs): Promise<User>;
  deleteUser(params: MutationDeleteUserArgs): Promise<User>;
}
