import { resolveRuntimeContext, type RuntimeFlags } from '../config/credentials.js';
import { refreshAndPersistSession, resolveAccessToken } from '../config/resolve-token.js';
import { CliError, EXIT_AUTH } from './errors.js';
import { apiRequest, type TransportResponse } from './transport.js';

export interface AuthenticatedRequest {
  flags?: RuntimeFlags;
  method: string;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  injectScope?: boolean;
}

const REAUTH_HINT =
  'Session expired or unauthorized. Run "grant start" again, or use an api-key profile / GRANT_ACCESS_TOKEN.';

export async function authenticatedRequest<T = unknown>(
  req: AuthenticatedRequest
): Promise<TransportResponse<T>> {
  const ctx = await resolveRuntimeContext(req.flags);
  const query = { ...req.query };
  if (req.injectScope !== false && ctx.scope) {
    query.scopeId ??= ctx.scope.id;
    query.tenant ??= ctx.scope.tenant;
  }

  const send = (token: string) =>
    apiRequest<T>({
      apiUrl: ctx.apiUrl,
      method: req.method,
      path: req.path,
      token,
      originVerifySecret: ctx.originVerifySecret,
      query,
      body: req.body,
    });

  let token = await resolveAccessToken(ctx.config);
  try {
    return await send(token);
  } catch (err) {
    const canRefresh =
      err instanceof CliError &&
      err.exitCode === EXIT_AUTH &&
      ctx.config.authMethod === 'session' &&
      Boolean(ctx.config.session?.refreshToken);
    if (!canRefresh) {
      if (err instanceof CliError && err.exitCode === EXIT_AUTH) {
        throw new CliError(REAUTH_HINT, EXIT_AUTH);
      }
      throw err;
    }
    try {
      token = await refreshAndPersistSession(ctx.config, ctx.profileName);
      return await send(token);
    } catch (refreshErr) {
      if (refreshErr instanceof CliError && refreshErr.exitCode === EXIT_AUTH) {
        throw new CliError(REAUTH_HINT, EXIT_AUTH);
      }
      throw refreshErr;
    }
  }
}
