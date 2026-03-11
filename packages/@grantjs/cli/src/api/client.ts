/**
 * Minimal REST client for Grant API.
 * Used by start (token exchange) and generate-types (resources/permissions).
 */

export interface TokenExchangeScope {
  id: string;
  tenant: string;
}

export interface TokenExchangeRequest {
  clientId: string;
  clientSecret: string;
  scope: TokenExchangeScope;
}

export interface TokenExchangeResponse {
  accessToken: string;
  expiresIn: number;
}

export interface ApiErrorBody {
  success?: false;
  error?: { code?: string; message?: string };
  reason?: string;
  code?: string;
}

/** Set GRANT_CLI_DEBUG=1 for extra verbosity (e.g. request headers). */
const _DEBUG = process.env.GRANT_CLI_DEBUG === '1' || process.env.GRANT_CLI_DEBUG === 'true';

/** Log request URL, status, and response body when an API call fails (always on failure). */
function logFailedRequest(
  label: string,
  url: string,
  status: number,
  bodyText: string,
  extra?: Record<string, unknown>
): void {
  console.error(`[Grant CLI] ${label} failed`);
  console.error(`[Grant CLI]   URL: ${url}`);
  console.error(`[Grant CLI]   Status: ${status}`);
  if (bodyText) {
    try {
      const parsed = JSON.parse(bodyText) as Record<string, unknown>;
      console.error(`[Grant CLI]   Response: ${JSON.stringify(parsed, null, 2)}`);
    } catch {
      console.error(`[Grant CLI]   Response (raw): ${bodyText.slice(0, 500)}`);
    }
  }
  if (extra && Object.keys(extra).length > 0) {
    console.error(`[Grant CLI]   Extra: ${JSON.stringify(extra)}`);
  }
}

export interface LoginAccount {
  id: string;
  type: string;
  ownerId: string | null;
  [key: string]: unknown;
}

export interface LoginResult {
  /** Primary account (personal or first). */
  account: LoginAccount;
  /** All user accounts from login (personal + organization). Use for account selector. */
  accounts: LoginAccount[];
  accessToken: string;
  refreshToken: string;
}

export interface OrganizationItem {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface ProjectItem {
  id: string;
  name: string;
  slug: string;
  [key: string]: unknown;
}

/**
 * Build a detailed message when a request fails before or during fetch (e.g. connection refused, DNS, SSL).
 */
function detailFetchError(url: string, err: unknown): string {
  const attempted = `Request URL: ${url}`;
  const msg = err instanceof Error ? err.message : String(err);
  const cause =
    err instanceof Error && err.cause instanceof Error
      ? err.cause.message
      : err instanceof Error && typeof (err as NodeJS.ErrnoException).code === 'string'
        ? (err as NodeJS.ErrnoException).code
        : null;
  if (cause && cause !== msg) {
    return `Token exchange failed: ${msg}. Cause: ${cause}. ${attempted}`;
  }
  return `Token exchange failed: ${msg}. ${attempted}`;
}

/**
 * Exchange API key (clientId + clientSecret) for an access token.
 * POST {baseUrl}/api/auth/token
 */
export async function exchangeApiKey(
  baseUrl: string,
  body: TokenExchangeRequest
): Promise<TokenExchangeResponse> {
  const url = new URL('/api/auth/token', baseUrl).href;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(detailFetchError(url, err));
  }

  if (!res.ok) {
    const text = await res.text();
    let message = `Token exchange failed (${res.status})`;
    try {
      const data = JSON.parse(text) as ApiErrorBody;
      if (data?.error?.message) message = data.error.message;
    } catch {
      if (text) message = text.slice(0, 200);
    }
    throw new Error(message);
  }

  const data = (await res.json()) as { data?: TokenExchangeResponse };
  if (!data?.data?.accessToken) {
    throw new Error('Invalid token response: missing accessToken');
  }
  return data.data;
}

/**
 * Login with email and password. POST {baseUrl}/api/auth/login
 * Returns access token, refresh token, and primary account (personal).
 */
