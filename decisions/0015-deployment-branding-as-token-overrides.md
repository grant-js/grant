# 0015 — Deployment branding is a set of design-token overrides per theme mode, sent at runtime

- **Status**: Proposed
- **Date**: 2026-11-24
- **Context**: the web header's colours and logo per deployment (step 1); full theme overrides are a later step this record shapes but does not build
- **Related**: [Branding](/deployment/branding), [Environment setup](/deployment/environment), `apps/web/app/globals.css`
- **Scope**: the web app's app header. The OAuth and sign-in pages keep their per-project branding (`primaryColor`, `themeMode`, picture), which is project data, not deployment configuration.
- **Compatibility**: additive. Seven optional `BRANDING_*` variables on the API, one new field (`branding`) in `GET /api/config`, three new CSS tokens. With nothing set, the app is unchanged.

## Context

An organisation that runs Grant wants its deployment to look like its own product: its colours in the header and its logo in the logo slot, in light and dark mode. Grant must stay generic. Nothing about one adopter belongs in the repository, and the web image is built once and deployed to many installs, so branding cannot be a build-time input.

Two existing mechanisms decide the shape:

- **Runtime config.** The web app already learns deployment settings (docs URL, enabled API surfaces, the upload limit) from the API's public `GET /api/config` (`apps/api/src/rest/routes/config.routes.ts`), fed by environment variables in `@grantjs/env`. Branding is another deployment setting.
- **Design tokens.** The web app's colours are CSS custom properties (`--background`, `--foreground`, `--primary`, … in `apps/web/app/globals.css`), the shadcn token set, switched between modes by the `dark` class on `<html>`, which a script sets before first paint (`apps/web/app/layout.tsx`).

## Decision

**A deployment's branding is a map of design-token overrides per theme mode, plus a logo, validated by the API at startup and applied by the web app as CSS custom properties. The header gets tokens of its own, so it can be branded without touching the rest of the theme.**

### 1. Contract: `branding` in `GET /api/config`

```json
{
  "logo": { "lightUrl": "https://…", "darkUrl": "https://…" | null, "alt": "…" | null } | null,
  "theme": {
    "light": { "<token>": "#rrggbb", … },
    "dark":  { "<token>": "#rrggbb", … }
  }
}
```

- **`theme` is keyed by token name** (without `--`), not by a field per setting. Step 1 allows two tokens, `header` and `header-foreground`. A new token is a new key in an allowlist on both sides, not a new field in the contract.
- **Values are normalised `#rrggbb`.** The API accepts `#rgb`, `#rrggbb`, `rgb()` and `hsl()`, and refuses transparency, named colours and other colour spaces, so contrast can be computed for every value it sends.
- **Empty means default.** An unbranded install returns `{ "logo": null, "theme": { "light": {}, "dark": {} } }`.

### 2. The API validates once, at startup, and never refuses to boot over branding

`resolveDeploymentBranding` (`apps/api/src/lib/deployment-branding.lib.ts`) runs when the config is built. An invalid value is dropped with a warning, logged after the configuration summary. It also enforces contrast: each mode's header pair must reach WCAG AA (4.5:1). A failing foreground is replaced by the default foreground, or by black or white when that fails too, and the replacement is logged. The web app receives only pairs that pass. Branding is cosmetic, so a typo must not take an identity provider down.

### 3. The web app re-checks the payload and applies it as token overrides

`parseDeploymentBranding` (`apps/web/lib/deployment-branding.ts`) keeps only allowlisted tokens with `#rrggbb` values and `https:` logo URLs, so nothing written into the stylesheet can end its rule. `RuntimeConfigProvider` renders one `<style>` element:

```css
:root:not(.dark) {
  --header: …;
  --header-foreground: …;
}
:root.dark {
  --header: …;
  --header-foreground: …;
}
```

Because the overrides are scoped by the same `dark` class the theme already uses, light, dark and `system` switch with no branding code of their own. The locale layout keeps its loader up until `/api/config` has answered, failed or timed out (3 s), so the default header never paints before the branded one.

### 4. Component tokens, defaulting to the page tokens

`--header`, `--header-foreground` and `--header-muted-foreground` default to `var(--background)`, `var(--foreground)` and `var(--muted-foreground)`. Inside `.app-header` the page tokens are pointed back at the header's, so the outline buttons, links and secondary text in the header follow the branded pair, while menus that open in portals keep the page tokens. A branded background makes the header opaque, because contrast was checked against that colour and not against whatever scrolls under a translucent header.

### 5. Logo

A custom logo takes the main slot and Grant's logo moves next to the version, small and coloured by `currentColor`. A dark logo is optional. With one, both images are in the page and CSS shows the right one (`[.dark_&]:hidden`, `hidden [.dark_&]:block`, keyed on the `dark` class like the tokens; Tailwind's `dark:` variant follows `prefers-color-scheme` in this app). If the image fails to load, the header falls back to Grant's logo. The logo is a plain `<img>`, not `next/image`, because the URL is known only at runtime.

## Step 2, proposed: the rest of the theme

The same contract takes the full shadcn token set:

- **Allowlist more tokens.** Extend the allowlist on both sides with the semantic tokens in `globals.css` (`primary`, `primary-foreground`, `secondary`, `accent`, `ring`, `sidebar-*`, …). The stylesheet writer is unchanged, since it already writes one declaration per key.
- **One variable per mode.** Take them from one JSON variable per mode, for example `BRANDING_THEME_LIGHT='{"primary":"#…","primary-foreground":"#…"}'`, rather than one variable per token. The seven step-1 variables stay as the short form for the header and take precedence over the same keys in the JSON.
- **Contrast for every pair.** Check every `x` / `x-foreground` pair the same way as the header, with the same fallback and warnings.
- **Accept oklch.** Accept `oklch()` input, since the defaults are written in it. That needs a gamut-mapped conversion for the contrast check.
- **Keep scope.** Keep the OAuth pages' per-project branding separate. A project's `primaryColor` applies on top of the deployment theme on those pages, as today.

Step 2 is not built here. It is worth its own record if it changes this contract rather than extending it.

## Consequences

- **One more request before first paint.** It runs in parallel with the message bundle, which the layout already waits for. If the API is slow, the loader waits at most 3 s, then the app renders unbranded.
- **The logo is loaded from the adopter's host.** That host sees the users' IP addresses and referrers. A deployment that serves its logo from its own origin avoids this. A Content Security Policy that restricts `img-src` must allow the logo's host.
- **The default colours are written twice.** The API's contrast check needs the default header colours (`DEFAULT_HEADER_COLORS`, converted from the oklch tokens). A change to `--background` or `--foreground` in `globals.css` must update them. A unit test asserts that the default pairs pass AA.

## Alternatives considered

- **Build-time variables (`NEXT_PUBLIC_*`).** Rejected: the image is built once for many installs, and the project removed build-time inlining.
- **A setting stored in the database and edited in the UI.** Deferred: it needs an owner (platform administrator) and an audit trail. Deployment configuration is what step 1 asks for, and a stored setting could later feed the same contract.
- **Fixed fields (`headerBackgroundLight`, …) in the response.** Rejected: every token in step 2 would be a contract change. A token map grows by allowlist.
- **Hard-coded colours on the header element (`style={{ background }}`).** Rejected: it bypasses the design system, needs JavaScript to follow the theme (a flash on `system` changes), and gives step 2 nothing to build on.
