'use client';

import { forwardRef } from 'react';

import { Globe } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales } from '@/i18n/routing';

const LOCALE_LABELS: Record<string, string> = {
  en: 'English',
  de: 'Deutsch',
};

interface LanguageSwitcherProps {
  trigger?: React.ReactNode;
}

export const LanguageSwitcher = forwardRef<HTMLButtonElement, LanguageSwitcherProps>(
  ({ trigger }, ref) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentLocale = useLocale();
    const t = useTranslations('common');

    const defaultTrigger = (
      <Button ref={ref} variant="outline" size="icon" data-language-switcher>
        <Globe className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    );

    return (
      <TooltipProvider>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>{trigger || defaultTrigger}</DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('language.label')}</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={currentLocale}>
              {locales.map((locale) => (
                <DropdownMenuRadioItem
                  key={locale}
                  value={locale}
                  onClick={() =>
                    router.replace(`${pathname}?${searchParams.toString()}`, { locale })
                  }
                  className="cursor-pointer"
                >
                  {LOCALE_LABELS[locale]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>
    );
  }
);

LanguageSwitcher.displayName = 'LanguageSwitcher';
