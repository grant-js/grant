---
'@grantjs/client': patch
---

Fix the release workflow Docker matrix expression so GitHub Actions can parse
`release.yml` and run the release pipeline after merges to `main`.
