---
'@grantjs/client': minor
---

**BREAKING** Project apps use authorization-code + PKCE. Consent redirects with `?code=&state=` (the `#access_token=` fragment is gone). Exchange at `POST /api/auth/project/token` (`authorization_code` and rotating `refresh_token`). Discovery: RFC 8414 well-known before the issuer path, plus `{iss}/.well-known/openid-configuration` (same JSON; Grant is not an OpenID Provider).
