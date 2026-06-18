---
title: Integration Guide
description: Step-by-step interactive tutorial — set up RBAC resources, permissions, roles, users, and API keys in Grant
cbf: true
---

<script setup>
import { computed } from 'vue'
import { useApiState } from '../.vitepress/theme/composables/useApiState'

const { state } = useApiState()

const flow = computed(() => state.selectedFlow)
const isOrg = computed(() => flow.value === 'organization')
const isPersonal = computed(() => flow.value === 'personal')
const hasFlow = computed(() => !!flow.value)

const personalAccount = computed(() => state.accounts.find((a) => a.type === 'personal') ?? null)
const organizationAccount = computed(() => state.accounts.find((a) => a.type === 'organization') ?? null)
const hasPersonal = computed(() => !!personalAccount.value)
const hasOrganization = computed(() => !!organizationAccount.value)
const hasBothAccounts = computed(() => hasPersonal.value && hasOrganization.value)
const needsComplementaryAccount = computed(
  () =>
    hasFlow.value &&
    !hasBothAccounts.value &&
    ((isPersonal.value && !hasPersonal.value) || (isOrg.value && !hasOrganization.value))
)
const complementaryAccountLabel = computed(() =>
  isOrg.value && !hasOrganization.value
    ? 'Organization'
    : isPersonal.value && !hasPersonal.value
      ? 'Personal'
      : ''
)

/* ── Scope helpers ──────────────────────────────────────── */

function projectScope() {
  return isPersonal.value
    ? { tenant: 'account', id: '{ACCOUNT_ID}' }
    : { tenant: 'organization', id: '{ORG_ID}' }
}

function resourceScope() {
  return isPersonal.value
    ? { tenant: 'accountProject', id: '{ACCOUNT_ID}:{PROJECT_ID}' }
    : { tenant: 'organizationProject', id: '{ORG_ID}:{PROJECT_ID}' }
}

function userScope() {
  return isPersonal.value
    ? { tenant: 'accountProjectUser', id: '{ACCOUNT_ID}:{PROJECT_ID}:{PROJ_USER_ID}' }
    : { tenant: 'organizationProjectUser', id: '{ORG_ID}:{PROJECT_ID}:{PROJ_USER_ID}' }
}

/* ── Body builders ──────────────────────────────────────── */

const orgBody = computed(() => JSON.stringify({
  name: 'Acme Corp',
  scope: { tenant: 'account', id: '{ACCOUNT_ID}' },
}))

const step2Body = computed(() => JSON.stringify({
  name: 'My App',
  scope: projectScope(),
}))

const step3Body = computed(() => JSON.stringify({
  name: 'Document',
  slug: 'document', 
  actions: ['create', 'read', 'update', 'delete', 'query'],
  createPermissions: true,
  scope: resourceScope(),
}))

/** Permission IDs from embedded `permissions` on the create-resource response (same order as `actions`). */
const step3Captures = {
  RESOURCE_ID: 'data.id',
  PERM_CREATE: 'data.permissions.0.id',
  PERM_READ: 'data.permissions.1.id',
  PERM_UPDATE: 'data.permissions.2.id',
  PERM_DELETE: 'data.permissions.3.id',
  PERM_QUERY: 'data.permissions.4.id',
}

const step4Body = computed(() => JSON.stringify({
  name: 'DocumentFullAccess',
  permissionIds: ['{PERM_CREATE}', '{PERM_READ}', '{PERM_UPDATE}', '{PERM_DELETE}', '{PERM_QUERY}'],
  scope: resourceScope(),
}))

const step5Body = computed(() => JSON.stringify({
  name: 'DocumentEditor',
  groupIds: ['{GROUP_ID}'],
  scope: resourceScope(),
}))

const step6Body = computed(() => JSON.stringify({
  name: 'Demo User',
  roleIds: ['{ROLE_ID}'],
  scope: resourceScope(),
}))

const step7Body = computed(() => JSON.stringify({
  name: 'Demo User Key',
  scope: userScope(),
}))

const step8Body = computed(() => JSON.stringify({
  clientId: '{CLIENT_ID}',
  clientSecret: '{CLIENT_SECRET}',
  scope: { tenant: 'projectUser', id: '{PROJECT_ID}:{PROJ_USER_ID}' },
}))

// Path-based: example app at origin/example, callback at origin/example/callback
const exampleAppOrigin = computed(() => (state.exampleAppUrl || '').trim().replace(/\/+$/, ''))
const exampleCallbackUrl = computed(() => exampleAppOrigin.value ? `${exampleAppOrigin.value}/callback` : '')

