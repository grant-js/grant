<template>
  <ClientOnly>
    <div class="api-tryit" :class="{ 'has-response': !!response }">
      <!-- ── Header ─────────────────────────────────────── -->
      <div class="api-tryit-header">
        <div class="api-tryit-endpoint">
          <span class="api-tryit-method" :class="methodClass">{{ method }}</span>
          <code class="api-tryit-path">{{ displayPath }}</code>
        </div>
        <button class="api-tryit-run" :class="methodClass" :disabled="loading" @click="run">
          <svg v-if="!loading" viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M4 2l10 6-10 6V2z"/></svg>
          <span v-else class="api-tryit-spinner" />
          {{ loading ? 'Running…' : 'Run' }}
        </button>
      </div>

      <!-- ── Variable inputs ────────────────────────────── -->
      <div v-if="inputList.length" class="api-tryit-inputs">
        <div v-for="name in inputList" :key="name" class="api-tryit-input-row">
          <label>
            <code>{{ name }}</code>
            <span v-if="state.variables[name]" class="api-tryit-set">set</span>
          </label>
          <input
            :value="state.variables[name] ?? ''"
            :placeholder="`Enter ${name}…`"
            spellcheck="false"
            @input="e => setVariable(name, (e.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <!-- ── Missing-variables warning ──────────────────── -->
      <div v-if="missing.length" class="api-tryit-warn">
        Unresolved:
        <code v-for="(v, i) in missing" :key="v">{{ v }}<template v-if="i < missing.length - 1">, </template></code>
        — run previous steps or fill them in above.
      </div>

      <!-- ── Request body (collapsible) ─────────────────── -->
      <div v-if="bodyObj" class="api-tryit-section">
        <button class="api-tryit-toggle" @click="bodyOpen = !bodyOpen">
          <span class="api-tryit-chev" :class="{ open: bodyOpen }">›</span>
          Request body
        </button>
        <div v-show="bodyOpen" class="api-tryit-code-wrap">
          <pre class="api-tryit-pre"><code v-html="highlightedBody"></code></pre>
        </div>
      </div>

      <!-- ── Response (collapsible) ─────────────────────── -->
      <div v-if="response" class="api-tryit-section" :class="responseClass">
        <button class="api-tryit-toggle" @click="resOpen = !resOpen">
          <span class="api-tryit-chev" :class="{ open: resOpen }">›</span>
          Response
          <span class="api-tryit-status" :class="statusBadge">{{ response.status }}</span>
        </button>
        <div v-show="resOpen" class="api-tryit-code-wrap">
          <pre class="api-tryit-pre"><code v-html="highlightedResponse"></code></pre>
        </div>

        <div v-if="captured.length" class="api-tryit-captures">
          <div v-for="c in captured" :key="c.name" class="api-tryit-cap">
            <span class="api-tryit-cap-check">✓</span>
            Saved <code>{{ c.name }}</code> = <code class="api-tryit-cap-val">{{ trunc(c.value, 48) }}</code>
          </div>
        </div>
      </div>

      <!-- ── Network error ──────────────────────────────── -->
      <div v-if="netErr" class="api-tryit-neterr">{{ netErr }}</div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useApiState } from '../composables/useApiState';

const props = defineProps<{
  method: string;
  path: string;
  body?: string;
  inputs?: string[];
  captures?: Record<string, string>;
}>();

const { state, setVariable, setAccounts, resolveTemplate, resolveDeep, getByPath, findUnresolved, tryRefresh } = useApiState();

const bodyOpen = ref(true);
const resOpen = ref(true);
const loading = ref(false);
const netErr = ref('');
const response = ref<{ status: number; statusText: string; body: string } | null>(null);
const captured = ref<{ name: string; value: string }[]>([]);
const didRetry = ref(false);

const inputList = computed(() => props.inputs ?? []);
const methodClass = computed(() => props.method.toLowerCase());
const displayPath = computed(() => resolveTemplate(props.path));

const bodyObj = computed(() => {
  if (!props.body) return null;
  try { return JSON.parse(props.body); }
  catch { return null; }
});

const prettyBody = computed(() => {
  if (!bodyObj.value) return '';
  return JSON.stringify(resolveDeep(bodyObj.value), null, 2);
});

const missing = computed(() => findUnresolved(prettyBody.value));

