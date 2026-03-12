import { reactive, watch } from 'vue';

interface Account {
  id: string;
  type: string;
  ownerId: string;
}

interface ApiState {
  baseUrl: string;
  accessToken: string;
  refreshToken: string;
  verifiedEmail: string;
  accounts: Account[];
  selectedFlow: 'personal' | 'organization' | '';
  variables: Record<string, string>;
}

const STORAGE_KEY = 'grant-docs-api-state';

export const defaultApiBaseUrl =
  (typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL) ||
  '';

const state = reactive<ApiState>({
  baseUrl: defaultApiBaseUrl,
  accessToken: '',
  refreshToken: '',
  verifiedEmail: '',
  accounts: [],
  selectedFlow: '',
  variables: {},
});

let hydrated = false;
let watcherActive = false;

function hydrate() {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.baseUrl) state.baseUrl = saved.baseUrl;
      if (saved.accessToken) state.accessToken = saved.accessToken;
      if (saved.refreshToken) state.refreshToken = saved.refreshToken;
      if (saved.verifiedEmail) state.verifiedEmail = saved.verifiedEmail;
      if (Array.isArray(saved.accounts)) state.accounts = saved.accounts;
      if (saved.selectedFlow) state.selectedFlow = saved.selectedFlow;
      if (saved.variables) Object.assign(state.variables, saved.variables);
    }
  } catch {
    /* corrupt data — start fresh */
  }
}

function persist() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        baseUrl: state.baseUrl,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        verifiedEmail: state.verifiedEmail,
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