function normalizeFrontendUrl (url) {
  const u = (url || '').trim()
  if (!u) return ''
  try {
    const parsed = new URL(u)
    const port = parsed.port
    if ((parsed.protocol === 'https:' && (port === '443' || port === '3000')) || (parsed.protocol === 'http:' && port === '80')) {
      parsed.port = ''
    }
    return parsed.origin
  } catch {
    return u
  }
}
const frontendUrl = computed(() => normalizeFrontendUrl(state.appUrl || ''))

const step9Body = computed(() => JSON.stringify({
  name: 'Documents App',
  redirectUris: [exampleCallbackUrl.value],
  scopes: ['document:create', 'document:read', 'document:update', 'document:delete', 'document:query'],
  enabledProviders: ['email', 'github'],
  allowSignUp: true,
  signUpRoleId: '{ROLE_ID}',
  scope: resourceScope(),
}))

const oauthState = computed(() => Math.random().toString(36).slice(2, 10))
const authUrl = computed(() => {
  if (!frontendUrl.value || !exampleCallbackUrl.value) return ''
  const clientId = state.variables.APP_CLIENT_ID || ''
  const redirect = encodeURIComponent(exampleCallbackUrl.value)
  return `${frontendUrl.value}/en/auth/project?client_id=${clientId}&redirect_uri=${redirect}&state=${oauthState.value}`
})
const canOpenAuthFlow = computed(() => !!(frontendUrl.value && exampleCallbackUrl.value && state.variables.APP_CLIENT_ID))
function openAuthFlowInNewTab() {
  if (authUrl.value) window.open(authUrl.value, '_blank', 'noopener,noreferrer')
}
</script>

# Integration Guide

This tutorial walks you from a running Grant instance to a fully configured RBAC setup: project, resource (with permissions), group, role, project user, API key, JWT access token, and project app. By the end you will have everything needed to integrate the [Server SDK](/integration/server-sdk) or [Client SDK](/integration/client-sdk) into your application.

::: info Prerequisites