const responseClass = computed(() => {
  if (!response.value) return '';
  return response.value.status < 400 ? 'api-tryit-res-ok' : 'api-tryit-res-err';
});

const statusBadge = computed(() => {
  if (!response.value) return '';
  return response.value.status < 400 ? 'badge-ok' : 'badge-err';
});

function trunc(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function highlightJson(json: string): string {
  return json.replace(
    /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|(\b(?:true|false|null)\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match, key, str, lit, num) => {
      if (key) return `<span class="hl-key">${key}</span>:`;
      if (str) return `<span class="hl-str">${str}</span>`;
      if (lit) return `<span class="hl-lit">${lit}</span>`;
      if (num) return `<span class="hl-num">${num}</span>`;
      return match;
    },
  );
}

const highlightedBody = computed(() => bodyObj.value ? highlightJson(prettyBody.value) : '');
const highlightedResponse = computed(() => response.value ? highlightJson(response.value.body) : '');

async function executeRequest(): Promise<Response> {
  const url = `${state.baseUrl}${resolveTemplate(props.path)}`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (state.accessToken) headers['Authorization'] = `Bearer ${state.accessToken}`;

  const resolved = bodyObj.value ? resolveDeep(bodyObj.value) : undefined;

  return fetch(url, {
    method: props.method.toUpperCase(),
    headers,
    body: resolved ? JSON.stringify(resolved) : undefined,
  });
}

async function run() {
  loading.value = true;
  netErr.value = '';
  response.value = null;
  captured.value = [];
  didRetry.value = false;

  try {
    let res = await executeRequest();

    if (res.status === 401 && state.refreshToken) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        didRetry.value = true;
        res = await executeRequest();
      }
    }

    const text = await res.text();
    let formatted = text;

    try {
      const json = JSON.parse(text);
      formatted = JSON.stringify(json, null, 2);

      if (props.captures && res.ok) {
        for (const [varName, jsonPath] of Object.entries(props.captures)) {
          const val = getByPath(json, jsonPath);
          if (val !== undefined && val !== null) {
            if (varName === '$accounts' && Array.isArray(val)) {
              setAccounts(val);
              captured.value.push({ name: 'accounts', value: `${val.length} account(s)` });
            } else {
              const str = String(val);
              setVariable(varName, str);
              captured.value.push({ name: varName, value: str });
            }
          }
        }
      }
    } catch {
      /* non-JSON response — use raw text */
    }

    response.value = { status: res.status, statusText: res.statusText, body: formatted };
  } catch (err: unknown) {
    netErr.value = `${(err as Error).message}. Make sure the API is running at ${state.baseUrl}`;
  } finally {
    loading.value = false;
  }
}
</script>

<style>
/* ── ApiTryIt ──────────────────────────────────────────── */
.api-tryit {
  margin: 16px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg);
}

