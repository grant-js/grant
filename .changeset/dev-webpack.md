---
'grant-web': patch
---

`pnpm dev` works again on a fresh clone. The web app and the Config app now run `next dev --webpack`, like their builds, because the schema's ESM `.js` specifiers resolve only through the webpack alias (Next 16 defaults to Turbopack). The root `dev` task now builds workspace dependencies first, so packages consumed from `dist` (`@grantjs/client`, `@grantjs/server`) exist before the apps start.
