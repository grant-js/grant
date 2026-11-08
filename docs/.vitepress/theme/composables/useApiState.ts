import { reactive, watch } from 'vue';

interface Account {
  id: string;
  type: string;
  ownerId: string;
}

interface ApiState {
  baseUrl: string;
  appUrl: string;
  accessToken: string;
  refreshToken: string;
  verifiedEmail: string;
  /** From GET /api/me: true until the user opens the emailed verification link. */
  requiresEmailVerification: boolean;
  accounts: Account[];
  selectedFlow: 'personal' | 'organization' | '';
  variables: Record<string, string>;
}

const STORAGE_KEY = 'grant-docs-api-state';

// Deployed docs sit behind the same gateway as the API and web app (path-based single origin), so
// both URLs default to the docs origin. Under the VitePress dev server (`pnpm dev`, :5173) the docs
// are on their own origin: there the API is its dev server on :4000 and the Grant web app is on
// :3000. (Saved state from before 1.27 may carry an `exampleAppUrl`; it is ignored.)
const RELATIVE_DEFAULTS = {
  baseUrl: '',
  appUrl: '',
};

// Local dev ports: apps/api (`API_PORT`, default 4000) and apps/web (`next dev`, 3000).
const DEV_API_ORIGIN = 'http://localhost:4000';
const DEV_WEB_ORIGIN = 'http://localhost:3000';

/** Where the Grant web app is assumed to live when nothing is saved. */
export function getDefaultGrantOrigin(): string {
  if (typeof window === 'undefined') return '';
  return import.meta.env.DEV ? DEV_WEB_ORIGIN : window.location.origin;
}

/** Where the Grant API is assumed to live when nothing is saved. */
export function getDefaultApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  return import.meta.env.DEV ? DEV_API_ORIGIN : window.location.origin;
}

function getOriginDefaults() {
  if (typeof window === 'undefined') return RELATIVE_DEFAULTS;
  return { baseUrl: getDefaultApiBaseUrl(), appUrl: getDefaultGrantOrigin() };
}

/**
 * A saved URL, unless it is unusable: empty, or (under the dev server) the docs' own origin,
 * which never serves the API or the web app. Older guide versions saved the docs origin.
 */
function savedUrlOr(saved: unknown, fallback: string): string {
  const value = typeof saved === 'string' ? saved.trim() : '';
  if (!value) return fallback;
  if (import.meta.env.DEV && value.replace(/\/+$/, '') === window.location.origin) return fallback;
  return value;
}

const state = reactive<ApiState>({
  baseUrl: RELATIVE_DEFAULTS.baseUrl,
  appUrl: RELATIVE_DEFAULTS.appUrl,
  accessToken: '',
  refreshToken: '',
  verifiedEmail: '',
  requiresEmailVerification: false,
  accounts: [],
  selectedFlow: '',
  variables: {},
});

let hydrated = false;
let watcherActive = false;

function hydrate() {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  const originDefaults = getOriginDefaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state.baseUrl = savedUrlOr(saved.baseUrl, originDefaults.baseUrl);
      state.appUrl = savedUrlOr(saved.appUrl, originDefaults.appUrl);
      if (saved.accessToken) state.accessToken = saved.accessToken;
      if (saved.refreshToken) state.refreshToken = saved.refreshToken;
      if (saved.verifiedEmail) state.verifiedEmail = saved.verifiedEmail;
      state.requiresEmailVerification = saved.requiresEmailVerification === true;
      if (Array.isArray(saved.accounts)) state.accounts = saved.accounts;
      if (saved.selectedFlow) state.selectedFlow = saved.selectedFlow;
      if (saved.variables) Object.assign(state.variables, saved.variables);
    } else {
      state.baseUrl = originDefaults.baseUrl;
      state.appUrl = originDefaults.appUrl;
    }
  } catch {
    /* corrupt data — use origin defaults */
    state.baseUrl = originDefaults.baseUrl;
    state.appUrl = originDefaults.appUrl;
  }
}