/* Header */
.api-tryit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  gap: 12px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}
.api-tryit-endpoint {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}
.api-tryit-method {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  text-transform: uppercase;
  flex-shrink: 0;
  color: #fff;
}
.api-tryit-method.get    { background: #10b981; }
.api-tryit-method.post   { background: #3b82f6; }
.api-tryit-method.put    { background: #f59e0b; color: #000; }
.api-tryit-method.patch  { background: #8b5cf6; }
.api-tryit-method.delete { background: #ef4444; }

.api-tryit-path {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--vp-c-text-1);
  word-break: break-all;
}

/* Run button */
.api-tryit-run {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 14px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  flex-shrink: 0;
  transition: background .15s, opacity .15s;
}
.api-tryit-run.get    { background: #10b981; }
.api-tryit-run.post   { background: #3b82f6; }
.api-tryit-run.put    { background: #f59e0b; color: #000; }
.api-tryit-run.patch  { background: #8b5cf6; }
.api-tryit-run.delete { background: #ef4444; }

.api-tryit-run.get:hover:not(:disabled)    { background: #059669; }
.api-tryit-run.post:hover:not(:disabled)   { background: #2563eb; }
.api-tryit-run.put:hover:not(:disabled)    { background: #d97706; }
.api-tryit-run.patch:hover:not(:disabled)  { background: #7c3aed; }
.api-tryit-run.delete:hover:not(:disabled) { background: #dc2626; }

.api-tryit-run:disabled { opacity: .55; cursor: not-allowed; }

/* Spinner */
.api-tryit-spinner {
  display: inline-block;
  width: 12px; height: 12px;
  border: 2px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: api-spin .6s linear infinite;
}
@keyframes api-spin { to { transform: rotate(360deg); } }

/* Variable inputs */
.api-tryit-inputs {
  padding: 10px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.api-tryit-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.api-tryit-input-row label {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 130px;
  font-size: 13px;
  flex-shrink: 0;
}
.api-tryit-input-row label code {
  font-size: 12px;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--vp-c-bg-soft);
}
.api-tryit-set {
  font-size: 10px;
  padding: 0 5px;
  border-radius: 3px;
  background: #10b981;
  color: #fff;
  font-weight: 700;
  line-height: 1.6;
}
.api-tryit-input-row input {
  flex: 1;
  padding: 5px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 5px;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  transition: border-color .15s, box-shadow .15s;
}
.api-tryit-input-row input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft);
}

/* Warning */
.api-tryit-warn {
  padding: 7px 16px;
  font-size: 12px;
  color: #b45309;
  background: #fef3c7;
  border-bottom: 1px solid var(--vp-c-divider);
}
.dark .api-tryit-warn {
  color: #fcd34d;
  background: rgba(245,158,11,.08);
}

/* Sections (body / response) */
.api-tryit-section {
  border-bottom: 1px solid var(--vp-c-divider);
}
.api-tryit-section:last-child { border-bottom: none; }

.api-tryit-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 7px 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  text-align: left;
  transition: color .15s;
}
.api-tryit-toggle:hover { color: var(--vp-c-text-1); }

.api-tryit-chev {
  display: inline-block;
  font-size: 15px;
  font-weight: 700;
  transition: transform .2s;
}
.api-tryit-chev.open { transform: rotate(90deg); }

/* Code blocks inside the component */
.api-tryit-code-wrap { padding: 0 16px 10px; }
.api-tryit-pre {
  margin: 0;
  padding: 12px 16px;
  border-radius: 6px;
  background: var(--vp-code-block-bg);
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.6;
}
.api-tryit-pre code {
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-3);
}

/* JSON syntax highlighting — light */
.api-tryit-pre .hl-key { color: #a626a4; }
.api-tryit-pre .hl-str { color: #50a14f; }
.api-tryit-pre .hl-num { color: #986801; }
.api-tryit-pre .hl-lit { color: #0184bc; }

/* JSON syntax highlighting — dark */
.dark .api-tryit-pre .hl-key { color: #c678dd; }
.dark .api-tryit-pre .hl-str { color: #98c379; }
.dark .api-tryit-pre .hl-num { color: #d19a66; }
.dark .api-tryit-pre .hl-lit { color: #56b6c2; }

/* Status badge */
.api-tryit-status {
  margin-left: auto;
  padding: 1px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  font-family: var(--vp-font-family-mono);
}
.api-tryit-status.badge-ok  { background: rgba(16,185,129,.12); color: #10b981; }
.api-tryit-status.badge-err { background: rgba(239,68,68,.1);   color: #ef4444; }

/* Response OK / Error border accent */
.api-tryit-res-ok  { border-left: 3px solid #10b981; }
.api-tryit-res-err { border-left: 3px solid #ef4444; }

/* Captures */
.api-tryit-captures {
  padding: 6px 16px 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.api-tryit-cap {
  font-size: 13px;
  color: var(--vp-c-text-2);
}
.api-tryit-cap-check {
  color: #10b981;
  font-weight: 700;
  margin-right: 3px;
}
.api-tryit-cap-val {
  font-size: 12px;
  background: rgba(16,185,129,.1);
  padding: 1px 5px;
  border-radius: 3px;
  color: #10b981;
}

/* Network error */
.api-tryit-neterr {
  padding: 10px 16px;
  font-size: 13px;
  color: #ef4444;
  background: rgba(239,68,68,.04);
}

/* Auth redirect block (used in guide.md Step 10) */
.api-tryit-auth-redirect {
  margin: 16px 0;
  padding: 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}
.api-tryit-auth-redirect p {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.6;
}
.api-tryit-auth-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 22px;
  border: none;
  border-radius: 6px;
  background: var(--vp-c-brand-1);
  color: #fff !important;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none !important;
  cursor: pointer;
  transition: background .15s;
}
.api-tryit-auth-btn:hover {
  background: var(--vp-c-brand-2);
}
</style>
