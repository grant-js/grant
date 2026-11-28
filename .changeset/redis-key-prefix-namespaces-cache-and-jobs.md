---
'grant-api': patch
---

`REDIS_KEY_PREFIX` now namespaces every Redis key the API writes; it was read but never applied. Cache keys become `<prefix><entity>:…` (unchanged at the default `grant:`), and the BullMQ queue moves from `bull:grant-jobs` to `<prefix>bull:grant-jobs`. The queue also honours `REDIS_DB` now, as the cache already did. Two deployments sharing one Redis server previously shared one job queue and one cache namespace: a `project-sync` import taken by the other deployment's worker failed its tenant check against the wrong database and stayed `PENDING`. Give each deployment its own `REDIS_KEY_PREFIX` to keep them apart.

Upgrading moves the queue to a new key, so jobs still queued under `bull:grant-jobs` at deploy time are not picked up; recurring jobs are re-registered under the new prefix at startup.
