import { Tenant } from '@logusgraphics/grant-schema';
import { JwtPayload, verify } from 'jsonwebtoken';

import { AuthenticatedUser } from '../types';

import { JWT_SECRET } from './constants';

export function extractUserFromToken(authHeader: string | null): AuthenticatedUser | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = verify(token, JWT_SECRET) as JwtPayload;

    if (!decoded.sub) {
      console.warn('JWT token missing required field (sub)');
      return null;
    }

    let scope;
    if (decoded.aud && typeof decoded.aud === 'string') {
      const [tenantStr, scopeId] = decoded.aud.split(':');

      let tenant: Tenant;
      switch (tenantStr) {
        case 'account':
          tenant = Tenant.Account;
          break;
        case 'organization':
          tenant = Tenant.Organization;
          break;
        case 'project':
          tenant = Tenant.Project;
          break;
        default:
          console.warn(`Unknown tenant type in JWT aud claim: ${tenantStr}`);
          return null;
      }

      if (!scopeId) {
        console.warn('JWT token aud claim missing scope ID');
        return null;
      }

      scope = {
        tenant,
        id: scopeId,
      };
    } else {
      console.warn('JWT token missing or invalid aud claim');
      return null;
    }

    return {
      id: decoded.sub,
      scope,
    };
  } catch (error) {
    console.warn(
      'JWT token verification failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return null;
  }
}
