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
          <input id="ac-base-url" v-model="state.baseUrl" :placeholder="getDefaultApiBaseUrl()" spellcheck="false" />
        </div>
        <div class="api-config-field">
          <label for="ac-app-url">Grant web app URL</label>
          <input id="ac-app-url" v-model="state.appUrl" :placeholder="getDefaultGrantOrigin()" spellcheck="false" />
          <span class="api-config-help">Where Grant's sign-in pages run. Step 10 sends you there to sign in through your project app.</span>
        </div>

        <div class="api-config-divider"><span>Authentication</span></div>

        <div class="api-config-tabs">
          <button :class="{ active: tab === 'login' }" @click="tab = 'login'">Sign in</button>
          <button :class="{ active: tab === 'signup' }" @click="openSignup">Sign up</button>
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

        <!-- Sign up -->
        <div v-if="tab === 'signup'" class="api-config-login">
          <p v-if="signupPolicy === 'loading'" class="api-config-msg verifying-msg">Checking whether this instance allows sign-up…</p>
          <p v-else-if="signupPolicy === 'closed'" class="api-config-msg err">
            Public sign-up is turned off on this instance. Ask an administrator for an invitation, then sign in.
          </p>
          <template v-else>
            <div class="api-config-field">
              <label for="ac-su-name">Name</label>
              <input id="ac-su-name" v-model="signupName" autocomplete="name" placeholder="Ada Lovelace" />
            </div>
            <div class="api-config-field">
              <label for="ac-su-email">Email</label>
              <input id="ac-su-email" v-model="signupEmail" type="email" autocomplete="email" placeholder="you@example.com" />
            </div>
            <div class="api-config-field">
              <label for="ac-su-pwd">Password</label>
              <input id="ac-su-pwd" v-model="signupPassword" type="password" autocomplete="new-password" placeholder="Password" @keyup.enter="signup" />
            </div>
            <div class="api-config-field">
              <span class="api-config-label">Account type</span>
              <div class="api-config-radios">
                <label><input v-model="signupType" type="radio" value="personal" /> Personal</label>
                <label><input v-model="signupType" type="radio" value="organization" /> Organization</label>
              </div>
              <span class="api-config-help">Either works for this guide. You can add the other type later in Step 1.</span>
            </div>
            <button class="api-config-login-btn" :disabled="busy" @click="signup">
              {{ busy ? 'Creating account…' : 'Create account' }}
            </button>
            <p v-if="signupError" class="api-config-msg err">{{ signupError }}</p>
          </template>
        </div>

        <!-- Email verification pending (after sign-up, or any unverified session) -->
        <div v-if="connStatus === 'connected' && state.requiresEmailVerification" class="api-config-verify">
          <p>
            <strong>Verify your email.</strong> Grant sent a link to <code>{{ state.verifiedEmail }}</code>.
            The <strong>Personal</strong> flow works now; the <strong>Organization</strong> flow is blocked until you
            open the link. Then sign in again here so your session picks it up.
          </p>
          <div class="api-config-verify-actions">
            <button class="api-config-refresh-btn" :disabled="resending" @click="resendVerification">
              {{ resending ? 'Sending…' : 'Resend email' }}
            </button>
            <span v-if="resendMsg" class="api-config-refresh-msg" :class="resendOk ? 'ok' : 'err'">{{ resendMsg }}</span>
          </div>
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
import { useApiState, getDefaultApiBaseUrl, getDefaultGrantOrigin } from '../composables/useApiState';
// Grant's own English error strings: the API returns some validation errors as i18n keys.
import enErrors from '../../../../packages/@grantjs/i18n/locales/en/errors.json';

const { state, setVariable, clearState, verifyConnection, tryRefresh } = useApiState();

const expanded = ref(false);
const tab = ref<'login' | 'signup' | 'token'>('login');
const email = ref('');
const password = ref('');
const busy = ref(false);
const loginError = ref('');
const loginOk = ref('');

const signupName = ref('');
const signupEmail = ref('');
const signupPassword = ref('');
const signupType = ref<'personal' | 'organization'>('personal');
const signupError = ref('');
const signupPolicy = ref<'unknown' | 'loading' | 'open' | 'closed'>('unknown');

const resending = ref(false);
const resendMsg = ref('');
const resendOk = ref(false);

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

/** `errors.validation.invalidEmail` → Grant's English string for that key, or null. */
function translateErrorKey(key: string): string | null {
  if (!/^errors\.[\w.]+$/.test(key)) return null;
  const value = key
    .split('.')
    .slice(1)
    .reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), enErrors);
  return typeof value === 'string' && !value.includes('{{') ? value : null;
}

/** One `validationErrors` entry (`Field "data": <sentence or key>`) as readable text. */
function readableValidation(entry: string): string {
  const text = entry.replace(/^Field "[^"]*":\s*/, '').trim();
  return translateErrorKey(text) ?? text;
}

/**
 * Readable text from an API error body (`{ error, code, details, translationKey, extensions }`).
 * The API has no `message` field; `error` can be an untranslated `{{field}}` template, so
 * field-level validation errors win when present.
 */
