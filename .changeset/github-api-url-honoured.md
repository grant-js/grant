---
'grant-api': patch
---

GitHub sign-in now calls the API at `GITHUB_API_URL` (default `https://api.github.com`) for the user and email lookups. The setting was read but ignored, so a GitHub Enterprise Server or a stub IdP could not be used.
