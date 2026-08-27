# Measurements — CDM payload against the Lambda request cap

## Metadata

- **Slug**: `aws-lambda-runtime` (phase **B**, slice 1)
- **Story brief**: [`2026-08-21-aws-lambda-runtime-brief.md`](./2026-08-21-aws-lambda-runtime-brief.md)
- **Stack plan**: [`2026-08-21-aws-lambda-runtime-stack.md`](./2026-08-21-aws-lambda-runtime-stack.md)
- **Measured**: 2026-08-25, on `feat/aws-lambda-runtime-oracle`
- **Reproduce**: `pnpm --filter grant-api measure:cdm-gzip`

> A third artifact type under one slug. The `plans/` README defines `-brief` and
> `-stack`; this is neither, and it is here rather than in `docs/` because it is
> story-scoped input to a decision that has not been taken yet. When phase C
> documents the AWS deployment target, this graduates to `docs/deployment/`.

## Why this exists

The story brief states the problem plainly:

> **The mitigation rests entirely on a number nobody has measured.**

`body-parser` inflates `Content-Encoding: gzip` request bodies by default
(`inflate` is opt-_out_, `body-parser/lib/read.js:190`) and applies `limit` to the
**decompressed** stream. So gzip spends compressed bytes against Lambda's 6 MB
request cap while `API_JSON_BODY_LIMIT_BYTES` still governs real size. Whether that
is a mitigation or a rounding error depends on the compression ratio of real CDM,
and nothing in the repo had measured it.

## Method

`apps/api/tests/tools/measure-cdm-gzip.ts` weighs documents from
`apps/api/tests/helpers/cdm-scale-fixtures.ts` at five profiles. Generation is
deterministic, so the table below is reproducible.

**The fixtures are not uniform filler, and that is the whole point.** Repeated
filler gzips to nearly nothing and would make any tenant size appear to fit. The
generator reproduces the entropy real CDM carries: UUID and email user keys,
opaque API-key client ids and 48-character secrets, prose descriptions from a word
pool, and metadata whose keys repeat while its values do not.
`tests/unit/lib/cdm/cdm-scale-fixtures.test.ts` asserts every generated document
validates against `startProjectSyncRequestSchema` — a ceiling measured from bytes
the REST route would reject is not a measurement of anything — and asserts the
fixtures stay high-entropy, so a later edit cannot quietly make the recorded
ceiling wrong.

**Three sizes matter, and only the third is the one Lambda enforces.** This is the
part the brief did not account for:

1. **Raw JSON bytes** — what `API_JSON_BODY_LIMIT_BYTES` governs, since
   `body-parser` applies `limit` after inflating.
2. **Gzip bytes** — what the client puts on the wire.
3. **Invocation payload bytes** — the event document Lambda receives, with the body
   embedded as a JSON string field. **This is what the 6 MB cap applies to, and it
   is larger than either of the above.** A raw JSON body is quote-escaped into the
   event JSON, and CDM is almost entirely quoted strings. A gzip body is binary, so
   it arrives base64-encoded (`isBase64Encoded: true`), costing +33%.

Cap taken as 6 MiB, with a 4 KiB allowance for headers, `requestContext`, and the
rest of the event envelope. Gzip level 6 (the client default); level 9 changes the
ratio by at most 0.8 points.

## Measured payload sizes

| Profile         | Entities |  Raw JSON | Gzip (L6) | Ratio |    Invocation, raw | Invocation, gzip+base64 |
| --------------- | -------: | --------: | --------: | ----: | -----------------: | ----------------------: |
| `starter`       |      124 |  0.03 MiB |  0.01 MiB | 15.7% |      0.04 MiB fits |           0.01 MiB fits |
| `team`          |      620 |  0.20 MiB |  0.03 MiB | 15.2% |      0.23 MiB fits |           0.04 MiB fits |
| `department`    |    3,650 |  1.39 MiB |  0.23 MiB | 16.5% |      1.57 MiB fits |           0.31 MiB fits |
| `enterprise`    |   28,880 | 12.16 MiB |  2.22 MiB | 18.2% | 13.71 MiB **over** |           2.96 MiB fits |
| `entropy-bound` |   28,880 | 16.99 MiB |  3.87 MiB | 22.8% | 19.05 MiB **over** |           5.16 MiB fits |

`entropy-bound` is not a tenant. It is the least compressible document the CDM
shape permits — every user carrying an API key, metadata, and a description — and
the ceilings below are derived from it rather than from the mean, because a
ceiling derived from an average is an optimistic ceiling.

## Derived ceilings

- Gzip ratio: **17.7% mean, 22.8% worst case.**
- JSON quote-escaping expands a raw body by **1.13x**.
- Practical ceiling, **uncompressed** body: **5.32 MiB** of raw CDM.
- Practical ceiling, **gzip** body: **19.76 MiB** of raw CDM.
- Gzip buys **3.7x** headroom over sending JSON as text.

## Findings

