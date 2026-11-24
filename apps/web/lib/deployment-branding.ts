/**
 * Deployment branding from `GET /api/config` (`branding`): header token overrides per theme mode
 * and an optional logo. The API validates `BRANDING_*` at startup; this module checks the payload
 * again before any of it reaches a stylesheet or an `<img src>`, because what lands in CSS text
 * must never be able to close the rule it sits in.
 *
 * See `docs/deployment/branding.md` and ADR 0015.
 */

type BrandingMode = 'light' | 'dark';

/** Tokens a deployment may override today, without the leading `--` (ADR 0015). */
const BRANDING_TOKENS = ['header', 'header-foreground'] as const;
type BrandingToken = (typeof BRANDING_TOKENS)[number];

type BrandingTokenOverrides = Partial<Record<BrandingToken, string>>;

export interface DeploymentBrandingLogo {
  lightUrl: string;
  /** Null shows `lightUrl` in dark mode too. */
  darkUrl: string | null;
  /** Null uses the localised fallback. */
  alt: string | null;
}

export interface DeploymentBranding {
  logo: DeploymentBrandingLogo | null;
  theme: Record<BrandingMode, BrandingTokenOverrides>;
}

export const DEPLOYMENT_BRANDING_DEFAULTS: DeploymentBranding = {
  logo: null,
  theme: { light: {}, dark: {} },
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

function tokenOverrides(value: unknown): BrandingTokenOverrides {
  if (!isRecord(value)) return {};
  const overrides: BrandingTokenOverrides = {};
  for (const token of BRANDING_TOKENS) {
    const color = value[token];
    if (typeof color === 'string' && HEX_COLOR.test(color)) overrides[token] = color.toLowerCase();
  }
  return overrides;
}

/** Keeps only what is well-formed; anything else reads as "not branded". */
export function parseDeploymentBranding(value: unknown): DeploymentBranding {
  if (!isRecord(value)) return DEPLOYMENT_BRANDING_DEFAULTS;
  const theme = isRecord(value.theme) ? value.theme : {};
  let logo: DeploymentBrandingLogo | null = null;
  if (isRecord(value.logo)) {
    const lightUrl = httpsUrl(value.logo.lightUrl);
    if (lightUrl) {
      const alt = typeof value.logo.alt === 'string' ? value.logo.alt.trim() : '';
      logo = { lightUrl, darkUrl: httpsUrl(value.logo.darkUrl), alt: alt || null };
    }
  }
  return {
    logo,
    theme: { light: tokenOverrides(theme.light), dark: tokenOverrides(theme.dark) },
  };
}

/** True when a mode sets the header background, which makes the header opaque. */
export function hasHeaderBackground(branding: DeploymentBranding): boolean {
  return Boolean(branding.theme.light.header || branding.theme.dark.header);
}

function declarations(overrides: BrandingTokenOverrides): string {
  const lines = BRANDING_TOKENS.filter((token) => overrides[token]).map(
    (token) => `--${token}:${overrides[token]};`
  );
  // Secondary header text (version, links) follows the configured foreground, so the pair the
  // API checked for contrast is the only one the header shows.
  if (overrides['header-foreground']) {
    lines.push(`--header-muted-foreground:${overrides['header-foreground']};`);
  }
  return lines.join('');
}

/**
 * The stylesheet that applies the overrides, or null when there are none. Light rules are scoped
 * to `:root:not(.dark)` so they never leak into dark mode; the `dark` class is set before first
 * paint by the theme script in `app/layout.tsx`, so both modes, and `system`, switch with no
 * script of their own and no flash.
 */
export function brandingStyleSheet(branding: DeploymentBranding): string | null {
  const light = declarations(branding.theme.light);
  const dark = declarations(branding.theme.dark);
  const rules = [light && `:root:not(.dark){${light}}`, dark && `:root.dark{${dark}}`].filter(
    Boolean
  );
  return rules.length ? rules.join('\n') : null;
}
