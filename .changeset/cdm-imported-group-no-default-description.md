---
'grant-api': patch
---

A CDM import no longer invents a description for an imported group. A group without a `description` (and, for a role template's group, without a role description or display description) now stores none, instead of `Imported group <key>` or `Imported group for <key>`, and its search document no longer carries that text. The group's import marker in `metadata.cdmImport` still records where it came from. Re-running a `replace` import recreates the groups without the generated text.
