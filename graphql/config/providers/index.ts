import { jwtProvider } from '@/graphql/providers/auth/jwt';

import { Providers } from './interface';

export const providers: Providers = {
  auth: jwtProvider,
};
