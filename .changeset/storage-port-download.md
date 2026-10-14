---
'grant-api': patch
---

`IFileStorageService` gains a required `download(path, { maxBytes })` that reads a stored object into a `Buffer`, refusing anything over `maxBytes`; the API's `FileStorageService` delegates to the configured adapter. No behaviour change yet: nothing calls it until CDM imports by reference land (ADR 0009, proposed).
