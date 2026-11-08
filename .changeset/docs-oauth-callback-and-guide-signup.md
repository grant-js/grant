---
'grant-docs': minor
---

The Integration Guide now completes Project OAuth inside the docs, and readers can sign up from it. Step 9 registers the new OAuth Callback page (`/docs/integration/oauth-callback.html`) as the project app's redirect URI. A new Step 10 starts the authorization-code flow with an S256 PKCE challenge through `@grantjs/client`'s `signInWithProjectApp`. The callback page exchanges the code and shows the token's `Document` permissions with `GrantClient.can`. Before this, the guide sent no PKCE challenge, so the flow could not complete. The API Configuration panel gains a **Sign up** tab (`POST /api/auth/register`), which checks whether the instance allows public sign-up. It also shows an email-verification notice with a resend button, because the Organization flow needs a verified email.

The standalone client example (`packages/@grantjs/client/examples/nextjs`, served at `/example`) is retired, together with its `example-nextjs` image, its release and deploy steps, its compose services, its gateway routes and the Helm chart's `example` component. The image is no longer published. Deployments that set `example.*` chart values or route `/example` can drop them. Project apps created by earlier versions of the guide still list `/example/callback`, so readers run Step 9 again.
