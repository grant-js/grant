# Architecture decision records

An ADR records a decision that is **expensive to reverse and hard to infer from the
code** — a boundary moved, a default flipped, a constraint accepted. Decisions that
are obvious from reading the code do not need one.

Sibling documents in `docs/architecture/` describe how the system _is_
(`overview.md`, `multi-tenancy.md`, `rbac.md`, `security.md`, `data-model.md`). These
record _why_ it became that way.

## Convention

- One file per decision: `NNNN-<kebab-slug>.md`, numbered in the order accepted.
- **Never edit an accepted ADR's decision.** To change one, write a new ADR and set
  the old one's status to `Superseded by NNNN`. The record is the history, not the
  current state.
- Status is one of `Proposed`, `Accepted`, `Superseded by NNNN`, or `Rejected`.
  A rejected ADR is worth keeping — it stops the same option being re-proposed.
- Cite `file:line` for anything the decision reverses or depends on, so a future
  reader can check whether the ground has moved.

## Index

| ADR                                                            | Status   | Decision                                                                      |
| -------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------- |
| [0001](./0001-configuration-gated-database-bootstrap.md)       | Accepted | Boot-time migrate/seed becomes configuration-gated                            |
| [0002](./0002-long-running-cdm-sync-beyond-lambda.md)          | Accepted | CDM sync jobs exceeding 15 minutes run off-Lambda                             |
| [0003](./0003-lambda-web-adapter-over-a-handler-entrypoint.md) | Accepted | Lambda runs `server.js` behind the Web Adapter, no handler                    |
| [0004](./0004-secret-resolution-through-a-port.md)             | Accepted | Secrets resolve through `ISecretResolver` at point of use, not a boot preload |
