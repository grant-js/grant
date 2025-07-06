import { CreateUserParams, CreateUserResult } from '@/graphql/providers/users/types';
import { createUser as createUserInStore } from '@/graphql/providers/users/faker/dataStore';

export async function createUser({ input }: CreateUserParams): Promise<CreateUserResult> {
  return createUserInStore(input);
}
