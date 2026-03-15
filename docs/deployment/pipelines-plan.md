# Pipelines: Versioning, Package Publish, Image Publish, Demo Deploy (refined)

Refined plan for the four pipeline stages: versioning, package publishing, image publishing, and demo deployment.

---

## Release surfaces (summary table)

| Artifact         | Trigger                                  | Versioning                        |
| ---------------- | ---------------------------------------- | --------------------------------- |
| npm packages     | changesets (merge "Version packages" PR) | semver                            |
| docker images    | push to main                             | demo tags (`:demo`, `:demo-$sha`) |
| demo environment | deploy workflow                          | latest demo                       |
| future releases  | version PR merge                         | semver images (`:1.4.0`)          |

**Version source** (for contributors — prevents confusion that images follow semver today):

| Artifact         | Version source            |
| ---------------- | ------------------------- |
| npm packages     | Changesets                |
| Docker images    | Git SHA (`:demo-$sha`)    |
| Demo environment | `:demo` tag (latest main) |

---

## 1. Versioning

- **Process:** Add changesets → auto "chore: version packages" PR → merge → version bump + npm publish. Only npm packages are versioned (schema, client, server, cli); apps are in changeset ignore list.
- **Clarification for contributors:** When the "chore: version packages" PR is merged, the `.changeset/*` files included in that PR are **removed as part of the version commit**. They do not accumulate forever.
- **Doc:** Add contributor-facing doc (when to `pnpm changeset`, what gets versioned). Optional later: single platform version (root or VERSION file) for semver image tags.

---

## 2. Package publishing

- No changes. Handled by `release.yml` and `pnpm release`.

---

## 3. Image publishing — matrix + cache

**Use a matrix strategy** instead of separate build steps.

- **Why:** Parallel builds, less duplicated YAML, easier to add services later, consistent tagging.
- **Structure:**

```yaml
strategy:
  matrix:
    include:
      - name: grant-api
        dockerfile: apps/api/Dockerfile
      - name: grant-web
        dockerfile: apps/web/Dockerfile
      - name: grant-docs
        dockerfile: docs/Dockerfile
      - name: example-nextjs
        dockerfile: packages/@grantjs/client/examples/nextjs/Dockerfile
```

- **Tags (dynamic):**
  - `ghcr.io/${{ github.repository }}/${{ matrix.name }}:demo`
  - `ghcr.io/${{ github.repository }}/${{ matrix.name }}:demo-${{ github.sha }}`
- **Build cache:** Keep (or add) on the docker build step:
  - `cache-from: type=gha`
  - `cache-to: type=gha,mode=max`
- **Versioned images (later):** When version PR merges, optionally build and push with semver tag (e.g. `:1.4.0`). Do not mix versioning with demo deploy; separation is correct. For now: `:demo` and `:demo-$sha` only.

**Naming consistency:** Use the same image names in **three places** — GHCR tags, `docker-compose.demo.yml`, and deployment commands — to avoid deployment bugs:

| Image name                              | Tags                  |
| --------------------------------------- | --------------------- |
| `ghcr.io/<owner>/<repo>/grant-api`      | `:demo`, `:demo-$sha` |
| `ghcr.io/<owner>/<repo>/grant-web`      | `:demo`, `:demo-$sha` |
| `ghcr.io/<owner>/<repo>/grant-docs`     | `:demo`, `:demo-$sha` |
| `ghcr.io/<owner>/<repo>/example-nextjs` | `:demo`, `:demo-$sha` |

---

## 3b. Image vs environment (tag semantics)

**Principle:** Image = application artifact. Environment = runtime configuration. The same image should run everywhere; you do not need a demo-specific image.

- **Images** (e.g. `ghcr.io/…/grant-api:demo`) do **not** know about "demo". They are environment-agnostic. The demo environment is defined by `.env.demo`, `docker-compose.demo.yml`, and nginx — i.e. **image + env_file = environment**.
- **What `:demo` means:** The `:demo` tag is not about configuration. It is about **which commit** the demo environment tracks: **latest main**. Flow: main commit → build images → tag `:demo` → deploy demo. So `:demo` = "latest main".
- **Traceability:** `:demo-$sha` refers to the same build as `:demo` for that run; use it for traceability (e.g. logs, debugging).
- **Do not:** Build per-environment image names (`grant-api-demo`, `grant-api-prod`, `grant-api-staging`) or bake `.env.demo` inside the image. That leads to image explosion, configuration drift, and broken reproducibility.

