import { Controllers } from './controllers';

// Backward compatibility alias for generated types
export type GraphqlContext = {
  user: AuthenticatedUser | null;
  controllers: Controllers;
};

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
}
