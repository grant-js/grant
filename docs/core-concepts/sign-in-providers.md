---
title: Sign-in providers
description: Configure GitHub and Google OAuth, how accounts are linked, and how profile pictures are inherited from identity providers
---

# Sign-in providers

Grant users authenticate with one or more **authentication methods**. Email/password is always available. GitHub and Google are optional **social OAuth** providers: enable each independently with a client ID and secret. Unconfigured providers are omitted from login, register, Settings → Login & Security, and project-app sign-in.

This page covers operator configuration, how Grant links identities, and how IdP profile photos become the user’s avatar.

## Configuration

Set credentials in the Config app (**GitHub OAuth** / **Google OAuth** categories) or in the root env file. Leave a provider’s client ID and secret empty to hide it.

| Variable                                    | Purpose                                                              |
| ------------------------------------------- | -------------------------------------------------------------------- |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth App credentials                                         |
| `GITHUB_CALLBACK_URL`                       | Platform callback (default `{APP_URL}/api/auth/github/callback`)     |
| `GITHUB_PROJECT_CALLBACK_URL`               | Project-app callback (default `{APP_URL}/api/auth/project/callback`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Web client credentials                                  |
| `GOOGLE_CALLBACK_URL`                       | Platform callback (default `{APP_URL}/api/auth/google/callback`)     |
| `GOOGLE_PROJECT_CALLBACK_URL`               | Project-app callback (default `{APP_URL}/api/auth/project/callback`) |

If either ID or secret is set, **both** are required; the API refuses to start with a half-configured provider.

The web app loads `GET /api/auth/providers` and renders only providers with `configured: true`. Restart the API after changing credentials.

Callback URL rules differ by IdP:

- **GitHub** — one Authorization callback URL, prefix-matched. Register `{API}/api/auth` so both platform and project callbacks work. See [Configuring the GitHub OAuth app](/architecture/security#configuring-the-github-oauth-app).
- **Google** — exact Authorized redirect URIs. List **both** platform and project callback URLs on the same Web client. See [Configuring the Google OAuth client](/architecture/security#configuring-the-google-oauth-client).

Requested scopes:

| Provider | Scopes                       |
| -------- | ---------------------------- |
| GitHub   | `user:email`, `read:user`    |
| Google   | `openid`, `email`, `profile` |

## Authentication methods

Each method is stored independently (`user_authentication_methods`). Constraints:

- A provider identity (for example one GitHub user id) can belong to **only one** Grant user.
- A Grant user can have **at most one** method per provider.
- Every user has exactly **one primary** method. OAuth-first signup keeps the social method primary.

**Email is the mailbox, not the password.** `provider = email` is the verified contact address (`providerId`). A password (`providerData.hashedPassword`) is optional. Settings shows **Set password** when the Email method has no password, and **Change password** when it does.

## Account linking

OAuth callbacks resolve the Grant user in this order:

```bmermaid
flowchart TD
  A[OAuth callback] --> B{Method already exists for this provider id?}
  B -->|yes| C[Sign in as that user]
  B -->|no| D{Authenticated connect with userId in state?}
  D -->|yes| E[Link provider to that user]
  D -->|no| F{Verified Email method matches IdP email?}
  F -->|yes| G[Auto-link provider to that user]
  F -->|no| H[Create user + social method]
  C --> I[Bind passwordless Email if IdP email is verified]
  E --> I
  G --> I
  H --> I
```

| Path          | When                                                                                                                          | Result                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Login**     | The GitHub/Google identity is already linked                                                                                  | Issue a session for that user                                            |
| **Connect**   | The user started OAuth from Settings (or another authenticated flow) with `userId` in OAuth state                             | Create the social method on that account                                 |
| **Auto-link** | No social method yet, but a **verified** Email method exists for the same address **and** the IdP marked the mailbox verified | Create the social method on that existing user                           |
| **Register**  | None of the above                                                                                                             | Create a user, the social method, and a personal or organization account |

Auto-link requires **both** sides verified. If the IdP email is unverified, or Grant’s Email method for that address is unverified, the callback fails (`Email is not verified`) instead of creating a second account or linking silently.

### Passwordless Email bind

After signup, connect, auto-link, later social login, and project OAuth, Grant also tries to attach a **passwordless** Email method when the IdP reports a verified mailbox:

- `provider = email`, `providerId` = normalized address, `isVerified = true`
- `providerData` has **no** `hashedPassword`
- Existing Email methods are not overwritten
- If another user already owns that Email address, OAuth still succeeds and the bind is skipped

Users can set a password later from Login & Security. Email/password login then uses that hash; social login still uses the GitHub/Google method.

## Profile picture inheritance

Grant stores a single `users.pictureUrl` (max 500 characters). Social OAuth copies the IdP photo URL into that field; it does **not** download the file into Grant storage.

| Event                          | Behavior                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| **New user from OAuth**        | Persist the IdP avatar URL when it is an `http(s)` URL within the length limit       |
| **Link / auto-link / connect** | Copy the IdP URL **only if** `pictureUrl` is empty                                   |
| **Later social login**         | Does not replace an existing photo (uploaded avatar or a previous IdP URL)           |
| **User upload**                | Settings / profile upload writes a Grant storage URL and becomes the lasting picture |

The IdP URL is also kept on the social method’s `providerData.avatarUrl` for consent and display fallbacks. Access tokens in `providerData` are never sent to the client.

### Displaying Google photos

Googleusercontent URLs (`lh3.googleusercontent.com`) reject hotlinks that send a `Referer` from the Grant origin (including `localhost`). Chrome then blocks the response as **Opaque Response Blocking**. Avatar `<img>` elements use `referrerPolicy="no-referrer"` so the photo loads. GitHub avatars (`avatars.githubusercontent.com`) do not need this, and the same policy is harmless for Grant-hosted `/storage/` URLs.

## Project apps

Project OAuth uses the same GitHub and Google clients. Each ProjectApp can restrict **enabled providers**. User resolution is the same global linking algorithm, then membership is checked in that project. See [Project OAuth](/architecture/security#project-oauth).

## See also

- [Security & session management](/architecture/security) — JWT, sessions, GitHub/Google callback URLs
- [Configuration](/getting-started/configuration) — Config app and env files
- [Environment setup](/deployment/environment) — Docker env for OAuth and email

## References

- Handlers: `OAuthHandler.listProviders` / `handleCallback`, `AuthHandler.createUserFromOAuth`, `linkOAuthAuthToExistingUser`, `resolveUserIdFromOAuthForProject`
- Services: `UserAuthenticationMethodService.ensureVerifiedContactEmail`
- Libs: `oauth-picture.lib.ts`, `oauth-contact-email.lib.ts`
- Web: `OAuthProviderButtons`, `AvatarImage` (`referrerPolicy="no-referrer"`)
