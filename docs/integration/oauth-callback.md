---
title: OAuth Callback
description: Redirect target for the Integration Guide's Project OAuth sign-in — exchanges the code and shows the granted Document permissions
outline: false
aside: false
prev: false
next: false
---

# OAuth Callback

This page is the `redirect_uri` that [Step 9 of the Integration Guide](/integration/guide#step-9-create-a-project-app) registers on your project app. After you sign in and consent, Grant redirects here with `?code=&state=`. The page exchanges the code at `POST /api/auth/project/token` with the PKCE verifier the guide stored in this tab, then checks the user's `Document` permissions with the [Client SDK](/integration/client-sdk).

::: warning Tutorial shortcut
Project apps are confidential clients, so the token exchange also needs the app's `client_secret`. This page sends the secret Step 9 captured, from your browser, because the only thing at stake is your tutorial app. In your application, exchange the code on your **backend** and never ship the client secret to the browser.
:::

<OAuthCallback />

## The same flow in your app

The guide drives the flow from this docs site. In a React app the calls are the same: start with `signInWithProjectApp`, exchange the code on your callback route, then gate the UI.

```tsx
import { GrantProvider, GrantGate, useGrant } from '@grantjs/client/react';

// 1. Start: generate an S256 PKCE pair, keep the verifier under `state`, then redirect.
await grant.signInWithProjectApp({
  clientId,
  redirectUri,
  state,
  codeChallenge,
  codeChallengeMethod: 'S256',
});

// 2. Callback route: send ?code= to your backend, which calls POST /api/auth/project/token
//    { grant_type: 'authorization_code', client_id, client_secret, redirect_uri, code, code_verifier }
//    and returns the access token to the browser for getAccessToken.

// 3. Check and gate.
const canUpdate = useGrant('Document', 'Update', { scope });

<GrantGate resource="Document" action="Update" scope={scope} fallback={<ReadOnlyView />}>
  <Editor />
</GrantGate>;
```

See [Client SDK](/integration/client-sdk) for provider setup and token storage.
