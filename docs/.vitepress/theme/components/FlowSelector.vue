<template>
  <ClientOnly>
    <div v-if="state.accounts.length > 0" class="flow-sel">
      <div class="flow-sel-label">Account scope</div>

      <div class="flow-sel-cards">
        <!-- Personal card -->
        <button
          v-if="hasPersonal"
          class="flow-sel-card"
          :class="{ selected: state.selectedFlow === 'personal' }"
          @click="select('personal')"
        >
          <div class="flow-sel-card-head">
            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/></svg>
            <span class="flow-sel-card-title">Personal</span>
          </div>
          <p class="flow-sel-card-desc">Create projects directly under your personal account. No organization needed.</p>
          <code class="flow-sel-card-id">{{ truncate(personalAccount!.id, 28) }}</code>
        </button>

        <!-- Organization card -->
        <button
          v-if="hasOrganization || hasPersonal"
          class="flow-sel-card"
          :class="{ selected: state.selectedFlow === 'organization' }"
          @click="select('organization')"
        >
          <div class="flow-sel-card-head">
            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.97 5.97 0 00-.75-2.9A3.005 3.005 0 0119 15v3h-3zM4.75 12.1A5.97 5.97 0 004 15v3H1v-3a3 3 0 013.75-2.9z"/></svg>
            <span class="flow-sel-card-title">Organization</span>
          </div>
          <p class="flow-sel-card-desc">Create an organization first, then projects inside it. Best for team collaboration.</p>
          <code v-if="organizationAccount" class="flow-sel-card-id">{{ truncate(organizationAccount.id, 28) }}</code>
        </button>
      </div>

      <!-- Auto-selected hint -->
      <p v-if="autoSelected" class="flow-sel-hint">
        Auto-selected based on your account. You can switch at any time.
      </p>
    </div>

    <div v-else-if="state.accessToken" class="flow-sel flow-sel-empty">
      Verifying your account…
    </div>

    <div v-else class="flow-sel flow-sel-empty">
      Connect to the API above to see account options.
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import { useApiState } from '../composables/useApiState';

const { state, setVariable } = useApiState();

const autoSelected = ref(false);

const personalAccount = computed(() => state.accounts.find((a) => a.type === 'personal') ?? null);
const organizationAccount = computed(() => state.accounts.find((a) => a.type === 'organization') ?? null);
const hasPersonal = computed(() => !!personalAccount.value);
const hasOrganization = computed(() => !!organizationAccount.value);

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function select(flow: 'personal' | 'organization') {
  state.selectedFlow = flow;

  // Only set ACCOUNT_ID when the selected flow has an existing account.
  // If user selects organization but has no org account, they must create one first (Step 1 widget).
  if (flow === 'personal' && personalAccount.value) {
    setVariable('ACCOUNT_ID', personalAccount.value.id);
  } else if (flow === 'organization' && organizationAccount.value) {
    setVariable('ACCOUNT_ID', organizationAccount.value.id);
  }
}

/** Auto-select when accounts arrive and no flow is chosen yet. */
watch(
  () => state.accounts.length,
  (len) => {
    if (len === 0 || state.selectedFlow) return;

    if (hasPersonal.value && !hasOrganization.value) {
      select('personal');
      autoSelected.value = true;
    } else if (hasOrganization.value && !hasPersonal.value) {
      select('organization');
      autoSelected.value = true;
    }
  },
  { immediate: true },
);
</script>

<style>
/* ── FlowSelector ──────────────────────────────────────── */
.flow-sel {
  margin: 0 0 24px;
  padding: 14px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}
.flow-sel-empty {
  font-size: 13px;
  color: var(--vp-c-text-3);
  text-align: center;
  padding: 18px 16px;
}

.flow-sel-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--vp-c-text-3);
  margin-bottom: 10px;
}

.flow-sel-cards {
  display: flex;
  gap: 10px;
}

.flow-sel-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border: 2px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.flow-sel-card:hover {
  border-color: var(--vp-c-brand-1);
}
.flow-sel-card.selected {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

.flow-sel-card-head {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--vp-c-text-1);
}
.flow-sel-card-head svg {
  flex-shrink: 0;
  color: var(--vp-c-brand-1);
}
.flow-sel-card-title {
  font-size: 14px;
  font-weight: 600;
}

.flow-sel-card-desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.flow-sel-card-id {
  font-size: 11px;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
  padding: 2px 6px;
  border-radius: 3px;
  align-self: flex-start;
}

.flow-sel-hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--vp-c-text-3);
  font-style: italic;
}

@media (max-width: 640px) {
  .flow-sel-cards {
    flex-direction: column;
  }
}
</style>
