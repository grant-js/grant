---
'grant-web': minor
---

The permission list shows whether each permission has a condition, in a new Condition column (table) and field (cards). The chip reads "Has condition" or "No condition". A permission with a condition opens like the relationship count chips, on hover after a short delay, focus or tap, and shows the condition as read-only JSON to scroll and copy. Without a condition the chip opens nothing. The list already loads `condition`, so nothing more is fetched. The chip-and-popover behaviour the count chips used is now one shared `ChipPopover`, which both build on.
