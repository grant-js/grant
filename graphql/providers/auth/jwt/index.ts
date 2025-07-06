import { AuthDataProvider } from '@/graphql/providers/auth/types';
import { login } from '@/graphql/providers/auth/jwt/login';

export const jwtProvider: AuthDataProvider = {
  login,
};
