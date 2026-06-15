---
'grant-api': minor
---

CDM searchable metadata and denormalized `search_document` for list search, plus tag picker infinite scroll fix.

**API & CDM**

- Add `search_document` on `project_users`, `roles`, and `groups` with pg_trgm indexes
- CDM `searchable` on user, role, and group inputs; import, export, and runtime recomputation
- Project-scoped user list search filters via pivot `search_document`

**Web**

- Fix toolbar tag filter infinite loading (nested dropdown scroll, stable tag query variables, IntersectionObserver reconnect)
