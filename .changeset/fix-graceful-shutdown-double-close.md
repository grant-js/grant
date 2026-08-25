---
'grant-api': patch
---

Fix graceful shutdown aborting before it released any resources.

`ApolloServerPluginDrainHttpServer` closes the HTTP server during
`apolloServer.stop()`, so the subsequent `httpServer.close()` reported
`ERR_SERVER_NOT_RUNNING`. That rejection escaped the shutdown sequence, which meant
every step after it was skipped: OpenTelemetry spans were never flushed, job
schedules were never stopped, and the cache and database connections were never
closed. The process exited 1 on every SIGTERM, so each Kubernetes pod termination
was a hard failure.

Closing an already-closed server is now treated as success, since it is the outcome
the caller wanted. Shutdown runs to completion and exits 0.