function persist() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        baseUrl: state.baseUrl,
        appUrl: state.appUrl,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        verifiedEmail: state.verifiedEmail,
        requiresEmailVerification: state.requiresEmailVerification,
        accounts: state.accounts,
        selectedFlow: state.selectedFlow,
        variables: state.variables,
      })
    );
  } catch {
    /* storage full or blocked */
  }
}

function startWatcher() {
  if (watcherActive || typeof window === 'undefined') return;
  watcherActive = true;
  watch(state, persist, { deep: true });
}

/**
 * Call GET /api/me to verify the current access token and extract user data.
 * Updates state.accounts and state.verifiedEmail as side-effects.
 */
async function verifyConnection(): Promise<{
  email: string;
  userId: string;
  accountId: string;
  accounts: Account[];
}> {
  const res = await fetch(`${state.baseUrl}/api/me`, {
    headers: { Authorization: `Bearer ${state.accessToken}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Verification failed (${res.status})`);
  }

  const json = await res.json();
  const data = json.data ?? json;
  const email: string = data.email ?? '';
  const accounts: Account[] = (Array.isArray(data.accounts) ? data.accounts : []).map(
    (a: Record<string, unknown>) => ({
      id: String(a.id ?? ''),
      type: String(a.type ?? ''),
      ownerId: String(a.ownerId ?? ''),
    })
  );

  state.accounts = accounts;
  state.verifiedEmail = email;
  state.requiresEmailVerification = data.requiresEmailVerification === true;

  const first = accounts[0];
  const userId = first?.ownerId ?? '';
  const accountId = first?.id ?? '';

  return { email, userId, accountId, accounts };
}

/**
 * Try to refresh the access token via POST /api/auth/refresh (HttpOnly cookie).
 * Returns true if a new access token was obtained.
 */
async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${state.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) return false;

    const json = await res.json();
    const data = json.data ?? json;
    const newToken = data.accessToken ?? '';
    if (!newToken) return false;

    state.accessToken = newToken;
    if (data.refreshToken) state.refreshToken = data.refreshToken;
    return true;
  } catch {
    return false;
  }
}

export function useApiState() {
  hydrate();
  startWatcher();

  function setVariable(name: string, value: string) {
    state.variables[name] = value;
  }

  function getVariable(name: string): string {
    return state.variables[name] ?? '';
  }

  function resolveTemplate(text: string): string {
    return text.replace(/\{([A-Z_][A-Z0-9_]*)\}/g, (m, name) => state.variables[name] ?? m);
  }

  function resolveDeep(obj: unknown): unknown {
    if (typeof obj === 'string') return resolveTemplate(obj);
    if (Array.isArray(obj)) return obj.map(resolveDeep);
    if (obj !== null && typeof obj === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        out[k] = resolveDeep(v);
      }
      return out;
    }
    return obj;
  }

  function getByPath(obj: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((acc, key) => {
      if (acc !== null && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
      return undefined;
    }, obj);
  }

  function findUnresolved(text: string): string[] {
    const out: string[] = [];
    const re = /\{([A-Z_][A-Z0-9_]*)\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (!out.includes(m[1])) out.push(m[1]);
    }
    return out;
  }

  function setAccounts(accounts: unknown) {
    const list = Array.isArray(accounts) ? accounts : [];
    state.accounts = list.map((a: Record<string, unknown>) => ({
      id: String(a.id ?? ''),
      type: String(a.type ?? ''),
      ownerId: String(a.ownerId ?? ''),
    }));
    persist();
  }

  function clearState() {
    state.accessToken = '';
    state.refreshToken = '';
    state.verifiedEmail = '';
    state.requiresEmailVerification = false;
    state.accounts = [];
    state.selectedFlow = '';
    for (const key of Object.keys(state.variables)) {
      delete state.variables[key];
    }
    persist();
  }

  return {
    state,
    setVariable,
    setAccounts,
    getVariable,
    resolveTemplate,
    resolveDeep,
    getByPath,
    findUnresolved,
    clearState,
    verifyConnection,
    tryRefresh,
  };
}
