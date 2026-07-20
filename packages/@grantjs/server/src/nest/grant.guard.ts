import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { GrantClient } from '../grant-client';
import { debugGrant } from '../utils/debug';
import { extractTokenFromRequest } from '../utils/token-extractor';
import { GRANT_OPTIONS_KEY } from './grant.decorator';
import { GRANT_CLIENT } from './grant.module';

/** Injection token for GrantGuard. Use with @UseGuards(GRANT_GUARD) so Nest resolves the guard from the container (with GrantClient injected). */
export const GRANT_GUARD = 'GrantGuard';

import type { AuthorizationResult, ResourceResolver } from '../types';
import type { GrantOptions } from './grant.decorator';

/**
 * Extended request type with Grant authorization result (for use in controllers).
 */
export interface AuthorizedRequest {
  authorization?: AuthorizationResult;
}

/**
 * Guard options when using explicit options (includes optional resourceResolver).
 */
export interface GrantGuardOptions {
  resource: string;
  action: string;
  resourceResolver?: ResourceResolver;
}

/**
 * NestJS guard that checks Grant authorization before allowing access to a route.
 *
 * Use in one of two ways:
 *
 * 1. With decorator (resource/action from metadata):
 *    - Import GrantModule.forRoot() in AppModule. In a feature module, add
 *      `{ provide: GRANT_GUARD, useClass: GrantGuard }` and use @Grant + @UseGuards(GRANT_GUARD).
 *    - Using the GRANT_GUARD token ensures Nest resolves the guard from the container (GrantClient injected).
 *
 * 2. With explicit options (supports resourceResolver):
 *    - @UseGuards(new GrantGuard(grantClient, { resource: 'Document', action: 'Update', resourceResolver: async ({ request }) => ... }))
 *
 * On success, the authorization result is attached to the request as request.authorization.
 * On failure, throws UnauthorizedException (401), ForbiddenException (403), or NotFoundException (404).
 */
function isGrantGuardOptions(x: unknown): x is GrantGuardOptions {
  return (
    typeof x === 'object' &&
    x !== null &&
    'resource' in x &&
    'action' in x &&
    typeof (x as GrantGuardOptions).resource === 'string' &&
    typeof (x as GrantGuardOptions).action === 'string'
  );
}

@Injectable()
export class GrantGuard implements CanActivate {
  private readonly explicitOptions?: GrantGuardOptions;
  private readonly reflector?: Reflector;

  constructor(
    @Inject(GRANT_CLIENT) private readonly client: GrantClient,
    reflectorOrOptions?: Reflector | GrantGuardOptions
  ) {
    if (reflectorOrOptions && isGrantGuardOptions(reflectorOrOptions)) {
      this.explicitOptions = reflectorOrOptions;
    } else {
      this.reflector = reflectorOrOptions as Reflector | undefined;
    }
  }

  private getOptionsFromContext(context: ExecutionContext): GrantOptions | undefined {
    const handler = context.getHandler();
    const clazz = context.getClass();
    // Prefer Reflector when available (Nest DI)
    if (this.reflector) {
      const fromHandler = this.reflector.get<GrantOptions>(GRANT_OPTIONS_KEY, handler);
      const fromClass = this.reflector.get<GrantOptions>(GRANT_OPTIONS_KEY, clazz);
      if (fromHandler) return fromHandler;
      if (fromClass) return fromClass;
    }
    // Fallback: read metadata via Reflect (works when Reflector is not injected, e.g. ESM/CJS boundary)
    if (typeof Reflect !== 'undefined' && typeof Reflect.getMetadata === 'function') {
      const fromHandler = Reflect.getMetadata(GRANT_OPTIONS_KEY, handler) as
        GrantOptions | undefined;
      const fromClass = Reflect.getMetadata(GRANT_OPTIONS_KEY, clazz) as GrantOptions | undefined;
      if (fromHandler) return fromHandler;
      if (fromClass) return fromClass;
    }
    return undefined;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const options = this.explicitOptions ?? this.getOptionsFromContext(context);

    if (options?.resource && options?.action) {
      debugGrant('Nest', {
        resource: options.resource,
        action: options.action,
        hasReflector: !!this.reflector,
        handler: context.getHandler()?.name,
        controller: context.getClass()?.name,
      });
    }

    if (!options || !options.resource || !options.action) {
      throw new ForbiddenException(
        'Grant options (resource, action) required. Use @Grant() or pass options to GrantGuard.'
      );
    }

    if (!this.client) {
      throw new ForbiddenException(
        'GrantGuard: GrantClient not injected. Import GrantModule.forRoot() in AppModule and register GrantGuard as a provider.'
      );
    }

    const token = await extractTokenFromRequest(request, this.client.config);
    if (!token) {
      throw new UnauthorizedException({ error: 'Unauthorized', code: 'UNAUTHENTICATED' });
    }

    let resolvedResource: Record<string, unknown> | null = null;

    const opts = options as GrantGuardOptions;
    if (opts.resourceResolver) {
      resolvedResource = await opts.resourceResolver({
        resourceSlug: options.resource,
        request,
      });
      if (!resolvedResource) {
        throw new NotFoundException({ error: 'Resource not found', code: 'NOT_FOUND' });
      }
    }

    const result = await this.client.isAuthorized(
      options.resource,
      options.action,
      {
        context: {
          resource: resolvedResource ?? undefined,
        },
      },
      request
    );

    debugGrant('Nest', {
      resource: options.resource,
      action: options.action,
      authorized: result.authorized,
      ...(result.authorized ? {} : { reason: result.reason }),
    });

    if (!result.authorized) {
      throw new ForbiddenException({
        error: 'Forbidden',
        code: 'FORBIDDEN',
        reason: result.reason,
      });
    }

    (request as AuthorizedRequest).authorization = result;
    return true;
  }
}
