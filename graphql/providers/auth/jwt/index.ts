import { login } from '@/graphql/providers/auth/jwt/login';
import { AuthDataProvider } from '@/graphql/providers/auth/types';
export const jwtProvider: AuthDataProvider = {
  login,
};
