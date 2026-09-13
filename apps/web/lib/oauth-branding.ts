import type { CSSProperties } from 'react';

export const GRANT_PRIMARY_COLOR = '#2563EB';

/** OAuth client title: app name, else the owning project. Grant is the IdP, not the client. */
export function oauthClientDisplayName(
  appName?: string | null,
  projectName?: string | null,
  fallback = 'this app'
): string {
  return appName?.trim() || projectName?.trim() || fallback;
}

const HEX_PATTERN = /^#([0-9A-Fa-f]{6})$/;

type Rgb = { r: number; g: number; b: number };

function hexToRgb(hex: string): Rgb | null {
  const match = HEX_PATTERN.exec(hex.trim());
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function channelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(rgb: Rgb): number {
  return (
    0.2126 * channelToLinear(rgb.r) +
    0.7152 * channelToLinear(rgb.g) +
    0.0722 * channelToLinear(rgb.b)
  );
}

function contrastingForeground(hex: string): '#000000' | '#FFFFFF' {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#FFFFFF';
  return relativeLuminance(rgb) > 0.4 ? '#000000' : '#FFFFFF';
}

function mix(channel: number, toward: number, amount: number): number {
  return Math.round(channel + (toward - channel) * amount);
}

function rgbCss(rgb: Rgb): string {
  return `rgb(${rgb.r} ${rgb.g} ${rgb.b})`;
}

export function radialGradientFromHex(hex: string): string {
  const rgb = hexToRgb(hex) ?? { r: 37, g: 99, b: 235 };
  const light = { r: mix(rgb.r, 255, 0.35), g: mix(rgb.g, 255, 0.35), b: mix(rgb.b, 255, 0.35) };
  const dark = { r: mix(rgb.r, 0, 0.25), g: mix(rgb.g, 0, 0.25), b: mix(rgb.b, 0, 0.25) };
  const darker = { r: mix(rgb.r, 0, 0.45), g: mix(rgb.g, 0, 0.45), b: mix(rgb.b, 0, 0.45) };
  return `radial-gradient(ellipse at center, ${rgbCss(light)} 0%, ${rgbCss(rgb)} 45%, ${rgbCss(dark)} 80%, ${rgbCss(darker)} 100%)`;
}

export const OAUTH_PERMISSIONS_PREVIEW_LIMIT = 5;

export function previewOAuthScopes<T>(
  scopes: T[],
  expanded: boolean,
  limit = OAUTH_PERMISSIONS_PREVIEW_LIMIT
): T[] {
  if (expanded || scopes.length <= limit) return scopes;
  return scopes.slice(0, limit);
}

export function oauthPrimaryButtonStyle(hex: string | null | undefined): CSSProperties | undefined {
  if (!hex || !HEX_PATTERN.test(hex)) return undefined;
  return {
    backgroundColor: hex,
    color: contrastingForeground(hex),
  };
}
