---
'grant-web': patch
---

Breadcrumbs show the full path on every dashboard page: the API key detail page now ends with the key's name (it stopped at "API Keys"), projects under a personal account have a crumb for the account, and Notifications, Branding, OAuth connections and the settings sub-pages (Profile, Security, Preferences, Privacy) have their crumb. A crumb names the loaded entity only when it is the one in the path, so a previously opened entity's name no longer shows on another one's page.
