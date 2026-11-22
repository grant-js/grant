---
'@grantjs/client': patch
'@grantjs/server': patch
---

Published `@grantjs/client` and `@grantjs/server` type declarations now use explicit `.js` relative specifiers and keep `@grantjs/schema` as a package import, so `moduleResolution: "nodenext"` / `"node16"` consumers type-check against real types instead of `any`.
