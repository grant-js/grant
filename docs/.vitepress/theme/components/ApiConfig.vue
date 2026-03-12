<template>
  <ClientOnly>
    <div class="api-config">
      <div class="api-config-header" @click="expanded = !expanded">
        <div class="api-config-left">
          <svg class="api-config-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
          </svg>
          <span class="api-config-title">API Configuration</span>
          <span v-if="connStatus === 'connected'" class="api-config-badge ok">{{ state.verifiedEmail || 'Connected' }}</span>
          <span v-else-if="connStatus === 'verifying'" class="api-config-badge verifying">Verifying…</span>
          <span v-else-if="connStatus === 'error'" class="api-config-badge off">{{ connError || 'Invalid token' }}</span>
          <span v-else class="api-config-badge off">Not connected</span>
        </div>
        <span class="api-config-chevron" :class="{ open: expanded }">›</span>
      </div>

      <div v-show="expanded" class="api-config-body">
        <div class="api-config-field">
          <label for="ac-base-url">Base URL</label>
          <input id="ac-base-url" v-model="state.baseUrl" :placeholder="defaultApiBaseUrl" spellcheck="false" />
        </div>

        <div class="api-config-divider"><span>Authentication</span></div>

        <div class="api-config-tabs">
          <button :class="{ active: tab === 'login' }" @click="tab = 'login'">Sign in</button>
          <button :class="{ active: tab === 'token' }" @click="tab = 'token'">Tokens</button>
        </div>

        <!-- Sign in -->
        <div v-if="tab === 'login'" class="api-config-login">
          <div class="api-config-field">
            <label for="ac-email">Email</label>
            <input id="ac-email" v-model="email" type="email" placeholder="admin@example.com" />
          </div>
          <div class="api-config-field">
            <label for="ac-pwd">Password</label>
            <input id="ac-pwd" v-model="password" type="password" placeholder="Password" @keyup.enter="login" />
          </div>
          <button class="api-config-login-btn" :disabled="busy" @click="login">
            {{ busy ? 'Signing in…' : 'Sign in' }}
          </button>
          <p v-if="loginError" class="api-config-msg err">{{ loginError }}</p>
          <p v-if="loginOk" class="api-config-msg ok">{{ loginOk }}</p>
        </div>

        <!-- Tokens -->
        <div v-if="tab === 'token'">
          <div class="api-config-field">
            <label for="ac-token">Access Token</label>
            <input
              id="ac-token"
              :value="state.accessToken"
              placeholder="Paste your JWT access token"
              spellcheck="false"
              @input="onTokenInput"
            />
          </div>
          <div class="api-config-field">
            <label for="ac-refresh">Refresh Token</label>
            <input
              id="ac-refresh"
              :value="state.refreshToken"
              placeholder="Paste your refresh token"
              spellcheck="false"
              @input="onRefreshTokenInput"
            />
          </div>
          <p v-if="connStatus === 'verifying'" class="api-config-msg verifying-msg">Verifying token…</p>
        </div>

        <!-- Refresh button (when a refresh token exists) -->
        <div v-if="state.refreshToken" class="api-config-refresh-row">
          <button class="api-config-refresh-btn" :disabled="refreshing" @click="refresh">
            {{ refreshing ? 'Refreshing…' : 'Refresh token' }}
          </button>
          <span v-if="refreshMsg" class="api-config-refresh-msg" :class="refreshOk ? 'ok' : 'err'">{{ refreshMsg }}</span>
        </div>

        <!-- Variable summary -->
        <div v-if="varCount > 0" class="api-config-vars">
          <div class="api-config-divider"><span>Stored variables ({{ varCount }})</span></div>
          <div class="api-config-var-list">
            <div v-for="(val, key) in state.variables" :key="key" class="api-config-var">
              <code>{{ key }}</code>
              <code class="api-config-var-val">{{ truncate(String(val), 36) }}</code>
            </div>
          </div>
        </div>

        <div class="api-config-actions">
          <button class="api-config-clear" @click="doClear">Clear all state</button>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useApiState, defaultApiBaseUrl } from '../composables/useApiState';

const { state, setVariable, clearState, verifyConnection, tryRefresh } = useApiState();

const expanded = ref(false);
const tab = ref<'login' | 'token'>('login');
const email = ref('');
const password = ref('');
const busy = ref(false);
const loginError = ref('');
const loginOk = ref('');

const connStatus = ref<'idle' | 'verifying' | 'connected' | 'error'>('idle');
const connError = ref('');

const refreshing = ref(false);
const refreshMsg = ref('');
const refreshOk = ref(false);

let verifyTimer: ReturnType<typeof setTimeout> | null = null;

const varCount = computed(() => Object.keys(state.variables).length);

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

/** Verify the current access token via GET /api/me. */
async function verify() {
  if (!state.accessToken) {
    connStatus.value = 'idle';
    state.verifiedEmail = '';
    return;
  }

  connStatus.value = 'verifying';
  connError.value = '';

  try {
    const { email: userEmail, userId, accountId } = await verifyConnection();
    state.verifiedEmail = userEmail;
    connStatus.value = 'connected';

    if (userId) setVariable('USER_ID', userId);
    if (accountId) setVariable('ACCOUNT_ID', accountId);
  } catch (err: unknown) {
    connStatus.value = 'error';
    connError.value = (err as Error).message;
    state.verifiedEmail = '';
  }
}

/** Debounced handler for the paste-token input. */
function onTokenInput(e: Event) {
  const val = (e.target as HTMLInputElement).value;
  state.accessToken = val;

  if (verifyTimer) clearTimeout(verifyTimer);
  if (!val) {
    connStatus.value = 'idle';
    state.verifiedEmail = '';
    return;
  }
  verifyTimer = setTimeout(verify, 600);
}