function apiErrorMessage(json: Record<string, unknown>, status: number, fallback: string): string {
  const validation = (json.extensions as { validationErrors?: unknown } | undefined)?.validationErrors;
  if (Array.isArray(validation) && validation.length > 0) {
    return validation.map((v) => readableValidation(String(v))).join('. ');
  }
  for (const value of [json.message, json.error]) {
    if (typeof value === 'string' && value.trim() && !value.includes('{{')) return value;
  }
  const translated = typeof json.translationKey === 'string' ? translateErrorKey(json.translationKey) : null;
  return translated ?? `${fallback} (${status})`;
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

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      loginError.value = apiErrorMessage(json, res.status, 'Sign-in failed');
      return;
    }

    const data = json.data ?? json;
    if (!data.accessToken) {
      loginError.value = 'Sign-in succeeded but no access token was returned.';
      return;
    }

    loginOk.value = 'Signed in — verifying…';
    await connectWithSession(data);
    if (connStatus.value === 'connected') {
      loginOk.value = `Signed in as ${state.verifiedEmail || 'user'}`;
    }
  } catch (err: unknown) {
    loginError.value = `Network error: ${(err as Error).message}. Is the API running at ${state.baseUrl}?`;
  } finally {
    busy.value = false;
  }
}

/** Store a session from POST /api/auth/login or /register, then verify it via GET /api/me. */
async function connectWithSession(data: { accessToken?: string; refreshToken?: string; account?: { id?: string; ownerId?: string } }) {
  state.accessToken = data.accessToken ?? '';
  state.refreshToken = data.refreshToken ?? '';
  if (data.account?.ownerId) setVariable('USER_ID', data.account.ownerId);
  if (data.account?.id) setVariable('ACCOUNT_ID', data.account.id);
  await verify();
}

/** GET /api/auth/providers says whether this instance accepts self sign-up. */
async function openSignup() {
  tab.value = 'signup';
  if (signupPolicy.value === 'open' || signupPolicy.value === 'loading') return;
  signupPolicy.value = 'loading';
  try {
    const res = await fetch(`${state.baseUrl}/api/auth/providers`);
    const json = await res.json();
    const data = json.data ?? json;
    // Unknown shape or a failed request: show the form and let POST /register give the verdict.
    signupPolicy.value =
      res.ok && data.publicSignupEnabled === false && data.bootstrapOpen === false ? 'closed' : 'open';
  } catch {
    signupPolicy.value = 'open';
  }
}

async function signup() {
  signupError.value = '';
  if (!signupName.value.trim() || !signupEmail.value.trim() || !signupPassword.value) {
    signupError.value = 'Name, email and password are required.';
    return;
  }
  busy.value = true;
  try {
    const res = await fetch(`${state.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: signupName.value.trim(),
        type: signupType.value,
        provider: 'email',
        providerId: signupEmail.value.trim(),
        providerData: { password: signupPassword.value },
      }),
      credentials: 'include',
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 409) {
      // The email is already registered: hand over to Sign in with the address filled in.
      email.value = signupEmail.value.trim();
      signupPassword.value = '';
      tab.value = 'login';
      loginError.value = `An account with ${email.value} already exists. Sign in with its password.`;
      return;
    }
    if (!res.ok) {
      signupError.value = apiErrorMessage(json, res.status, 'Sign-up failed');
      return;
    }
    const data = json.data ?? json;
    if (!data.accessToken) {
      signupError.value = 'The account was created but no access token was returned. Sign in instead.';
      return;
    }
    signupPassword.value = '';
    await connectWithSession(data);
    if (connStatus.value === 'connected') {
      // Show the confirmation where sign-in messages live; the reader picks a flow below next.
      tab.value = 'login';
      loginOk.value = `Account created — signed in as ${state.verifiedEmail || signupEmail.value.trim()}`;
    }
  } catch (err: unknown) {
    signupError.value = `Network error: ${(err as Error).message}. Is the API running at ${state.baseUrl}?`;
  } finally {
    busy.value = false;
  }
}

async function resendVerification() {
  resending.value = true;
  resendMsg.value = '';
  try {
    const res = await fetch(`${state.baseUrl}/api/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: state.verifiedEmail }),
    });
    const json = await res.json().catch(() => ({}));
    resendOk.value = res.ok;
    resendMsg.value = res.ok ? 'Verification email sent' : apiErrorMessage(json, res.status, 'Could not resend');
  } catch (err: unknown) {
    resendOk.value = false;
    resendMsg.value = (err as Error).message;
  } finally {
    resending.value = false;
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
  signupError.value = '';
  resendMsg.value = '';
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

.api-config-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.api-config-radios { display: flex; gap: 16px; font-size: 14px; }
.api-config-radios label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.api-config-help { font-size: 12px; color: var(--vp-c-text-3); }

.api-config-verify {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--vp-c-warning-soft);
  font-size: 13px;
  line-height: 1.6;
}
.api-config-verify p { margin: 0 0 8px; }
.api-config-verify-actions { display: flex; align-items: center; gap: 10px; }

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
