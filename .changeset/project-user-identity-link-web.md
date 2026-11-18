---
'grant-web': patch
---

The project user set-email dialog offers to link the user to the existing identity when another member of the organization already holds the address (`ProjectUser:LinkIdentity`, organization projects): a confirm step explains what moves and that the project user is removed. Without the permission, the conflict now says that another user has the address. Labels for the `LinkIdentity` permission and the `project.user_identity_linked` webhook event, in English and German.
