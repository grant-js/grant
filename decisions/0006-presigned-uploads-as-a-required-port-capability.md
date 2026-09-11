# 0006 — Direct upload is a required capability of `IFileStorageService`, and the local adapter honours it

- **Status**: Accepted
- **Date**: 2026-09-11
- **Context**: AWS follow-ups closeout
  (`plans/2026-09-09-aws-followups-closeout-stack.md`), part D, slice 9 — the only
  `@grantjs/core` change in that program
- **Depends on**: nothing in 0001–0005. Storage has not been the subject of an ADR before.

## Context

User file uploads travel base64 through GraphQL today
(`packages/@grantjs/core/src/ports/services/file-storage.service.port.ts:16`; call
sites at `me.handler.ts:183`, `me.handler.ts:575`, `users.handler.ts:884`), paying
+33% expansion against an invocation cap and billing a Lambda for the transfer. Part D
adds a way for the client to write bytes directly to the store.

`IFileStorageService` (`packages/@grantjs/core/src/ports/storage.port.ts:14-50`) has
two implementations: `S3StorageAdapter`, which already signs read URLs
(`packages/@grantjs/storage/src/s3/index.ts:137`), and `LocalStorageAdapter`, which
writes under `basePath` and returns `/storage/<path>`
(`packages/@grantjs/storage/src/local/index.ts:94-96`), served by
`express.static` mounted only when the provider is local (`apps/api/src/create-app.ts:194-196`).

The stack plan poses the question this record answers: is the new method optional on the
port, or required of every adapter.

## Decision

**Required, not optional. Two methods, both mandatory, with all constraints as required
inputs.**

```
getUploadUrl(path, { contentLength, contentType, expiresInSeconds }): Promise<UploadUrlResult>
getMetadata(path): Promise<StoredObjectMetadata | null>
```

Four sub-decisions carry the weight:

1. **The port promises a bounded bearer capability, not byte offload.** "Anyone holding
   this URL may write exactly `contentLength` bytes of exactly `contentType` to exactly
   `path`, until `expiresAt`" is implementable over any store with an HTTP route in
   front of it. Offloading the bytes from the API process is a property of S3, not of
   the contract. The local adapter can honour the contract; it cannot honour the
   offload, and is not asked to.

2. **Exact length, not a maximum — so `fields?` does not survive.** A range condition
   (`content-length-range`) exists only in presigned POST, which needs
   `@aws-sdk/s3-presigned-post`, a dependency this repo does not have. It is also the
   weaker guarantee: the client holds the `File` and knows its byte length before it
   asks, so the URL can commit to the exact number, which SigV4 signs by default. The
   result type is therefore `{ url, method, headers, expiresAt }` with no `fields`.
   An optional `fields` would move the "every caller needs a fallback branch" cost from
   the method to the result, where it would reach the GraphQL contract and the web
   client unchanged.

3. **The local adapter's key is a file it owns, under `basePath`.** `getUploadUrl`
   mints `/<prefix>/<path>?exp&len&ct&sig`, `sig` being HMAC-SHA256 over the four
   commitments — the same construction and the same constant-time comparison
   `HmacWebhookSigner` already uses (`packages/@grantjs/webhooks/src/signer.ts:16,46`).
   The key is `randomBytes(32)`, persisted at `<basePath>/.grant-upload-key`, mode
   `0600`, created on first mint and read thereafter; `LocalConfig.uploadSigningSecret`
   overrides it. **The key's failure domain is deliberately identical to the data's**:
   replicas that share the volume share the key, and replicas that do not already
   cannot serve each other's files. This is why the capability needs no new env key and
   no `validateConfig()` refusal — a required method whose local implementation is
   gated on configuration would be optional wearing a required signature.

4. **Confirmation lives above the port; the port owes it one read.** There is no
   `confirm()` on `IFileStorageService`: neither store has such a notion, and
   associating an object with a tenant record is a domain transaction. What the port
   owes the service layer is the ability to ask the store what it actually holds, which
   `exists()` answers with one bit and throws the rest away. `getMetadata()` lands in
   the same slice as `getUploadUrl()` and not in slice 10 because it is a
   `@grantjs/core` change, and slice 9 is the deep-reviewed, architect-signed slice.

`upload()`, `getUrl()`, `exists()`, `delete()` and `copy()` are untouched, and the
base64 path stays — additive, per the program's governing constraint.

## Why not the alternatives

**Optional (`getUploadUrl?`).** The fallback for "adapter cannot presign" is the base64
path, which survives anyway, so the optional shape looks free. It is not. The branch
cannot live in the service — it must surface in the GraphQL and OpenAPI contracts as
"here is a URL, or use the other mutation", making a public API's shape a function of
which adapter the operator configured. And the `?` is permanent: once optional, no
future adapter is obliged to implement it, so no caller may ever drop the branch. The
decisive practical cost is coverage: CI runs on local storage, so an optional method
that local declines means **the direct-upload path is never exercised outside a
production deploy**. Required converts it into a path e2e runs on every commit.

**Requiring a session on the local write route instead of signing it.** The bytes reach
the same origin, so the browser already holds the cookie, and no HMAC would be needed.
Rejected because it makes the two adapters answer different questions: on S3 the URL
_is_ the authorization, on local it is a hint. One conformance suite could then assert
nothing about what the URL carries, which is most of what there is to assert.

