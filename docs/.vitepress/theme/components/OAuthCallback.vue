<template>
  <ClientOnly>
    <div class="oauth-cb">
      <p v-if="status === 'reading' || status === 'exchanging'" class="oauth-cb-msg">
        {{
          status === 'exchanging' ? 'Exchanging the authorization code…' : 'Reading the redirect…'
        }}
      </p>

      <div v-else-if="status === 'error'" class="oauth-cb-card">
        <div class="oauth-cb-card-head">
          <span class="oauth-cb-card-title">Sign-in did not complete</span>
          <span class="oauth-cb-badge err">Failed</span>
        </div>
        <p class="oauth-cb-error">{{ error }}</p>
        <p v-if="hint" class="oauth-cb-hint">{{ hint }}</p>
      </div>

      <template v-else>
        <div class="oauth-cb-card">
          <div class="oauth-cb-card-head">
            <span class="oauth-cb-card-title">Access token</span>
            <span class="oauth-cb-badge ok">Received</span>
          </div>
          <dl class="oauth-cb-kv">
            <dt>type</dt>
            <dd>{{ tokens?.tokenType }}</dd>
            <dt>expires_in</dt>
            <dd>{{ tokens?.expiresIn ? `${tokens.expiresIn}s` : '—' }}</dd>
            <dt>state</dt>
            <dd>{{ oauthState || '—' }}</dd>
            <template v-if="scope">
              <dt>scope.tenant</dt>
              <dd>{{ scope.tenant }}</dd>
              <dt>scope.id</dt>
              <dd>{{ scope.id }}</dd>
            </template>
            <template v-if="payload?.sub">
              <dt>sub</dt>
              <dd>{{ String(payload.sub) }}</dd>
            </template>
          </dl>
          <code class="oauth-cb-token">{{ truncate(tokens?.accessToken ?? '') }}</code>
          <details v-if="payload" class="oauth-cb-payload">
            <summary>JWT payload</summary>
            <pre>{{ JSON.stringify(payload, null, 2) }}</pre>
          </details>
        </div>

        <h3 class="oauth-cb-h">Permission checks</h3>
        <p class="oauth-cb-desc">
          Each row is <code>grant.can('Document', action, {{ '{' }} scope {{ '}' }})</code> from
          <code>@grantjs/client</code>, using the access token above and the scope from its JWT.
        </p>
        <div class="oauth-cb-perms">
          <div
            v-for="p in permissions"
            :key="p.action"
            class="oauth-cb-perm"
            :class="p.granted === null ? '' : p.granted ? 'granted' : 'denied'"
          >
            <span class="oauth-cb-perm-label">Document:{{ p.action }}</span>
            <span v-if="p.granted === null" class="oauth-cb-badge">checking…</span>
            <span v-else class="oauth-cb-badge" :class="p.granted ? 'ok' : 'err'">
              {{ p.granted ? 'granted' : 'denied' }}
            </span>
          </div>
        </div>

        <h3 class="oauth-cb-h">Gated content</h3>
        <p class="oauth-cb-desc">
          In a React app, <code>&lt;GrantGate resource="Document" action="Update"&gt;</code> renders
          its children only when the check above is granted, and its
          <code>fallback</code> otherwise:
        </p>
        <div
          v-if="updateGranted !== null"
          class="oauth-cb-gate"
          :class="updateGranted ? 'granted' : 'denied'"
        >
          <template v-if="updateGranted">
            ✓ You have <strong>Document:Update</strong>, so the gated content is visible.
          </template>
          <template v-else>
            ✗ You do not have <strong>Document:Update</strong>, so the fallback renders instead.
          </template>
        </div>
      </template>

      <p class="oauth-cb-back">
        <a :href="guideHref">← Back to the Integration Guide</a>
      </p>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { withBase } from 'vitepress';
import { GrantClient, type Scope } from '@grantjs/client';
import { useApiState } from '../composables/useApiState';
import {
  GUIDE_PATH,
  clearPkceSession,
  decodeJwtPayload,
  exchangeAuthorizationCode,
  loadPkceSession,
  type ProjectOAuthTokens,
} from '../composables/useProjectOAuth';

const DOCUMENT_ACTIONS = ['Create', 'Read', 'Update', 'Delete', 'Query'] as const;

const { state } = useApiState();

const status = ref<'reading' | 'exchanging' | 'ready' | 'error'>('reading');
const error = ref('');
const hint = ref('');
const oauthState = ref<string | null>(null);
const tokens = ref<ProjectOAuthTokens | null>(null);
const payload = ref<Record<string, unknown> | null>(null);
const results = ref<Record<string, boolean | null>>(
  Object.fromEntries(DOCUMENT_ACTIONS.map((a) => [a, null]))
);

const guideHref = withBase(`${GUIDE_PATH}#step-10-sign-in-through-the-project-app`);

const scope = computed<Scope | null>(() => {
  const s = payload.value?.scope as { tenant?: unknown; id?: unknown } | undefined;
  if (s && typeof s === 'object' && typeof s.tenant === 'string' && typeof s.id === 'string') {
    return { tenant: s.tenant, id: s.id } as Scope;
  }
  return null;
});