/** Handler for the refresh-token input. */
function onRefreshTokenInput(e: Event) {
  state.refreshToken = (e.target as HTMLInputElement).value;
}

/** On mount, re-verify if we have a stored token. */
onMounted(() => {
  if (state.accessToken) verify();
});

async function login() {
  busy.value = true;
  loginError.value = '';
  loginOk.value = '';

  try {
    const res = await fetch(`${state.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'email',
        providerId: email.value,
        providerData: { password: password.value },
      }),
      credentials: 'include',
    });

    const json = await res.json();

    if (!res.ok) {
      loginError.value = json.message || `Sign-in failed (${res.status})`;
      return;
    }

    const data = json.data ?? json;
    const accessToken = data.accessToken ?? '';
    const refreshToken = data.refreshToken ?? '';

    if (!accessToken) {
      loginError.value = 'Sign-in succeeded but no access token was returned.';
      return;
    }

    state.accessToken = accessToken;
    state.refreshToken = refreshToken;

    const account = data.account;
    if (account?.ownerId) setVariable('USER_ID', account.ownerId);
    if (account?.id) setVariable('ACCOUNT_ID', account.id);

    loginOk.value = 'Signed in — verifying…';
    await verify();
    if (connStatus.value === 'connected') {
      loginOk.value = `Signed in as ${state.verifiedEmail || 'user'}`;
    }
  } catch (err: unknown) {
    loginError.value = `Network error: ${(err as Error).message}. Is the API running at ${state.baseUrl}?`;
  } finally {
    busy.value = false;
  }
}

async function refresh() {
  refreshing.value = true;
  refreshMsg.value = '';
  refreshOk.value = false;

  const ok = await tryRefresh();
  if (ok) {
    refreshOk.value = true;
    refreshMsg.value = 'Token refreshed';
    await verify();
  } else {
    refreshOk.value = false;
    refreshMsg.value = 'Refresh failed — sign in again';
  }
  refreshing.value = false;
}

function doClear() {
  clearState();
  connStatus.value = 'idle';
  connError.value = '';
  loginOk.value = '';
  loginError.value = '';
  refreshMsg.value = '';
}
</script>

<style>
/* ── ApiConfig ─────────────────────────────────────────── */
.api-config {
  margin: 16px 0 24px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg);
}

.api-config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
  user-select: none;
  background: var(--vp-c-bg-soft);
  transition: background 0.15s;
}
.api-config-header:hover { background: var(--vp-c-bg-elv); }

.api-config-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.api-config-icon { color: var(--vp-c-text-3); flex-shrink: 0; }
.api-config-title { font-size: 14px; font-weight: 600; color: var(--vp-c-text-1); }

.api-config-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 4px;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.api-config-badge.ok       { background: rgba(16,185,129,.12); color: #10b981; }
.api-config-badge.off      { background: rgba(239,68,68,.1);   color: #ef4444; }
.api-config-badge.verifying { background: rgba(59,130,246,.1);  color: #3b82f6; }

.api-config-chevron {
  font-size: 18px;
  font-weight: 700;
  color: var(--vp-c-text-3);
  transition: transform 0.2s;
  display: inline-block;
}
.api-config-chevron.open { transform: rotate(90deg); }

.api-config-body { padding: 16px; }

.api-config-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}
.api-config-field label {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.api-config-field input {
  padding: 7px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.api-config-field input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft);
}

.api-config-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.api-config-divider::before,
.api-config-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--vp-c-divider);
}

.api-config-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}
.api-config-tabs button {
  padding: 5px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  cursor: pointer;
  color: var(--vp-c-text-2);
  transition: all 0.15s;
}
.api-config-tabs button.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.api-config-login { display: flex; flex-direction: column; }

.api-config-login-btn {
  align-self: flex-start;
  padding: 7px 20px;
  border: none;
  border-radius: 6px;
  background: var(--vp-c-brand-1);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}
.api-config-login-btn:hover:not(:disabled) { background: var(--vp-c-brand-2); }
.api-config-login-btn:disabled { opacity: .6; cursor: not-allowed; }

.api-config-msg {
  margin: 8px 0 0;
  font-size: 13px;
  padding: 6px 10px;
  border-radius: 4px;
}
.api-config-msg.err { color: #ef4444; background: rgba(239,68,68,.06); }
.api-config-msg.ok  { color: #10b981; background: rgba(16,185,129,.06); }
.api-config-msg.verifying-msg { color: #3b82f6; background: rgba(59,130,246,.06); }

/* Refresh row */
.api-config-refresh-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 0 0;
}
.api-config-refresh-btn {
  padding: 5px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  color: var(--vp-c-text-2);
  transition: all 0.15s;
}
.api-config-refresh-btn:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.api-config-refresh-btn:disabled { opacity: .6; cursor: not-allowed; }
.api-config-refresh-msg {
  font-size: 12px;
  font-weight: 500;
}
.api-config-refresh-msg.ok  { color: #10b981; }
.api-config-refresh-msg.err { color: #ef4444; }

.api-config-vars { margin-top: 4px; }
.api-config-var-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
.api-config-var {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
  font-size: 12px;
}
.api-config-var code:first-child {
  font-weight: 600;
  color: var(--vp-c-brand-1);
}
.api-config-var-val {
  color: var(--vp-c-text-3);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.api-config-actions { margin-top: 16px; }
.api-config-clear {
  padding: 5px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 12px;
  color: var(--vp-c-text-3);
  cursor: pointer;
  transition: all 0.15s;
}
.api-config-clear:hover {
  border-color: #ef4444;
  color: #ef4444;
}
</style>
