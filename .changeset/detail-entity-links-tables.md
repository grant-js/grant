---
'grant-web': patch
---

Add a go-to link to the relationship tables of the dashboard detail pages. The roles, groups and permissions tables on a user, the groups and permissions tables on a role, and the permissions table on a group now end in the same open button the list pages use, which leads to that role, group or permission's own detail page. It is a regular link, so Cmd/Ctrl-click or middle-click opens it in a new tab, and each one is labelled with the entity type and name for screen readers. The column always stays last and is not offered in the column picker.
