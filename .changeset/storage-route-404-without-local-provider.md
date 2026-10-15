---
'grant-web': patch
---

`GET /storage/*` answers 404 instead of 500 when the storage provider is not `local`. The API mounts `/storage` only for the local provider, so on the AWS target (S3) the path has no CloudFront behaviour and reaches the web function, whose rewrite to an API at `localhost:4000` failed with `ECONNREFUSED` and surfaced as a 500. The web proxy now reads `STORAGE_PROVIDER` and, for any provider other than `local` (or unset, which keeps `pnpm dev` and the local Docker setup as they were), answers an empty 404 itself. The AWS construct passes the provider to the web function. Local provider behaviour, including the rule that `imports/` is never served, is unchanged.
