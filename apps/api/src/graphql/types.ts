import { Scope } from '@logusgraphics/grant-schema';

import { Controllers } from './controllers';

export type GraphqlContext = {
  user: AuthenticatedUser | null;
  controllers: Controllers;
};

export interface AuthenticatedUser {
  id: string;
  scope: Scope;
}