const permissions = computed(() =>
  DOCUMENT_ACTIONS.map((action) => ({ action, granted: results.value[action] }))
);
const updateGranted = computed(() => results.value.Update);

function truncate(token: string, len = 16) {
  return token.length <= len * 2 + 3 ? token : `${token.slice(0, len)}…${token.slice(-len)}`;
}

function fail(message: string, nextStep = '') {
  status.value = 'error';
  error.value = message;
  hint.value = nextStep;
}

async function runPermissionChecks(accessToken: string) {
  const grant = new GrantClient({
    apiUrl: state.baseUrl,
    getAccessToken: () => accessToken,
  });
  const opts = scope.value ? { scope: scope.value } : undefined;
  await Promise.all(
    DOCUMENT_ACTIONS.map(async (action) => {
      results.value[action] = await grant.can('Document', action, opts);
    })
  );
}

onMounted(async () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const stateParam = params.get('state');
  const oauthError = params.get('error');
  oauthState.value = stateParam;

  if (oauthError) {
    fail(params.get('error_description') || oauthError);
    return;
  }
  if (!code || !stateParam) {
    fail(
      'This page is the OAuth redirect target for the Integration Guide and was opened without ?code= and ?state=.',
      'Start the sign-in from Step 10 of the guide.'
    );
    return;
  }

  const session = loadPkceSession(stateParam);
  if (!session) {
    fail(
      'No PKCE verifier was found for this state.',
      'The verifier lives in this tab’s session storage. Start the sign-in again from Step 10 of the guide, in this tab.'
    );
    return;
  }

  status.value = 'exchanging';
  try {
    // The secret captured in Step 9 belongs to that app only; never send it for another client_id.
    const clientSecret =
      state.variables.APP_CLIENT_ID === session.clientId
        ? state.variables.APP_CLIENT_SECRET
        : undefined;
    const result = await exchangeAuthorizationCode({
      apiBase: state.baseUrl,
      clientId: session.clientId,
      clientSecret,
      redirectUri: session.redirectUri,
      code,
      codeVerifier: session.verifier,
    });
    clearPkceSession(stateParam);
    // Drop ?code=&state= from the address bar: the code is single-use and should not be bookmarked.
    window.history.replaceState(null, '', window.location.pathname);
    tokens.value = result;
    payload.value = decodeJwtPayload(result.accessToken);
    status.value = 'ready';
    await runPermissionChecks(result.accessToken);
  } catch (e) {
    clearPkceSession(stateParam);
    fail(e instanceof Error ? e.message : 'Token exchange failed');
  }
});
</script>

<style>
.oauth-cb {
  margin: 16px 0 24px;
}
.oauth-cb-msg {
  color: var(--vp-c-text-2);
}
.oauth-cb-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 16px;
  background: var(--vp-c-bg-soft);
}
.oauth-cb-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.oauth-cb-card-title {
  font-weight: 600;
}
.oauth-cb-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 4px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-default-soft);
}
.oauth-cb-badge.ok {
  background: var(--vp-c-green-soft);
  color: var(--vp-c-green-1);
}
.oauth-cb-badge.err {
  background: var(--vp-c-red-soft);
  color: var(--vp-c-red-1);
}
.oauth-cb-error {
  margin: 0;
  color: var(--vp-c-text-1);
}
.oauth-cb-hint {
  margin: 8px 0 0;
  color: var(--vp-c-text-2);
  font-size: 14px;
}
.oauth-cb-kv {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 16px;
  margin: 0 0 12px;
  font-size: 13px;
}
.oauth-cb-kv dt {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}
.oauth-cb-kv dd {
  margin: 0;
  font-family: var(--vp-font-family-mono);
  overflow-wrap: anywhere;
}
.oauth-cb-token {
  display: block;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.oauth-cb-payload {
  margin-top: 12px;
  font-size: 13px;
}
.oauth-cb-payload summary {
  cursor: pointer;
  color: var(--vp-c-text-2);
}
.oauth-cb-payload pre {
  margin: 8px 0 0;
  padding: 10px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 12px;
  overflow-x: auto;
}
.oauth-cb-h {
  margin: 28px 0 4px;
  font-size: 18px;
  font-weight: 600;
}
.oauth-cb-desc {
  margin: 0 0 12px;
  color: var(--vp-c-text-2);
  font-size: 14px;
}
.oauth-cb-perms {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
}
.oauth-cb-perm {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 13px;
}
.oauth-cb-perm.granted {
  border-color: var(--vp-c-green-2);
}
.oauth-cb-perm.denied {
  border-color: var(--vp-c-red-2);
}
.oauth-cb-perm-label {
  font-family: var(--vp-font-family-mono);
}
.oauth-cb-gate {
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 14px;
}
.oauth-cb-gate.granted {
  background: var(--vp-c-green-soft);
}
.oauth-cb-gate.denied {
  background: var(--vp-c-red-soft);
}
.oauth-cb-back {
  margin-top: 28px;
}
</style>