---

## 4. Deployment (demo) — stack deploy + explicit image

**Do not rely only on `docker service update --force`.** That only triggers a restart; if the tag hasn’t changed locally, Swarm may reuse the old digest. Using explicit `--image` is more deterministic and guarantees Swarm pulls the new digest.

**Preferred: redeploy the entire stack**

- Run on the server (via SSH in the deploy job):
  ```bash
  docker stack deploy -c docker-compose.demo.yml grant-demo
  ```
- **Advantages:** Declarative, new services auto-deployed, Swarm performs rolling updates. No need to update each service by hand.

**If updating services individually** (e.g. for a lighter step), use explicit `--image` so Swarm pulls the new digest:

```bash
docker pull ghcr.io/<owner>/<repo>/grant-api:demo
docker service update --image ghcr.io/<owner>/<repo>/grant-api:demo grant-demo_api
```

Repeat for web, docs, example-nextjs. Recommendation: use **stack deploy** in the deploy job so one command stays the source of truth. The current service-update approach is acceptable for now; moving to `docker stack deploy` is the cleanest Swarm pattern (declarative, new services auto-deploy, fewer commands).

**GHCR authentication on the server**

- Server must authenticate to GHCR or pulls will fail (deploy job can silently fail).
- **One-time setup:** `docker login ghcr.io` with a PAT that has `read:packages`.
- **Document this** in deployment docs (e.g. docker.md or a "Server setup" section).

---

## 5. Concurrency control

Add to the **deploy** workflow so two pushes to main don’t deploy simultaneously (avoids race conditions):

```yaml
concurrency:
  group: deploy
  cancel-in-progress: true
```

---

## 6. Workflow diagram (correct flow)

On **push to main**, three workflows run **independently** (no dependency between them). Deploy happens even when no package release occurs — that’s correct behavior.

```
push to main
   ├── ci.yml
   ├── deploy.yml
   └── release.yml
```

---

## 7. nginx sample and docs

- Add `nginx-gateway.conf` as a sample (e.g. `docs/deployment/nginx-gateway.conf.example`) and reference it in docker.md as an example for routing a single APP_URL to api/web/docs/example.
- In docker.md (or a "Pipelines / CI-CD" section): versioning → package publish; image publish (matrix, four images, demo tags); demo deploy (stack deploy or explicit service update); GHCR login on server.

---

## Implementation checklist (refined)

| #   | Task                                 | Notes                                                                                                                                                                                                                      |
| --- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Document versioning                  | New doc: changesets, "Version packages" PR, what gets versioned; optional platform version later.                                                                                                                          |
| 2   | Refactor image build to matrix       | Single job with matrix (grant-api, grant-web, grant-docs, example-nextjs); dynamic dockerfile and tags; keep GHA build cache.                                                                                              |
| 3   | Add concurrency to deploy            | `concurrency: group: deploy, cancel-in-progress: true`.                                                                                                                                                                    |
| 4   | Deploy job: stack deploy             | SSH to server; run `docker stack deploy -c docker-compose.demo.yml grant-demo`. Document GHCR one-time `docker login` with PAT (read:packages).                                                                            |
| 5   | Add "Release surfaces" table to docs | In docker.md or pipelines doc: artifact, trigger, versioning (npm, images, demo env, future semver images).                                                                                                                |
| 6   | nginx sample + doc note              | Copy nginx-gateway.conf to docs/deployment as sample; mention in docker.md.                                                                                                                                                |
| 7   | (Later) Versioned image publish      | On version PR merge, build and push images with semver tag; do not mix with demo deploy.                                                                                                                                   |
| 8   | stack-deploy.sh `update` command     | Add an `update` (or reuse `up`) command to `scripts/stack-deploy.sh` so the deploy step (e.g. `docker stack deploy -c docker-compose.demo.yml grant-demo`) is scriptable from one place; CI or SSH deploy job can call it. |
