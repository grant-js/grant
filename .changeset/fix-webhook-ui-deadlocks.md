---
'grant-web': patch
---

Fix three deadlocks in the webhook UI that made the feature unusable.

The detail page crashed with React error #185 (maximum update depth exceeded)
because `useWebhookDeliveries` returned a new `deliveries` array and a new
`refetch` closure on every render, and both are used as effect dependencies that
write into a store — so each store update re-rendered the component that owned
them. The actions menu could never be opened: permissions are fetched only once
the menu has been opened, and both the empty-actions guard and the `isLoading`
expression removed or disabled the trigger before that could happen, so rotating
a signing secret was unreachable from any view.
