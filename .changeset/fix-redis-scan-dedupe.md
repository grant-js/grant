---
'grant-api': patch
---

De-duplicate Redis SCAN results in `RedisCacheAdapter`. SCAN guarantees each key is returned at least once, not exactly once, so `keys()` could report a key twice and `clear()` could issue a redundant DEL when the keyspace is resized mid-iteration.

The fix is in `@grantjs/cache`, which is internal and never published, so the changeset names the app that ships it. A changeset naming only ignored packages versions nothing, which keeps changesets/action on the version-PR path and stops publish from ever running.