export async function loginWithEmail(
  baseUrl: string,
  email: string,
  password: string
): Promise<LoginResult> {
  const url = new URL('/api/auth/login', baseUrl).href;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'email',
        providerId: email.trim(),
        providerData: { password },
      }),
    });
  } catch (err) {
    throw new Error(detailFetchError(url, err));
  }

  if (!res.ok) {
    const text = await res.text();
    logFailedRequest('Login', url, res.status, text);
    let message = `Login failed (${res.status})`;
    try {
      const data = JSON.parse(text) as ApiErrorBody;
      if (data?.error?.message) message = data.error.message;
    } catch {
      if (text) message = text.slice(0, 200);
    }
    throw new Error(message);
  }

  const json = (await res.json()) as {
    data?: {
      accounts?: Array<LoginAccount>;
      accessToken?: string;
      refreshToken?: string;
    };
  };
  const data = json.data;
  if (
    !data?.accessToken ||
    !data?.refreshToken ||
    !Array.isArray(data.accounts) ||
    data.accounts.length === 0
  ) {
    throw new Error('Invalid login response: missing accessToken, refreshToken, or accounts');
  }
  const primary = data.accounts.find((a) => a.type === 'personal') ?? data.accounts[0];
  return {
    account: primary,
    accounts: data.accounts,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
}

/**
 * Exchange one-time CLI OAuth code for session. POST {baseUrl}/api/auth/cli-callback
 * Used after browser redirect from GitHub OAuth when redirect_uri was localhost.
 */
export async function exchangeCliCallback(baseUrl: string, code: string): Promise<LoginResult> {
  const url = new URL('/api/auth/cli-callback', baseUrl).href;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
  } catch (err) {
    throw new Error(detailFetchError(url, err));
  }

  if (!res.ok) {
    const text = await res.text();
    logFailedRequest('CLI callback exchange', url, res.status, text);
    let message = `Code exchange failed (${res.status})`;
    try {
      const data = JSON.parse(text) as ApiErrorBody;
      if (data?.error?.message) message = data.error.message;
    } catch {
      if (text) message = text.slice(0, 200);
    }
    throw new Error(message);
  }

  const json = (await res.json()) as {
    data?: {
      accessToken?: string;
      refreshToken?: string;
      accounts?: Array<LoginAccount>;
    };
  };
  const data = json.data;
  if (
    !data?.accessToken ||
    !data?.refreshToken ||
    !Array.isArray(data.accounts) ||
    data.accounts.length === 0
  ) {
    throw new Error(
      'Invalid CLI callback response: missing accessToken, refreshToken, or accounts'
    );
  }
  const primary = data.accounts.find((a) => a.type === 'personal') ?? data.accounts[0];
  return {
    account: primary,
    accounts: data.accounts,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
}

/**
 * Fetch organizations (paginated). Requires Bearer token. GET /api/organizations?scopeId=&tenant=
 * Scope is the account context (user's personal account id, tenant 'account').
 */
export async function fetchOrganizations(
  baseUrl: string,
  accessToken: string,
  scope: ApiScope
): Promise<OrganizationItem[]> {
  const items: OrganizationItem[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const url = new URL('/api/organizations', baseUrl);
    url.searchParams.set('scopeId', scope.id);
    url.searchParams.set('tenant', scope.tenant);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', String(DEFAULT_PAGE_SIZE));

    const res = await fetch(url.href, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const text = await res.text();
      logFailedRequest('Organizations request', url.href, res.status, text, {
        scopeId: scope.id,
        tenant: scope.tenant,
      });
      let msg = `Organizations request failed (${res.status})`;
      try {
        const data = JSON.parse(text) as ApiErrorBody;
        if (data?.error?.message) msg = data.error.message;
        if (data?.reason) msg += ` — ${data.reason}`;
      } catch {
        if (text) msg = text.slice(0, 200);
      }
      throw new Error(msg);
    }

    const json = (await res.json()) as {
      data?: { items?: OrganizationItem[]; totalCount?: number; hasNextPage?: boolean };
    };
    const data = json.data;
    if (!data) throw new Error('Invalid organizations response: missing data');

    const list = data.items ?? [];
    items.push(...list);
    hasNextPage = data.hasNextPage === true && list.length > 0;
    page += 1;
  }

  return items;
}