### 1. Gzip is sufficient. Payload-by-reference stays deferred.

At the worst-case ratio, a gzipped client can push **19.76 MiB** of raw CDM through
a 6 MiB Lambda request — comfortably past `API_JSON_BODY_LIMIT_BYTES`'s current
10 MiB default, and past the largest profile measured here (16.99 MiB raw,
28,880 entities). The deferred payload-by-reference work
(`IFileStorageService.getUploadUrl()`, the program's only `@grantjs/core` port
change) has no measured justification and **should stay deferred**. The brief made
it conditional on this measurement; the measurement says no.

### 2. `API_JSON_BODY_LIMIT_BYTES` is not the binding ceiling — and today it lies.

This is the finding that needs a decision, and it is the reverse of what the brief
anticipated.

For a **gzipped** client the binding limit is `API_JSON_BODY_LIMIT_BYTES` (10 MiB),
reached long before Lambda's cap. Fine.

For an **uncompressed** client the binding limit is Lambda's cap, at **5.32 MiB of
raw CDM** — which is _below_ the 10 MiB the API advertises. On the Lambda target
the platform would accept, by its own configuration, payloads the runtime rejects
at the edge. The client gets an opaque failure from infrastructure the application
never sees, so no `413`, no domain error, no audit entry, and nothing in the
request log.

**The gap is not a Lambda problem; it is a configuration-honesty problem.** Options,
in the additive/config-driven spirit the program requires:

- Lower `API_JSON_BODY_LIMIT_BYTES` to ~5 MiB on the Lambda target only, so the app
  rejects with a real `413` before the runtime does. Default for every other target
  is untouched.
- Or require `Content-Encoding: gzip` on the sync ingress route for that target and
  reject uncompressed bodies above the raw ceiling with a domain error.

Recommended: the first, because it is one config value and needs no route-specific
behavior. Either way this is **slice 5 or 6's decision**, informed by this number;
it is not slice 1's to take.

### 3. Base64 expansion is a real cost the brief did not carry.

A gzip body reaches Lambda base64-encoded, costing +33% before anything else. It
does not change the conclusion — 22.8% × 1.33 is still comfortable — but it must be
in the arithmetic of any future ceiling. Sizing against raw gzip bytes overstates
headroom by a third.

### 4. The app does not return a clean `413` today — verified, not inferred.

Found while probing the running e2e container to write the boot-parity oracle, so
it is observed behavior rather than a reading of the code:

| Request                               | Status | Body                     |
| ------------------------------------- | -----: | ------------------------ |
| Body over `API_JSON_BODY_LIMIT_BYTES` |  `500` | `code: INTERNAL_ERROR`   |
| Malformed JSON body                   |  `500` | `code: INTERNAL_ERROR`   |
| Valid body, invalid fields            |  `400` | `code: VALIDATION_ERROR` |

`body-parser` raises `PayloadTooLargeError` (logged as `API Error` with that type)
and `SyntaxError` for a malformed body, and the error handler maps neither — both
fall through to a generic 500. So the client that most needs to be told "your
payload is too big" is told "something went wrong on our end".

This is **pre-existing and not caused by this story**, and it is out of slice 1's
scope to fix. It matters here because it compounds finding 2: whichever limit ends
up binding on the Lambda target, exceeding it currently produces an unactionable 500. Whoever takes finding 2's decision should map these two `body-parser` errors
to `413` and `400` at the same time.

`tests/e2e/boot-parity.e2e.test.ts` pins the current 500s so the fix is a
deliberate, visible change rather than a silent one.

## What would change these numbers

Stated so a future reader can tell whether the recorded ceiling still applies:

- **Richer free text.** Real descriptions pulled from a production system compress
  differently than a word-pool sentence. More prose compresses _better_; the
  fixtures are conservative here.
- **Larger or more varied metadata.** `metadata` is an untyped `JSON` column. A
  tenant storing blobs, encoded documents, or base64 content in it would push the
  ratio toward 1:1 and invalidate finding 1 outright. This is the most plausible
  way the ceiling breaks.
- **`searchable` on the wire.** Omitted here because
  `startProjectSyncRequestSchema` does not accept it and REST ingress is the
  constraint. A **GraphQL** client sending `searchable` pays more than this table
  shows — GraphQL ingress was not measured.
- **CDM shape changes.** Any new field on a CDM entity changes both the raw size and
  the ratio. Re-run `pnpm --filter grant-api measure:cdm-gzip` and update the table.

## Consumers

- Brief criterion "gzip compression ratio measured on real CDM export fixtures" — met.
- Brief criterion "`API_JSON_BODY_LIMIT_BYTES` reviewed as the new binding ceiling" —
  answered by findings 2 and 4; the decision belongs to a later slice.
- Deferred payload-by-reference go/no-go — **no-go**, finding 1.
- Slice 3's `project-sync` 15-minute-ceiling ADR: payload size bounds import
  duration, so these sizes are an input to it.
