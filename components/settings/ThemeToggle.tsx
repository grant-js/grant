'use client';

import { forwardRef } from 'react';

import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ThemeToggleProps {
  trigger?: React.ReactNode;
}

export const ThemeToggle = forwardRef<HTMLButtonElement, ThemeToggleProps>(({ trigger }, ref) => {
  const { theme, setTheme } = useTheme();
  const t = useTranslations('theme');

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const defaultTrigger = (
    <Button ref={ref} variant="outline" size="icon" data-theme-toggle onClick={handleThemeToggle}>
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">{t('toggle')}</span>
    </Button>
  );

  const triggerWithClick = trigger ? <div onClick={handleThemeToggle}>{trigger}</div> : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{triggerWithClick || defaultTrigger}</TooltipTrigger>
        <TooltipContent>
          <p>{t('switchTo', { theme: theme === 'dark' ? 'light' : 'dark' })}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

ThemeToggle.displayName = 'ThemeToggle';