/**
 * Fetch projects for a scope (account or organization). Paginated. Requires Bearer token.
 * GET /api/projects?scopeId=&tenant=
 */
export async function fetchProjects(
  baseUrl: string,
  accessToken: string,
  scope: ApiScope
): Promise<ProjectItem[]> {
  const items: ProjectItem[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const url = new URL('/api/projects', baseUrl);
    url.searchParams.set('scopeId', scope.id);
    url.searchParams.set('tenant', scope.tenant);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', String(DEFAULT_PAGE_SIZE));

    const res = await fetch(url.href, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const text = await res.text();
      logFailedRequest('Projects request', url.href, res.status, text, {
        scopeId: scope.id,
        tenant: scope.tenant,
      });
      let msg = `Projects request failed (${res.status})`;
      try {
        const data = JSON.parse(text) as ApiErrorBody;
        if (data?.error?.message) msg = data.error.message;
        if (data?.reason) msg += ` — ${data.reason}`;
      } catch {
        if (text) msg = text.slice(0, 200);
      }
      throw new Error(msg);
    }

    const json = (await res.json()) as {
      data?: { projects?: ProjectItem[]; totalCount?: number; hasNextPage?: boolean };
    };
    const data = json.data;
    if (!data) throw new Error('Invalid projects response: missing data');

    const list = data.projects ?? [];
    items.push(...list);
    hasNextPage = data.hasNextPage === true && list.length > 0;
    page += 1;
  }

  return items;
}

export interface ApiScope {
  id: string;
  tenant: string;
}

export interface ResourceItem {
  id: string;
  slug: string;
  name: string;
  actions: string[];
  [key: string]: unknown;
}

export interface PermissionItem {
  id: string;
  action: string;
  name: string;
  [key: string]: unknown;
}

const DEFAULT_PAGE_SIZE = 50;

/**
 * Fetch all resources for a scope (paginated). Requires Bearer token.
 */
export async function fetchResources(
  baseUrl: string,
  accessToken: string,
  scope: ApiScope
): Promise<ResourceItem[]> {
  const items: ResourceItem[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const url = new URL('/api/resources', baseUrl);
    url.searchParams.set('scopeId', scope.id);
    url.searchParams.set('tenant', scope.tenant);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', String(DEFAULT_PAGE_SIZE));

    const res = await fetch(url.href, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const text = await res.text();
      let msg = `Resources request failed (${res.status})`;
      try {
        const data = JSON.parse(text) as ApiErrorBody;
        if (data?.error?.message) msg = data.error.message;
      } catch {
        if (text) msg = text.slice(0, 200);
      }
      throw new Error(msg);
    }

    const json = (await res.json()) as {
      data?: { resources?: ResourceItem[]; totalCount?: number; hasNextPage?: boolean };
    };
    const data = json.data;
    if (!data) throw new Error('Invalid resources response: missing data');

    const list = data.resources ?? [];
    items.push(...list);
    hasNextPage = data.hasNextPage === true && list.length > 0;
    page += 1;
  }

  return items;
}

/**
 * Fetch all permissions for a scope (paginated). Requires Bearer token.
 */
export async function fetchPermissions(
  baseUrl: string,
  accessToken: string,
  scope: ApiScope
): Promise<PermissionItem[]> {
  const items: PermissionItem[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const url = new URL('/api/permissions', baseUrl);
    url.searchParams.set('scopeId', scope.id);
    url.searchParams.set('tenant', scope.tenant);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', String(DEFAULT_PAGE_SIZE));

    const res = await fetch(url.href, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const text = await res.text();
      let msg = `Permissions request failed (${res.status})`;
      try {
        const data = JSON.parse(text) as ApiErrorBody;
        if (data?.error?.message) msg = data.error.message;
      } catch {
        if (text) msg = text.slice(0, 200);
      }
      throw new Error(msg);
    }

    const json = (await res.json()) as {
      data?: { permissions?: PermissionItem[]; totalCount?: number; hasNextPage?: boolean };
    };
    const data = json.data;
    if (!data) throw new Error('Invalid permissions response: missing data');

    const list = data.permissions ?? [];
    items.push(...list);
    hasNextPage = data.hasNextPage === true && list.length > 0;
    page += 1;
  }

  return items;
}
