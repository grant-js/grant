# Grant Platform -- Compliance Requirements

This document maps compliance framework controls to Grant Platform features,
identifies gaps, and tracks readiness. It covers the four target frameworks
chosen for the open-source core + managed SaaS offering (EU + US scope).

## Target Frameworks (priority order)

| #   | Framework     | Tier       | Target       | Rationale                                                |
| --- | ------------- | ---------- | ------------ | -------------------------------------------------------- |
| 1   | SOC 2 Type II | Must-have  | 6-12 months  | Table stakes for US enterprise B2B SaaS                  |
| 2   | GDPR          | Must-have  | 6-12 months  | Mandatory for EU user data                               |
| 3   | ISO 27001     | High value | 12-18 months | Internationally recognized ISMS; ~60% overlap with SOC 2 |
| 4   | HIPAA         | High value | 12-18 months | Required for healthcare vertical                         |

---

## Open-Source Core vs Managed SaaS

The platform ships in two modes. Compliance responsibilities differ:

**Open-source core** -- provides compliance primitives (the building blocks):

- Audit logging with tenant scope
- Data export and deletion APIs
- RBAC/ACL engine
- JWKS key management and rotation
- Configurable retention periods
- Encryption helpers (bcrypt, RS256)
- Rate limiting middleware

**Managed SaaS** -- adds operational controls:

- Compliance dashboards and evidence collection
- Automated periodic access reviews
- Breach notification workflow
- Data Processing Agreement (DPA) management
- Uptime SLA monitoring and reporting
- SOC 2 evidence package generation

---

## SOC 2 Type II -- Control Mapping

SOC 2 is organized around five Trust Service Criteria (TSC). The platform
primarily addresses **Security (Common Criteria)** and **Privacy**.

### CC6 -- Logical and Physical Access Controls

| Control | Description                        | Platform Feature                                                        | Status      | Notes                                                |
| ------- | ---------------------------------- | ----------------------------------------------------------------------- | ----------- | ---------------------------------------------------- |
| CC6.1   | Logical access security            | RBAC/ACL engine, JWT authentication, email verification gating          | Implemented | E2E tested: auth flows, role-based access            |
| CC6.1   | Least privilege                    | Role hierarchy (Owner, Admin, Member, Viewer), per-resource permissions | Implemented | 6 seeded roles, 59 permissions, 82 groups            |
| CC6.1   | Tenant separation                  | Account-based multi-tenancy, organization/project isolation             | Implemented | Isolation relies on application filters (no RLS yet) |
| CC6.2   | Access provisioning and removal    | Invitation system, org member management, session revocation            | Implemented | Invite, accept, remove member flows                  |
| CC6.3   | Periodic access review             | Roles and permissions queryable via API                                 | Partial     | No automated review workflow yet                     |
| CC6.6   | Encryption in transit              | HTTPS enforcement, JWT RS256 signing                                    | Implemented | JWKS endpoint at `/.well-known/jwks.json`            |
| CC6.7   | Access restrictions on data stores | DB credentials via env vars, no direct DB exposure                      | Implemented |                                                      |
| CC6.8   | Intrusion detection                | Rate limiting (global + per-endpoint)                                   | Partial     | No IDS/IPS integration yet                           |

### CC7 -- System Operations / Monitoring

| Control | Description                  | Platform Feature                                                        | Status      | Notes                                            |
| ------- | ---------------------------- | ----------------------------------------------------------------------- | ----------- | ------------------------------------------------ |
| CC7.1   | Vulnerability management     | Dependency scanning (dependabot/renovate)                               | Partial     | CI pipeline needs integration                    |
| CC7.2   | Monitoring and audit logging | Per-entity audit logs with who/what/when/scope                          | Implemented | Standardized schema across all entities          |
| CC7.2   | Audit completeness           | Audit entries include `performedBy`, `action`, `scopeTenant`, `scopeId` | Implemented | Not all entities consistently record scope (gap) |
| CC7.3   | Audit integrity              | Audit logs are append-only in DB (no update/delete API)                 | Implemented | No REST endpoint to query audit logs yet         |
| CC7.4   | Incident response            | N/A                                                                     | Gap         | Needs incident response plan and runbook         |

### CC8 -- Change Management

| Control | Description          | Platform Feature               | Status  | Notes                                     |
| ------- | -------------------- | ------------------------------ | ------- | ----------------------------------------- |
| CC8.1   | Change authorization | Git-based workflow, PR reviews | Partial | Needs formal change management policy doc |

### CC9 -- Risk Mitigation

| Control | Description            | Platform Feature                    | Status  | Notes                           |
| ------- | ---------------------- | ----------------------------------- | ------- | ------------------------------- |
| CC9.1   | Vendor risk management | N/A                                 | Gap     | Needs vendor assessment process |
| CC9.2   | Business continuity    | Docker-based deployment, DB backups | Partial | Needs formal BCP/DR plan        |

---

## GDPR -- Article Mapping

