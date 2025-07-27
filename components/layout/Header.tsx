'use client';

import { ThemeToggle } from '@/components/settings/ThemeToggle';
import { LanguageSwitcher } from '@/components/settings/LanguageSwitcher';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { NavLink } from '@/components/navigation/NavLink';
import { Menu, X, Sun, Moon, Globe, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/auth';
import { logout } from '@/lib/auth';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/common/Logo';

export function Header() {
  const t = useTranslations('common');
  const themeT = useTranslations('theme');
  const title = t('app.title').split(' ');
  const { isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const themeToggleRef = useRef<HTMLButtonElement>(null);
  const languageSwitcherRef = useRef<HTMLButtonElement>(null);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
  };

  const mobileThemeTrigger = (
    <div className="flex w-full items-center justify-between py-2 hover:bg-accent rounded-md px-2 -mx-2 cursor-pointer">
      <div className="flex items-center gap-2">
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="text-sm text-muted-foreground">{themeT('toggle')}</span>
      </div>
    </div>
  );

  const mobileLanguageTrigger = (
    <div className="flex w-full items-center justify-between py-2 hover:bg-accent rounded-md px-2 -mx-2 cursor-pointer">
      <div className="flex items-center gap-2">
        <Globe className="h-[1.2rem] w-[1.2rem]" />
        <span className="text-sm text-muted-foreground">{t('language.label')}</span>
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

  const desktopLanguageTrigger = (
    <Button variant="outline" size="icon" data-language-switcher>
      <Globe className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">{t('language.label')}</span>
    </Button>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 md:px-8">
        {/* Logo */}
        <div className="flex-shrink-0">
          <Link href="/" className="flex items-center">
            <div className="flex h-8 w-8 items-center justify-center">
              <Logo size={40} />
            </div>
            <span className="font-bold uppercase tracking-tight">{title[0]}</span>
            <span className="font-normal uppercase tracking-wider">{title[1]}</span>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 rounded-md hover:bg-accent"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {/* Desktop Navigation and Controls */}
        <div className="hidden md:flex md:items-center md:space-x-3">
          <nav className="absolute left-1/2 -translate-x-1/2 flex items-center space-x-3">
            {isAuthenticated && <NavLink href="/dashboard">{t('navigation.dashboard')}</NavLink>}
          </nav>

          <div className="flex items-center space-x-3">
            <ThemeToggle ref={themeToggleRef} trigger={desktopThemeTrigger} />
            <LanguageSwitcher ref={languageSwitcherRef} trigger={desktopLanguageTrigger} />
            {!isAuthenticated ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" asChild>
                      <Link href="/auth/login">
                        <LogOut className="h-[1.2rem] w-[1.2rem]" />
                        <span className="sr-only">{t('auth.login')}</span>
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('auth.login')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={handleLogout}>
                      <LogOut className="h-[1.2rem] w-[1.2rem]" />
                      <span className="sr-only">{t('auth.logout')}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('auth.logout')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
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
              {isAuthenticated && (
                <div className="block py-2">
                  <NavLink href="/dashboard">{t('navigation.dashboard')}</NavLink>
                </div>
              )}
            </nav>
            <div className="h-px bg-border" />
            <div className="flex flex-col space-y-2">
              <ThemeToggle ref={themeToggleRef} trigger={mobileThemeTrigger} />
              <LanguageSwitcher ref={languageSwitcherRef} trigger={mobileLanguageTrigger} />
            </div>
            <div className="h-px bg-border" />
            <div className="flex flex-col space-y-2">
              {!isAuthenticated ? (
                <div className="block py-2">
                  <NavLink href="/auth/login">{t('auth.login')}</NavLink>
                </div>
              ) : (
                <div className="block py-2">
                  <div className="flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    <NavLink href="/auth/login" onClick={handleLogout}>
                      {t('auth.logout')}
                    </NavLink>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