**An opaque token with the constraints stored server-side** (in `ICacheAdapter`, a core
port the package may legally accept). Rejected for the same reason: with the
commitments in a store rather than in the URL, there is nothing in the artifact to
test, and the shared suite collapses to "the round trip works".

**A new `STORAGE_LOCAL_UPLOAD_SECRET` env key.** It has no safe default. Empty means
either an open write endpoint or a required method that throws
`ConfigurationError` — the leak this ADR exists to prevent — and a non-empty default
generated per process breaks intermittently across replicas. The volume already
answers the question the env key was asking.

**Reusing the shared `S3Client` for presigning.** It cannot be reused as configured: the
default client hoists `x-amz-checksum-crc32` of an empty body into the signed query
string, and a real PUT against that URL is refused with `400 InvalidRequest`. The fix
(`requestChecksumCalculation: 'WHEN_REQUIRED'`) is only settable at construction.
Applying it to the shared client would silently remove checksums from `upload()`, an
existing working path — "extend, never replace". So presigning gets its own client
instance, same region, endpoint and credential chain
(`packages/@grantjs/storage/src/s3/index.ts:38-48`).

## Consequences

**The signed-header set must be stated, because the SDK's default is a trap.**
`getSignedUrl` over `PutObjectCommand` signs `content-length;host` — `ContentType` is
accepted and **not signed** unless `{ signableHeaders: new Set(['content-type']) }` is
passed. A naive implementation therefore issues a URL that appears to pin content type
and does not. This is pinned by test, twice: by name in the S3 unit lane, and
adapter-independently in the shared suite as "two mints differing only in
`contentType` must produce different URLs".

**Constraints are inputs, not defaults, and the port takes the intersection.** All three
of `contentLength`, `contentType` and `expiresInSeconds` are required, and
`expiresInSeconds` is bounded to `[1, 604800]` — SigV4's ceiling, which the local
adapter has no reason to exceed. A per-adapter default expiry would be a divergence the
suite could not assert, and `getUrl()`'s hardcoded 3600 on one side and silence on the
other (`s3/index.ts:137` vs `local/index.ts:94-96`) is the existing example of how that
ends.

**Policy stays in the service; the port carries facts.** `config.storage.upload`
(`apps/api/src/config/env.config.ts:687-693`) — max size, allowed types, allowed
extensions — is applied by `FileStorageService` before it delegates, exactly where
`validateAndDecodeUpload` applies it today
(`apps/api/src/services/file-storage.service.ts:114-127`). The port neither knows nor
enforces a policy maximum.

**The application must mount a PUT route in the same slice as the mint.** A port method
returning a URL to a route that does not exist is not an implementation. The route is
`PUT /storage/*`, alongside the existing GET mount (`create-app.ts:194-196`) and under
the same provider condition, with its own raw body parser — `express.json` at `:192`
does not apply and its limit is not the upload's. Verification is a public method on
`LocalStorageAdapter`, **not** on the port: S3 verifies its own signatures, so a
`verifyUploadUrl` on `IFileStorageService` would be a method one adapter exists to
answer. The key file is a dotfile precisely because `express.static` is already
configured `dotfiles: 'deny'` (`apps/api/src/middleware/storage.middleware.ts:16-20`);
that option becomes load-bearing and must be pinned by a test.

**What CI can prove about enforcement is asymmetric, and the asymmetry is recorded
rather than papered over.** LocalStack community 3.8 does not verify SigV4: measured
2026-09-11, a PUT with the signature replaced by 64 zeroes returned 200, as did a URL
signed for 999 bytes carrying 64, a URL fired 2.5 s past a 1-second expiry, and a URL
whose key was rewritten from one tenant prefix to another. So for S3 the integration
lane may assert the round trip and **nothing about enforcement**; enforcement is
asserted offline against what the URL commits to, and against a real bucket in slice 16. For local, enforcement is our own code and is proven in the unit lane. The shared
suite carries an `enforcesUrlConstraints` flag for this, and its divergence index must
record that the flag is false for S3 because of the _emulator_, not the adapter — a
future reader who upgrades LocalStack should flip it, not delete the tests.

**Replay within the window is permitted, and the port says so.** Neither adapter makes a
URL single-use. A holder may write a _different_ body of the same length and type to
the same path before expiry, which is why the confirm step reads `getMetadata()` back
from the store rather than trusting what was claimed at mint time, and why expiries
should be minutes rather than hours.

**`getMetadata().contentType` diverges and the port is silent about it.** S3 records the
content type; the local filesystem does not, and the adapter returns `undefined` rather
than guessing from the extension. Slice 10's confirm step must verify size on both and
must not assume a content type is readable back.

## Notes for the security review

- `path` is the tenancy boundary and is caller-supplied at the port. The port cannot
  know a caller's scope; the service must derive the prefix server-side. Stated in the
  method's doc comment because the parameter's type cannot say it.
- **Pre-existing and out of scope, but now reachable in a new way**:
  `LocalStorageAdapter.upload/delete/copy` `path.join(basePath, filePath)` with no
  traversal guard (`local/index.ts:33,71,109-110`). Harmless while every path is
  server-generated; a presigned URL is the first artifact in which a path becomes
  something a client sees. `getUploadUrl` rejects `..` segments, leading separators and
  empty segments on **both** adapters; the three older methods are left as they are, and
  the gap is recorded here rather than closed silently in a port slice.
- A short expiry is the only mitigation for a leaked URL, since neither store revokes.