| Article    | Requirement               | Platform Feature                                           | Status      | Notes                                            |
| ---------- | ------------------------- | ---------------------------------------------------------- | ----------- | ------------------------------------------------ |
| Art. 5     | Data minimization         | API responses scoped to requested fields (field selection) | Implemented | GraphQL field selection optimization             |
| Art. 6     | Lawful basis              | N/A                                                        | Gap         | Needs lawful basis tracking per data category    |
| Art. 7     | Consent management        | N/A                                                        | Gap         | Needs consent collection and withdrawal APIs     |
| Art. 12-14 | Transparency              | Privacy policy endpoint                                    | Gap         | Needs machine-readable privacy notice            |
| Art. 15    | Right of access           | `GET /api/me/export` -- full data export                   | Implemented | JSON format, includes all user data              |
| Art. 16    | Right to rectification    | `PATCH /api/me`, `POST /api/me/change-password`            | Implemented | Users can update their data                      |
| Art. 17    | Right to erasure          | `DELETE /api/me/accounts` with soft/hard delete            | Implemented | 30-day retention (configurable), cascading       |
| Art. 18    | Restriction of processing | N/A                                                        | Gap         | Needs account suspension/freeze capability       |
| Art. 20    | Data portability          | `GET /api/me/export` returns machine-readable JSON         | Implemented | Downloadable attachment                          |
| Art. 25    | Data protection by design | Field selection, scoped queries, tenant isolation          | Implemented |                                                  |
| Art. 30    | Records of processing     | Audit logs per entity                                      | Partial     | Needs processing activity register               |
| Art. 32    | Security measures         | bcrypt hashing, RS256 JWT, rate limiting, RBAC             | Implemented |                                                  |
| Art. 33    | Breach notification (72h) | N/A                                                        | Gap         | Needs breach notification workflow               |
| Art. 35    | DPIA                      | N/A                                                        | Gap         | Needs Data Protection Impact Assessment template |

---

## ISO 27001 -- Annex A Control Mapping

ISO 27001 Annex A (2022 revision) has 93 controls in 4 themes.
Many overlap with SOC 2. Key controls specific to ISO 27001:

| Control | Description                    | Platform Feature                            | Status      | Notes                          |
| ------- | ------------------------------ | ------------------------------------------- | ----------- | ------------------------------ |
| A.5.1   | Information security policies  | N/A                                         | Gap         | Needs ISMS policy documents    |
| A.5.15  | Access control                 | RBAC/ACL, role hierarchy, permission groups | Implemented |                                |
| A.5.23  | Cloud services security        | Docker-based deployment, env-based secrets  | Partial     |                                |
| A.5.28  | Evidence collection            | Audit logs with scope, timestamps           | Implemented |                                |
| A.5.34  | Privacy and PII protection     | Data export, deletion, retention            | Implemented |                                |
| A.8.3   | Information access restriction | Tenant isolation, permission checks         | Implemented |                                |
| A.8.5   | Secure authentication          | JWT RS256, JWKS, bcrypt, email verification | Implemented |                                |
| A.8.9   | Configuration management       | Environment variables, config module        | Implemented |                                |
| A.8.15  | Logging                        | Structured logging (Pino), audit logs       | Implemented |                                |
| A.8.24  | Use of cryptography            | RS256 signing, bcrypt hashing, key rotation | Implemented |                                |
| A.8.25  | Secure development lifecycle   | TypeScript strict mode, linting, testing    | Partial     | Needs formal SDL documentation |
| A.8.28  | Secure coding                  | Input validation (Zod), error handling      | Implemented |                                |

---

## HIPAA -- Security Rule Mapping

HIPAA applies when the platform processes Protected Health Information (PHI)
on behalf of healthcare customers (Covered Entities).

### Administrative Safeguards (45 CFR 164.308)

| Standard      | Requirement                 | Platform Feature                       | Status      | Notes                                |
| ------------- | --------------------------- | -------------------------------------- | ----------- | ------------------------------------ |
| 164.308(a)(1) | Security management process | Risk analysis, RBAC                    | Partial     | Needs formal risk assessment         |
| 164.308(a)(3) | Workforce security          | Role-based access, invitation workflow | Implemented |                                      |
| 164.308(a)(4) | Access management           | Permission groups, role assignment     | Implemented |                                      |
| 164.308(a)(5) | Security awareness training | N/A                                    | Gap         | Organizational control, not platform |

### Technical Safeguards (45 CFR 164.312)

