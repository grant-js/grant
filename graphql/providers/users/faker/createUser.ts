import { MutationCreateUserArgs, User } from '@/graphql/generated/types';
import { createUser as createUserInStore } from '@/graphql/providers/users/faker/dataStore';
export async function createUser({ input }: MutationCreateUserArgs): Promise<User> {
  const userData = createUserInStore(input);
  return userData;
}
