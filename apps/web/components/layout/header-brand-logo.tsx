'use client';

import { useState } from 'react';

import { Logo } from '@/components/common';
import type { DeploymentBrandingLogo } from '@/lib/deployment-branding';

interface HeaderBrandLogoProps {
  logo: DeploymentBrandingLogo;
  /** Used when the deployment sets no `BRANDING_LOGO_ALT`; the logo is the home link's content. */
  fallbackAlt: string;
}

const IMG_CLASS = 'h-8 w-auto max-w-48 object-contain';

// Keyed on the `dark` class the theme provider sets, like the colour tokens, not on Tailwind's
// `dark:` variant, which in this app follows `prefers-color-scheme` and so ignores a theme the
// user picked that differs from the system's.
const SHOW_IN_LIGHT = '[.dark_&]:hidden';
const SHOW_IN_DARK = 'hidden [.dark_&]:block';

/**
 * The deployment's logo (`BRANDING_LOGO_URL_*`) in the header's main logo slot. With a dark logo
 * both images are in the page and CSS shows the one for the current theme, so a theme change,
 * `system` included, swaps them with no script and no flash. If an image fails to load, the
 * header shows Grant's own logo rather than a broken image.
 */
export function HeaderBrandLogo({ logo, fallbackAlt }: HeaderBrandLogoProps) {
  const [failed, setFailed] = useState(false);
  const alt = logo.alt ?? fallbackAlt;
  const onError = () => setFailed(true);

  if (failed) return <Logo size={75} className="mt-2" />;

  // Plain <img>, not next/image: the URL is the deployment's, known only at runtime, so it cannot
  // be listed in `images.remotePatterns` at build time.
  if (!logo.darkUrl || logo.darkUrl === logo.lightUrl) {
    return <img src={logo.lightUrl} alt={alt} className={IMG_CLASS} onError={onError} />;
  }

  return (
    <>
      <img
        src={logo.lightUrl}
        alt={alt}
        className={`${IMG_CLASS} ${SHOW_IN_LIGHT}`}
        data-brand-logo="light"
        onError={onError}
      />
      <img
        src={logo.darkUrl}
        alt={alt}
        className={`${IMG_CLASS} ${SHOW_IN_DARK}`}
        data-brand-logo="dark"
        onError={onError}
      />
    </>
  );
}
