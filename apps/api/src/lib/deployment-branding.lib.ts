/**
 * Deployment branding (`BRANDING_*`): the app header's colours and logo for one install.
 *
 * Parsed once at startup from the environment and returned to the web app by `GET /api/config`.
 * Every value is optional; an invalid one is dropped with a warning, so a typo never stops the
 * API from booting and never reaches the browser. Colours leave here normalised to `#rrggbb`,
 * logos as absolute `https:` URLs, which is what lets the web app write them into CSS and
 * `<img src>` without re-parsing.
 *
 * Colours are expressed as overrides of the web app's design tokens (`--header`,
 * `--header-foreground`), keyed by theme mode. ADR 0015 describes how the same shape takes the
 * rest of the theme tokens later.
 */

export type BrandingMode = 'light' | 'dark';

/** Header token overrides for one theme mode. A missing key keeps the design-system default. */
interface HeaderTokenOverrides {
  header?: string;
  'header-foreground'?: string;
}

interface DeploymentBrandingLogo {
  /** Logo for light mode, and for dark mode when no dark logo is set. */
  lightUrl: string;
  /** Logo for dark mode; null falls back to `lightUrl`. */
  darkUrl: string | null;
  /** Alt text; null lets the web app use its own localised fallback. */
  alt: string | null;
}

interface DeploymentBranding {
  logo: DeploymentBrandingLogo | null;
  theme: Record<BrandingMode, HeaderTokenOverrides>;
}

/** Raw `BRANDING_*` values, already trimmed; undefined when unset or blank. */
export interface DeploymentBrandingInput {
  BRANDING_HEADER_BACKGROUND_LIGHT?: string;
  BRANDING_HEADER_BACKGROUND_DARK?: string;
  BRANDING_HEADER_FOREGROUND_LIGHT?: string;
  BRANDING_HEADER_FOREGROUND_DARK?: string;
  BRANDING_LOGO_URL_LIGHT?: string;
  BRANDING_LOGO_URL_DARK?: string;
  BRANDING_LOGO_ALT?: string;
}

export interface ResolvedDeploymentBranding {
  branding: DeploymentBranding;
  /** One line per value that was ignored or replaced; logged at startup. */
  warnings: string[];
}

/** WCAG 2.x AA minimum for normal-size text; the header's text is 12–14px. */
export const WCAG_AA_MIN_CONTRAST = 4.5;

/** Longest accepted `BRANDING_LOGO_ALT`; longer text is cut, since it is read aloud on every page. */
export const LOGO_ALT_MAX_LENGTH = 120;

/**
 * The web app's default header colours (`--background` and `--foreground` in
 * `apps/web/app/globals.css`, converted from oklch). Used only to judge contrast when a
 * deployment sets one side of a pair; keep in step with the stylesheet.
 */
export const DEFAULT_HEADER_COLORS: Record<
  BrandingMode,
  { background: string; foreground: string }
> = {
  light: { background: '#ffffff', foreground: '#0a0a0a' },
  dark: { background: '#0a0a0a', foreground: '#fafafa' },
};

const EMPTY_BRANDING: DeploymentBranding = { logo: null, theme: { light: {}, dark: {} } };

type Rgb = { r: number; g: number; b: number };

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const NUMBER = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)`;
const RGB_PATTERN = new RegExp(
  String.raw`^rgb\(\s*(${NUMBER})(%?)\s*(?:,\s*|\s+)(${NUMBER})(%?)\s*(?:,\s*|\s+)(${NUMBER})(%?)\s*\)$`,
  'i'
);
const HSL_PATTERN = new RegExp(
  String.raw`^hsl\(\s*(${NUMBER})(?:deg)?\s*(?:,\s*|\s+)(${NUMBER})%\s*(?:,\s*|\s+)(${NUMBER})%\s*\)$`,
  'i'
);

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.min(1, Math.max(0, s / 100));
  const light = Math.min(1, Math.max(0, l / 100));
  const k = (n: number) => (n + hue / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: clampByte(f(0) * 255), g: clampByte(f(8) * 255), b: clampByte(f(4) * 255) };
}

function toHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Parses an opaque CSS colour: `#rgb`, `#rrggbb`, `rgb()` or `hsl()` (comma or space syntax).
 * Returns it as lowercase `#rrggbb`, or null for anything else. Alpha, named colours and other
 * colour spaces are refused, because the header's contrast cannot be judged for them.
 */
export function parseBrandingColor(raw: string): string | null {
  const value = raw.trim();
  const hex = HEX_PATTERN.exec(value);
  if (hex) {
    const digits = hex[1].toLowerCase();
    return digits.length === 3
      ? `#${digits
          .split('')
          .map((d) => d + d)
          .join('')}`
      : `#${digits}`;
  }
  const rgb = RGB_PATTERN.exec(value);
  if (rgb) {
    const channel = (n: string, percent: string) =>
      clampByte(percent ? (Number(n) / 100) * 255 : Number(n));
    return toHex({
      r: channel(rgb[1], rgb[2]),
      g: channel(rgb[3], rgb[4]),
      b: channel(rgb[5], rgb[6]),
    });
  }
  const hsl = HSL_PATTERN.exec(value);
  if (hsl) {
    return toHex(hslToRgb(Number(hsl[1]), Number(hsl[2]), Number(hsl[3])));
  }
  return null;
}

