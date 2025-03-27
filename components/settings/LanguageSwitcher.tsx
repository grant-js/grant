'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { locales } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { forwardRef } from 'react';

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

    const defaultTrigger = (
      <Button ref={ref} variant="outline" size="icon" data-language-switcher>
        <Globe className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    );

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger || defaultTrigger}</DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup value={currentLocale}>
            {locales.map((locale) => (
              <DropdownMenuRadioItem
                key={locale}
                value={locale}
                onClick={() => router.replace(`${pathname}?${searchParams.toString()}`, { locale })}
                className="cursor-pointer"
              >
                {LOCALE_LABELS[locale]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

LanguageSwitcher.displayName = 'LanguageSwitcher';
