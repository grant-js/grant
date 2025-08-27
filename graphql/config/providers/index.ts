import { jwtProvider } from '@/graphql/providers/auth/jwt';

import { ModuleProviders } from './interface';

export const providers: ModuleProviders = {
  auth: jwtProvider,
};