- Grant running locally — see [Quick Start](/getting-started/quick-start)
- Set up email provider — see [Email Service](/advanced-topics/email-service)
- Complete the sign up process with email provider — see [Email verification](/architecture/security#email-verification)
  :::

## Step 1 — Setup

Every API call on this page has a **Run** button. Configure the connection below, then work through the steps — responses and IDs are captured automatically so each step feeds into the next.

<ApiConfig />

<FlowSelector />

<div v-if="!hasFlow" class="vp-doc">

::: warning Select an account
Choose **Personal** or **Organization** above to continue.
:::

</div>

<div v-if="hasFlow">

<div v-if="needsComplementaryAccount" class="vp-doc">

### Create your {{ complementaryAccountLabel }} account

You only have one account type. Creating the complementary account lets you use the **{{ complementaryAccountLabel }}** flow. The API creates it for you (personal if you only had organization, or organization if you only had personal). After creation, the new account is added to the list above and **ACCOUNT_ID** is set so the rest of the steps work as if you had both accounts from the start.

<ApiTryIt
  method="POST"
  path="/api/me/accounts"
  :captures="{ ACCOUNT_ID: 'data.account.id', '$accounts': 'data.accounts' }"
/>

</div>

<div v-if="isOrg && !needsComplementaryAccount">

### Create an Organization

Organizations group users, projects, resources, and roles. Create one under your account:

<ApiTryIt
  method="POST"
  path="/api/organizations"
  :body="orgBody"
  :inputs="['ACCOUNT_ID']"
  :captures="{ ORG_ID: 'data.id' }"
/>

The returned `id` is saved as **ORG_ID** for the following steps.

</div>

## Step 2 — Create a Project

Projects are isolated environments that hold resources, roles, and API keys.

<div v-if="isPersonal">

Create one scoped to your personal account:

</div>
<div v-if="isOrg">

Create one scoped to the organization you just created:

</div>

<ApiTryIt
  method="POST"
  path="/api/projects"
  :body="step2Body"
  :captures="{ PROJECT_ID: 'data.id' }"
/>

## Step 3 — Create a Resource

A resource declares what entity your application protects and which actions are available. Create a `Document` resource with **`createPermissions: true`** so Grant creates one project-scoped permission per action (same as five separate `POST /api/permissions` calls). The response **includes** those permissions under `permissions` so you can capture their IDs for the next step.

<ApiTryIt
  method="POST"
  path="/api/resources"
  :body="step3Body"
  :captures="step3Captures"
/>

## Step 4 — Create a Group

A group bundles related permissions. Create a `DocumentFullAccess` group with all five permission IDs from Step 3:

<ApiTryIt
  method="POST"
  path="/api/groups"
  :body="step4Body"
  :captures="{ GROUP_ID: 'data.id' }"
/>

## Step 5 — Create a Role with the Group

Create a role and assign the group to it:

<ApiTryIt
  method="POST"
  path="/api/roles"
  :body="step5Body"
  :captures="{ ROLE_ID: 'data.id' }"
/>

## Step 6 — Create a Project User

Create a user inside the project with the role from Step 5. The role's groups carry the permissions, so the user inherits full Document access:

<ApiTryIt
  method="POST"
  path="/api/users"
  :body="step6Body"
  :captures="{ PROJ_USER_ID: 'data.id' }"
/>

## Step 7 — Create a User API Key

Create an API key scoped to the project user. Unlike project-level keys, user keys resolve permissions from the user's roles — no `roleId` needed. The response includes the `clientSecret` — **store it now, it is shown only once**:

<ApiTryIt
  method="POST"
  path="/api/api-keys"
  :body="step7Body"
  :captures="{ CLIENT_ID: 'data.clientId', CLIENT_SECRET: 'data.clientSecret' }"
/>

## Step 8 — Exchange for a Token

Exchange the API key credentials for a JWT access token:

<ApiTryIt
  method="POST"
  path="/api/auth/token"
  :body="step8Body"
  :captures="{ API_TOKEN: 'data.accessToken' }"
/>

The response contains an `accessToken` (RS256 JWT) and `expiresIn` (seconds). The token carries the permissions from the user's roles. You can now use this token with the [Server SDK](/integration/server-sdk) or any HTTP client to authorize requests against your protected endpoints.

## Step 9 — Create a Project App

A Project App is an OAuth client that lets users sign in or sign up through Grant and be redirected back to your application with a token. Create one with all Document scopes, email and GitHub providers, and the role from Step 5 as the sign-up/default role:

When users were imported through CDM with `findBy: email`, their email authentication method starts unverified. Completing this Project OAuth email magic-link flow proves mailbox ownership and verifies that imported method before issuing project-scoped access.

<ApiTryIt
  method="POST"
  path="/api/project-apps"
  :body="step9Body"
  :captures="{ APP_CLIENT_ID: 'data.clientId' }"
/>

<div v-if="state.variables.APP_CLIENT_ID" class="api-tryit-auth-redirect">

The app was created with **client_id** <code>{{ state.variables.APP_CLIENT_ID }}</code>. Click below to open the Project OAuth sign-in flow — you'll be redirected to the Grant UI to authenticate, grant consent, and then back to the callback URL with an access token.

<a v-if="canOpenAuthFlow" :href="authUrl" target="\_blank" rel="noopener noreferrer" class="api-tryit-auth-btn" @click.prevent="openAuthFlowInNewTab">
Open Sign-in Flow →
</a>

<p v-else-if="!frontendUrl || !exampleCallbackUrl" class="api-tryit-auth-note">
  Configure app URL via <code>APP_URL</code> in env; docs entrypoint writes minimal <code>/config.json</code> and the app fetches full config from <code>GET ${appUrl}/api/config</code>. For local dev, defaults are used.
</p>

::: tip
Make sure the Grant **web app** is running at the URL set by <code>APP_URL</code> (see [Quick Start](/getting-started/quick-start)). The example callback URL is <code>APP_URL/example/callback</code>. In Docker, set <code>APP_URL</code> in your env file; the docs entrypoint writes minimal <code>/config.json</code> and the app loads full config from the API.
:::

</div>

## Next Steps

- **Guard your endpoints** — integrate the [Server SDK](/integration/server-sdk) (`@grantjs/server`) to verify tokens and enforce permissions in Express, Fastify, Next.js, or NestJS
- **Protect your frontend** — use the [Client SDK](/integration/client-sdk) (`@grantjs/client`) with `GrantGate`, `useGrant`, and [Project OAuth](/architecture/security#project-oauth) for user sign-in/sign-up flows
- **Add conditions** — attach [Permission Conditions](/core-concepts/permission-conditions) and [resource resolvers](/integration/server-sdk#resource-resolvers) for fine-grained access control on update/delete
- **Explore examples** — browse the [server examples](https://github.com/grant-js/grant/tree/main/packages/%40grantjs/server/examples) and [client example](https://github.com/grant-js/grant/tree/main/packages/%40grantjs/client/examples) (Next.js with Project OAuth and Document permission checks)

</div>

---

**Related:**

- [Quick Start](/getting-started/quick-start) — Get Grant running locally
- [Resources](/core-concepts/resources) — Built-in resources and custom resource creation
- [API Keys](/core-concepts/api-keys) — Token exchange and scoping details
- [Server SDK](/integration/server-sdk) — Middleware integration for backend frameworks
- [Client SDK](/integration/client-sdk) — React hooks, permission gates, and Project OAuth
- [RBAC System](/architecture/rbac) — How permissions are evaluated