/** Accepts an absolute `https:` URL without credentials; returns it normalised, else null. */
export function parseBrandingLogoUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  return url.toString();
}

function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function channelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

/** WCAG 2.x contrast ratio between two `#rrggbb` colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function formatRatio(ratio: number): string {
  return `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`;
}

/** Black or white, whichever contrasts more; at least 4.58:1 against any opaque colour. */
function blackOrWhiteFor(background: string): string {
  return contrastRatio('#000000', background) >= contrastRatio('#ffffff', background)
    ? '#000000'
    : '#ffffff';
}

function readColor(
  name: keyof DeploymentBrandingInput,
  raw: string | undefined,
  warnings: string[]
): string | undefined {
  if (raw === undefined) return undefined;
  const parsed = parseBrandingColor(raw);
  if (!parsed) {
    warnings.push(
      `${name} is ignored: "${raw}" is not an opaque colour (use #rrggbb, #rgb, rgb() or hsl()).`
    );
    return undefined;
  }
  return parsed;
}

function resolveMode(
  mode: BrandingMode,
  input: DeploymentBrandingInput,
  warnings: string[]
): HeaderTokenOverrides {
  const suffix = mode === 'light' ? 'LIGHT' : 'DARK';
  const bgName = `BRANDING_HEADER_BACKGROUND_${suffix}` as const;
  const fgName = `BRANDING_HEADER_FOREGROUND_${suffix}` as const;
  const background = readColor(bgName, input[bgName], warnings);
  const foreground = readColor(fgName, input[fgName], warnings);
  if (!background && !foreground) return {};

  const defaults = DEFAULT_HEADER_COLORS[mode];
  const effectiveBackground = background ?? defaults.background;

  if (foreground) {
    const ratio = contrastRatio(foreground, effectiveBackground);
    if (ratio >= WCAG_AA_MIN_CONTRAST) {
      return background
        ? { header: background, 'header-foreground': foreground }
        : { 'header-foreground': foreground };
    }
    warnings.push(
      `${fgName} is ignored: ${foreground} on ${effectiveBackground} has contrast ${formatRatio(ratio)}, ` +
        `below WCAG AA ${WCAG_AA_MIN_CONTRAST}:1.`
    );
  }

  // Only a foreground was set, and it failed: the default pair stays as it is.
  if (!background) return {};

  const defaultRatio = contrastRatio(defaults.foreground, background);
  if (defaultRatio >= WCAG_AA_MIN_CONTRAST) {
    return { header: background, 'header-foreground': defaults.foreground };
  }
  const fallback = blackOrWhiteFor(background);
  warnings.push(
    `${bgName} ${background}: the default ${mode} header text (${defaults.foreground}) has contrast ` +
      `${formatRatio(defaultRatio)}, below WCAG AA ${WCAG_AA_MIN_CONTRAST}:1; using ${fallback} ` +
      `(${formatRatio(contrastRatio(fallback, background))}). Set ${fgName} to choose it.`
  );
  return { header: background, 'header-foreground': fallback };
}

function readLogoUrl(
  name: 'BRANDING_LOGO_URL_LIGHT' | 'BRANDING_LOGO_URL_DARK',
  raw: string | undefined,
  warnings: string[]
): string | null {
  if (raw === undefined) return null;
  const parsed = parseBrandingLogoUrl(raw);
  if (!parsed) {
    warnings.push(`${name} is ignored: it must be an absolute https:// URL without credentials.`);
  }
  return parsed;
}

function resolveLogo(
  input: DeploymentBrandingInput,
  warnings: string[]
): DeploymentBrandingLogo | null {
  const lightUrl = readLogoUrl('BRANDING_LOGO_URL_LIGHT', input.BRANDING_LOGO_URL_LIGHT, warnings);
  const darkUrl = readLogoUrl('BRANDING_LOGO_URL_DARK', input.BRANDING_LOGO_URL_DARK, warnings);
  let alt = input.BRANDING_LOGO_ALT ?? null;

  if (!lightUrl) {
    if (darkUrl) {
      warnings.push(
        'BRANDING_LOGO_URL_DARK is ignored: it needs BRANDING_LOGO_URL_LIGHT, which every mode falls back to.'
      );
    }
    if (alt !== null && input.BRANDING_LOGO_URL_LIGHT === undefined) {
      warnings.push('BRANDING_LOGO_ALT is ignored: no BRANDING_LOGO_URL_LIGHT is set.');
    }
    return null;
  }
  if (alt !== null && alt.length > LOGO_ALT_MAX_LENGTH) {
    warnings.push(`BRANDING_LOGO_ALT is cut to ${LOGO_ALT_MAX_LENGTH} characters.`);
    alt = alt.slice(0, LOGO_ALT_MAX_LENGTH).trim();
  }
  return { lightUrl, darkUrl, alt };
}

/** Builds the deployment's branding from `BRANDING_*`; never throws. */
export function resolveDeploymentBranding(
  input: DeploymentBrandingInput
): ResolvedDeploymentBranding {
  const warnings: string[] = [];
  const logo = resolveLogo(input, warnings);
  const light = resolveMode('light', input, warnings);
  const dark = resolveMode('dark', input, warnings);
  if (!logo && !Object.keys(light).length && !Object.keys(dark).length) {
    return { branding: EMPTY_BRANDING, warnings };
  }
  return { branding: { logo, theme: { light, dark } }, warnings };
}
