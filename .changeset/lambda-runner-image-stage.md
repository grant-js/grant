---
'grant-api': minor
---

Add a `runner-lambda` Docker build target that layers the AWS Lambda Web Adapter onto the existing runner image.

Built only with `--target runner-lambda`; the default build is unchanged and still produces the Kubernetes/Compose image. The Lambda image is the existing runner plus one binary, so the two cannot drift apart.