| Standard           | Requirement                | Platform Feature                              | Status      | Notes                                              |
| ------------------ | -------------------------- | --------------------------------------------- | ----------- | -------------------------------------------------- |
| 164.312(a)(1)      | Access control             | Unique user IDs, RBAC, emergency access       | Implemented | No break-glass procedure yet                       |
| 164.312(a)(2)(i)   | Unique user identification | UUID per user, email-based auth               | Implemented |                                                    |
| 164.312(a)(2)(iii) | Automatic logoff           | Session expiration (configurable)             | Implemented | JWT expiry + session management                    |
| 164.312(b)         | Audit controls             | Per-entity audit logs, user activity tracking | Implemented | Needs 6-year retention config                      |
| 164.312(c)(1)      | Integrity controls         | Audit log immutability (no update/delete API) | Implemented |                                                    |
| 164.312(d)         | Person authentication      | Email + password, OAuth, email verification   | Implemented |                                                    |
| 164.312(e)(1)      | Transmission security      | HTTPS, JWT RS256                              | Implemented |                                                    |
| 164.312(e)(2)(ii)  | Encryption                 | RS256 for tokens, bcrypt for passwords        | Partial     | No encryption-at-rest verification for stored data |

### Organizational Requirements (45 CFR 164.314)

| Standard   | Requirement                   | Platform Feature | Status | Notes                             |
| ---------- | ----------------------------- | ---------------- | ------ | --------------------------------- |
| 164.314(a) | Business Associate Agreements | N/A              | Gap    | Needs BAA template and management |

---

## Gap Summary and Priorities

### Critical Gaps (block certification)

| Gap                          | Frameworks Affected | Priority | Effort                    |
| ---------------------------- | ------------------- | -------- | ------------------------- |
| Consent management API       | GDPR                | High     | Medium                    |
| Breach notification workflow | GDPR, HIPAA         | High     | Medium                    |
| Incident response plan       | SOC 2, ISO 27001    | High     | Low (documentation)       |
| ISMS policy documents        | ISO 27001           | High     | Medium (documentation)    |
| BAA management               | HIPAA               | High     | Low (legal/documentation) |

### Important Gaps (needed for full compliance)

| Gap                             | Frameworks Affected | Priority | Effort              |
| ------------------------------- | ------------------- | -------- | ------------------- |
| Lawful basis tracking           | GDPR                | Medium   | Medium              |
| Automated access reviews        | SOC 2, ISO 27001    | Medium   | High                |
| REST audit log query endpoint   | SOC 2               | Medium   | Low                 |
| 6-year audit retention config   | HIPAA               | Medium   | Low                 |
| Formal change management policy | SOC 2               | Medium   | Low (documentation) |
| Account suspension/freeze       | GDPR                | Medium   | Medium              |
| Processing activity register    | GDPR                | Medium   | Low (documentation) |

### Nice-to-Have (strengthens posture)

| Gap                             | Frameworks Affected | Priority | Effort              |
| ------------------------------- | ------------------- | -------- | ------------------- |
| Row-Level Security (RLS)        | All                 | Low      | High                |
| IDS/IPS integration             | SOC 2               | Low      | High                |
| Formal SDL documentation        | ISO 27001           | Low      | Low                 |
| Encryption-at-rest verification | HIPAA               | Low      | Medium              |
| Vendor risk assessment process  | SOC 2               | Low      | Low (documentation) |

---

## Compliance Test Coverage

Automated E2E tests validate technical controls. They are located in
`apps/api/tests/e2e/compliance/` and map to specific control IDs:

| Test File                         | Framework | Controls Tested                |
| --------------------------------- | --------- | ------------------------------ |
| `gdpr.e2e.test.ts`                | GDPR      | Art. 15, 17, 20, 25, 32        |
| `soc2-access-control.e2e.test.ts` | SOC 2     | CC6.1, CC6.2, CC6.3            |
| `soc2-audit.e2e.test.ts`          | SOC 2     | CC7.2, CC7.3                   |
| `hipaa-phi.e2e.test.ts`           | HIPAA     | 164.312(a), (b), (c), (d), (e) |

Additional security boundary tests in `apps/api/tests/e2e/scenarios/`:

| Test File                     | Coverage                                                         |
| ----------------------------- | ---------------------------------------------------------------- |
| `negative-auth.e2e.test.ts`   | Authentication failures, token validation, brute force           |
| `negative-rbac.e2e.test.ts`   | Authorization boundaries, privilege escalation, tenant isolation |
| `user-onboarding.e2e.test.ts` | Complete user story with role-based access verification          |
| `multi-tenant.e2e.test.ts`    | Cross-tenant data isolation                                      |

---

## Readiness Tracker

Last updated: 2026-02-13

| Framework     | Technical Controls | Documentation | Operational Controls | Overall |
| ------------- | ------------------ | ------------- | -------------------- | ------- |
| SOC 2 Type II | 70%                | 20%           | 10%                  | ~33%    |
| GDPR          | 75%                | 25%           | 15%                  | ~38%    |
| ISO 27001     | 65%                | 15%           | 10%                  | ~30%    |
| HIPAA         | 60%                | 10%           | 5%                   | ~25%    |

> **Note:** Technical controls are strongest because the platform's core
> features (RBAC, audit logging, data export/deletion) directly satisfy many
> requirements. Documentation and operational controls are the primary gaps
> and do not require code changes -- they need policy documents, runbooks,
> and processes.
