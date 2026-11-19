---
'grant-web': patch
---

Every relationship count in the dashboard lists previews what it counts. The tag counts on organizations, projects, resources and project apps open on hover, focus or tap and list those tags, and an API key granted permissions shows "Permissions (n)" as a chip listing them, each linking to its page (cards, table and the key's detail page). A resource's "6 actions" lists its actions the same way. These lists already load the items, so nothing is fetched. Role and permission names in every preview are translated even when the API sends their key in a different casing (`permissions.names.Group.Read`). A test fails when a list shows a relationship count without a preview.
