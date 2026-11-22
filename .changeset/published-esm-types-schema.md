---
'@grantjs/schema': patch
---

Published `@grantjs/schema` type entry points now use explicit `.js` relative specifiers (directory barrels as `./name/index.js`), including graphql-codegen output, so `moduleResolution: "nodenext"` / `"node16"` consumers resolve schema re-exports instead of `any`.
