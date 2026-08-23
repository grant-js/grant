---
'grant-web': patch
'@grantjs/server': patch
---

Fix grant-web Docker startup by shipping @swc/helpers ESM in the Next standalone bundle (next 16.3.2).
