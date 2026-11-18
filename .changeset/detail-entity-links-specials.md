---
'grant-web': patch
---

Extend the detail-page go-to links to the remaining relationships that have a detail page. A permission's resource now has an open button next to it inside a project (resources have no organization-level page, so none shows there). On a scope-based API key, rows in the Project scopes card link to that project permission; the Grant scopes card and the permissions of a role-based key stay without links. On an app, a scope row links to its project permission when exactly one permission has that resource and action; when several share it, the row shows no link rather than guess.
