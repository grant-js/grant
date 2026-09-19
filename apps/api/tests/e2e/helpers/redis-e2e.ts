/**
 * E2E Redis helper for project OAuth email magic-link flow.
 *
 * The API stores the one-time token payload in Redis (key: grant:oauth:oauth:project-email-token:<token>).
 * From the host we connect to the E2E Redis instance (e.g. localhost:6380) to read the token and payload
 * after POST /api/auth/project/email/request, then drive GET /api/auth/project/callback?token=...&state=...
 */
import Redis from 'ioredis';

const E2E_REDIS_HOST = process.env.E2E_REDIS_HOST ?? 'localhost';
const E2E_REDIS_PORT = Number(process.env.E2E_REDIS_PORT ?? '6380');
const E2E_REDIS_PASSWORD = process.env.E2E_REDIS_PASSWORD ?? 'grant_redis_password';

const OAUTH_KEY_PREFIX = 'grant:oauth:oauth:project-email-token:';

let client: Redis | null = null;

function getClient(): Redis {
  if (!client) {
    client = new Redis({
      host: E2E_REDIS_HOST,
      port: E2E_REDIS_PORT,
      password: E2E_REDIS_PASSWORD,
      protocol: 2,
      maxRetriesPerRequest: 2,
      retryStrategy: () => null,
    });
  }
  return client;
}

export interface ProjectOAuthEmailTokenPayload {
  projectAppId: string;
  redirectUri: string;
  stateId: string;
  email: string;
  clientState?: string;
}

/**
 * Find the first project OAuth email token key in Redis and return the token and payload.
 * Use after POST /api/auth/project/email/request in a quiet test (one request = one key).
 */
export async function getProjectOAuthEmailTokenFromRedis(): Promise<{
  token: string;
  payload: ProjectOAuthEmailTokenPayload;
} | null> {
  const redis = getClient();
  const keys = await redis.keys(`${OAUTH_KEY_PREFIX}*`);
  if (keys.length === 0) return null;

  const key = keys[0];
  const token = key.slice(OAUTH_KEY_PREFIX.length);
  const raw = await redis.get(key);
  if (!raw) return null;

  try {
    const payload = JSON.parse(raw) as ProjectOAuthEmailTokenPayload;
    return { token, payload };
  } catch {
    return null;
  }
}

/** Close the Redis connection. Call in afterAll if needed. */
export async function closeRedisHelper(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
