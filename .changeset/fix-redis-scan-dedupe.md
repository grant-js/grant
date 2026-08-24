---
'@grantjs/cache': patch
---

De-duplicate Redis SCAN results in `RedisCacheAdapter`. SCAN guarantees each key is returned at least once, not exactly once, so `keys()` could report a key twice and `clear()` could issue a redundant DEL when the keyspace is resized mid-iteration.
