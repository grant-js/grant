'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import cronstrue from 'cronstrue/i18n';
import {
  Activity,
  Building2,
  FolderKanban,
  Info,
  KeyRound,
  Shield,
  User,
  Users,
} from 'lucide-react';

import { useRuntimeConfig } from '@/components/providers/runtime-config-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';

const STORAGE_KEY = 'grant-demo-dialog-seen';

const DEMO_RESET_ITEMS = [
  { key: 'accounts' as const, Icon: Building2 },
  { key: 'users' as const, Icon: User },
  { key: 'organizations' as const, Icon: Building2 },
  { key: 'projects' as const, Icon: FolderKanban },
  { key: 'roles' as const, Icon: Shield },
  { key: 'groups' as const, Icon: Users },
  { key: 'permissions' as const, Icon: KeyRound },
  { key: 'sessions' as const, Icon: Activity },
] as const;

type DemoModeContextValue = { open: boolean; setOpen: (open: boolean) => void };
const DemoModeContext = createContext<DemoModeContextValue | null>(null);
DemoModeContext.displayName = 'DemoModeContext';

function useDemoMode() {
  const ctx = useContext(DemoModeContext);
  if (!ctx) throw new Error('DemoModeDialogTrigger must be used within DemoModeDialogProvider');
  return ctx;
}

function mapLocaleToCronLocale(locale: string): string | undefined {
  const base = locale.split('-')[0];
  switch (base) {
    case 'en':
      return undefined;
    default:
      return base;
  }
}

function getHumanReadableSchedule(
  cronExpression: string | undefined | null,
  locale: string
): string | null {
  if (!cronExpression) return null;
  try {
    return cronstrue.toString(cronExpression, {
      use24HourTimeFormat: true,
      locale: mapLocaleToCronLocale(locale),
    });
  } catch {
    return null;
  }
}

function DemoModeDialogContent() {
  const t = useTranslations('demo');
  const locale = useLocale();
  const { demoModeDbRefreshSchedule } = useRuntimeConfig();
  const readableSchedule = getHumanReadableSchedule(demoModeDbRefreshSchedule, locale);

  return (
    <DialogContent
      className="sm:max-w-xl"
      hideCloseButton
      onInteractOutside={(e) => e.preventDefault()}
      onEscapeKeyDown={(e) => e.preventDefault()}
    >
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Info className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" />
          {t('bannerTitle')}
        </DialogTitle>
        <DialogDescription asChild>
          <p className="text-muted-foreground text-sm pt-1">
            {readableSchedule
              ? t('bannerMessageWithSchedule', { schedule: readableSchedule })
              : t('bannerMessageWithoutSchedule')}
          </p>
        </DialogDescription>
      </DialogHeader>
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm font-medium mb-2">{t('resetIncludes.title')}</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {DEMO_RESET_ITEMS.map(({ key, Icon }) => (
            <Item key={key} variant="default" size="sm">
              <ItemMedia variant="icon">
                <Icon className="size-4 text-muted-foreground" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{t(`resetIncludes.${key}Title`)}</ItemTitle>
                <ItemDescription>{t(`resetIncludes.${key}Description`)}</ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </div>
      </div>
      <DialogFooter className="sm:justify-end">
        <DialogClose asChild>
          <Button>{t('understandButton')}</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}

export function DemoModeDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { demoModeEnabled: enabled } = useRuntimeConfig();

  useEffect(() => {
    if (!enabled) return;
    let shouldOpen = false;
    try {
      const seen = typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY);
      shouldOpen = !seen;
    } catch {
      // ignore localStorage errors
    }
    if (shouldOpen) {
      const id = setTimeout(() => setOpen(true), 0);
      return () => clearTimeout(id);
    }
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, 'true');
        }
      } catch {
        // ignore
      }
    }
  };

  return (
    <DemoModeContext.Provider value={{ open, setOpen }}>
      <>
        {children}
        {enabled ? (
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DemoModeDialogContent />
          </Dialog>
        ) : null}
      </>
    </DemoModeContext.Provider>
  );
}

export function DemoModeDialogTrigger() {
  const t = useTranslations('demo');
  const { setOpen } = useDemoMode();
  const { demoModeEnabled: enabled } = useRuntimeConfig();
  if (!enabled) return null;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setOpen(true)}
      className="gap-1.5 border-sky-200 text-sky-700 hover:bg-sky-50 hover:text-sky-900 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-950/50 dark:hover:text-sky-100"
      aria-label={t('dialogButton')}
    >
      <Info className="h-[1rem] w-[1rem] shrink-0" />
      {t('dialogButton')}
    </Button>
  );
}
