import { User } from '@/graphql/generated/types';
import { createUser as createUserInStore } from '@/graphql/providers/users/faker/dataStore';
import { CreateUserParams, CreateUserResult } from '@/graphql/providers/users/types';

export async function createUser({ input }: CreateUserParams): Promise<CreateUserResult> {
  const userData = createUserInStore(input);
  return userData as User; // Convert UserData to User for GraphQL
}
