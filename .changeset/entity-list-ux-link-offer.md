---
'grant-web': patch
'grant-api': patch
---

The set-email dialog offers to link a project user to the existing identity only when the user has no sign-in method of its own, the only case the link accepts. For a user with its own sign-in, the conflict now says that another user has the address and this user cannot be linked to them. The API's refusal for that case is reworded ("has its own sign-in, so it cannot be replaced by another identity").
