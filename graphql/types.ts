import { GraphQLResolveInfo } from 'graphql';

import { Providers } from './config/providers/interface';
import { Controllers } from './controllers';

export interface AuthenticatedUser {
  id: string;
  sub: string;
}

export interface GraphqlContext {
  providers: Providers;
  controllers: Controllers;
  info?: GraphQLResolveInfo;
}
