'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BookOpen, FileJson, Globe, Menu, Moon, Network, Sun, X } from 'lucide-react';

import { DemoModeDialogProvider, DemoModeDialogTrigger, Logo } from '@/components/common';
import { NotificationBell } from '@/components/features/notifications';
import { LanguageSwitcher, ThemeToggle } from '@/components/features/settings';
import { HeaderBrandLogo } from '@/components/layout/header-brand-logo';
import { useOAuthBrandingTheme } from '@/components/layout/oauth-branding-context';
import { useRuntimeConfig } from '@/components/providers/runtime-config-provider';
import { Button } from '@/components/ui/button';
import { Link, usePathname } from '@/i18n/navigation';
import { shouldShowNotificationBell } from '@/lib/auth';
import { getApiDocsUrl, getAppVersion, getDocsUrl, getGraphqlPlaygroundUrl } from '@/lib/constants';
import { hasHeaderBackground } from '@/lib/deployment-branding';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

export function Header() {
  const t = useTranslations('common');
  const themeT = useTranslations('theme');
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const showNotificationBell = shouldShowNotificationBell(pathname, isAuthenticated());
  const hideThemeToggle = useOAuthBrandingTheme()?.themeMode != null;
  // An adopter can turn off the Swagger UI or the Apollo Sandbox; their links render only while
  // `/api/config` reports the surface on, so the header never points at a page the API won't serve.
  const { docsUrl, apiReferenceEnabled, graphqlPlaygroundEnabled, branding } = useRuntimeConfig();
  // A deployment's own logo takes the main slot; Grant's moves next to the version, small.
  const brandLogo = branding.logo;
  // A branded header background is opaque: the contrast checked at API startup is against that
  // colour, not against whatever scrolls underneath a translucent header.
  const opaqueHeader = hasHeaderBackground(branding);
  const docsHref = `${getDocsUrl(docsUrl)}/`;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const languageSwitcherRef = useRef<HTMLButtonElement>(null);
  const themeToggleRef = useRef<HTMLButtonElement>(null);

  const poweredByGrant = (
    <Logo
      size={44}
      color="currentColor"
      role="img"
      aria-label={t('app.poweredBy')}
      data-powered-by-grant=""
    />
  );

  const mobileThemeTrigger = (
    <div className="flex w-full items-center justify-between py-2 hover:bg-accent rounded-md px-2 -mx-2 cursor-pointer">
      <div className="flex items-center gap-2">
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="text-sm text-muted-foreground">{themeT('toggle')}</span>
      </div>
    </div>
  );

  const desktopThemeTrigger = (
    <Button variant="outline" size="icon" data-theme-toggle>
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">{themeT('toggle')}</span>
    </Button>
  );

  const mobileLanguageTrigger = (
    <div className="flex w-full items-center justify-between py-2 hover:bg-accent rounded-md px-2 -mx-2 cursor-pointer">
      <div className="flex items-center gap-2">
        <Globe className="h-[1.2rem] w-[1.2rem]" />
        <span className="text-sm text-muted-foreground">{t('language.label')}</span>
      </div>
    </div>
  );

  const desktopLanguageTrigger = (
    <Button variant="outline" size="icon" data-language-switcher>
      <Globe className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">{t('language.label')}</span>
    </Button>
  );

  return (
    <DemoModeDialogProvider>
      <header
        className={cn(
          'app-header sticky top-0 z-50 w-full border-b text-header-foreground',
          opaqueHeader
            ? 'bg-header'
            : 'bg-header/95 backdrop-blur supports-[backdrop-filter]:bg-header/60'
        )}
        data-branded={brandLogo || opaqueHeader ? '' : undefined}
      >
        <div className="flex h-14 items-center justify-between px-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <div className="flex items-center justify-center">
                {brandLogo ? (
                  <HeaderBrandLogo logo={brandLogo} fallbackAlt={t('navigation.home')} />
                ) : (
                  <Logo size={75} className="mt-2" />
                )}
              </div>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-accent flex-shrink-0"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {/* Desktop Navigation and Controls */}
          <div className="hidden md:flex md:items-center md:space-x-3">
            <div className="flex items-center gap-4">
              <span
                className="flex items-center gap-1.5 text-muted-foreground text-xs"
                title="App version"
              >
                {brandLogo ? poweredByGrant : null}v{getAppVersion()}
              </span>
              <DemoModeDialogTrigger />
              <a
                href={docsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <BookOpen className="h-[1rem] w-[1rem] shrink-0" />
                {t('navigation.docs')}
              </a>
              {apiReferenceEnabled ? (
                <a
                  href={getApiDocsUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FileJson className="h-[1rem] w-[1rem] shrink-0" />
                  {t('navigation.apiDocs')}
                </a>
              ) : null}
              {graphqlPlaygroundEnabled ? (
                <a
                  href={getGraphqlPlaygroundUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Network className="h-[1rem] w-[1rem] shrink-0" />
                  {t('navigation.graphqlPlayground')}
                </a>
              ) : null}
              {showNotificationBell ? <NotificationBell /> : null}
              {hideThemeToggle ? null : (
                <ThemeToggle ref={themeToggleRef} trigger={desktopThemeTrigger} />
              )}
              <LanguageSwitcher ref={languageSwitcherRef} trigger={desktopLanguageTrigger} />
            </div>
          </div>

          {/* Mobile Menu */}
          <div
            className={cn(
              'absolute top-14 left-0 right-0 bg-background border-b md:hidden transition-all duration-200 ease-in-out',
              isMobileMenuOpen
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 -translate-y-2 pointer-events-none'
            )}
          >
            <div className="flex flex-col space-y-4 p-4">
              <nav className="flex flex-col space-y-2">
                {/* Dashboard link removed - breadcrumb provides better navigation */}
              </nav>
              <div className="flex flex-col space-y-2">
                <div
                  className="flex items-center gap-1.5 py-2 -mx-2 text-muted-foreground text-xs"
                  title="App version"
                >
                  {brandLogo ? poweredByGrant : null}v{getAppVersion()}
                </div>
                <div className="py-2 -mx-2">
                  <DemoModeDialogTrigger />
                </div>
                <a
                  href={docsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 py-2 px-2 -mx-2 rounded-md hover:bg-accent text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <BookOpen className="h-[1rem] w-[1rem] shrink-0" />
                  {t('navigation.docs')}
                </a>
                {apiReferenceEnabled ? (
                  <a
                    href={getApiDocsUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 py-2 px-2 -mx-2 rounded-md hover:bg-accent text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <FileJson className="h-[1rem] w-[1rem] shrink-0" />
                    {t('navigation.apiDocs')}
                  </a>
                ) : null}
                {graphqlPlaygroundEnabled ? (
                  <a
                    href={getGraphqlPlaygroundUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 py-2 px-2 -mx-2 rounded-md hover:bg-accent text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Network className="h-[1rem] w-[1rem] shrink-0" />
                    {t('navigation.graphqlPlayground')}
                  </a>
                ) : null}
                {showNotificationBell ? (
                  <div className="py-2 -mx-2">
                    <NotificationBell />
                  </div>
                ) : null}
              </div>
              <div className="h-px bg-border" />
              <div className="flex flex-col space-y-2">
                {hideThemeToggle ? null : (
                  <ThemeToggle ref={themeToggleRef} trigger={mobileThemeTrigger} />
                )}
                <LanguageSwitcher ref={languageSwitcherRef} trigger={mobileLanguageTrigger} />
              </div>
              <div className="h-px bg-border" />
              <div className="flex flex-col space-y-2">
                {!isAuthenticated() ? (
                  <div className="block py-2">
                    <Link href="/auth/login">{t('auth.login')}</Link>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>
    </DemoModeDialogProvider>
  );
}
