import { MutationLoginArgs, LoginResponse } from '@/graphql/generated/types';

export type LoginParams = MutationLoginArgs;
export type LoginResult = LoginResponse;

export interface AuthDataProvider {
  login(params: LoginParams): Promise<LoginResult>;
  // We can add more auth operations here as needed
  // e.g., logout, refresh token, etc.
}
