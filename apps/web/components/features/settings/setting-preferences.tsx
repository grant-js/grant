'use client';

import { redirect, useSearchParams } from 'next/navigation';

import { Globe, Monitor, Moon, Sun } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

import { SettingCard } from '@/components/features/settings';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { usePathname } from '@/i18n/navigation';
import { locales } from '@/i18n/routing';

const LOCALE_LABELS: Record<string, string> = {
  en: 'English',
  de: 'Deutsch',
};

export function SettingPreferences() {
  const t = useTranslations('settings.preferences');
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentLocale = useLocale();

  const handleLanguageChange = (locale: string) => {
    redirect(`/${locale}/${pathname}?${searchParams.toString()}`);
  };

  return (
    <div className="space-y-6">
      <SettingCard title={t('appearance.title')} description={t('appearance.description')}>
        <div className="space-y-6">
          <div className="space-y-3">
            <Label>{t('appearance.theme.label')}</Label>
            <p className="text-sm text-muted-foreground">{t('appearance.theme.description')}</p>
            <div className="flex gap-3">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
                className="flex items-center gap-2"
              >
                <Sun className="h-4 w-4" />
                {t('appearance.theme.light')}
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('dark')}
                className="flex items-center gap-2"
              >
                <Moon className="h-4 w-4" />
                {t('appearance.theme.dark')}
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('system')}
                className="flex items-center gap-2"
              >
                <Monitor className="h-4 w-4" />
                {t('appearance.theme.system')}
              </Button>
            </div>
          </div>
        </div>
      </SettingCard>

      <SettingCard title={t('language.title')} description={t('language.description')}>
        <div className="space-y-3">
          <Label>{t('language.label')}</Label>
          <p className="text-sm text-muted-foreground">{t('language.selectDescription')}</p>
          <div className="flex gap-3">
            {locales.map((locale) => (
              <Button
                key={locale}
                variant={currentLocale === locale ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleLanguageChange(locale)}
                className="flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                {LOCALE_LABELS[locale]}
              </Button>
            ))}
          </div>
        </div>
      </SettingCard>
    </div>
  );
}
