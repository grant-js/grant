'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AccountType, NotificationChannel, type NotificationPreference } from '@grantjs/schema';

import { FieldInfoPopover } from '@/components/common';
import { SettingCard } from '@/components/features/settings';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { useNotificationPreferences } from '@/hooks/notifications';
import { useAuthStore } from '@/stores/auth.store';

const EDITABLE_CATEGORIES = ['iam', 'membership', 'integrations'] as const;
const CHANNELS: NotificationChannel[] = [NotificationChannel.InApp, NotificationChannel.Email];
const PREFERENCE_ROW_COUNT = 1 + EDITABLE_CATEGORIES.length;

const CATEGORY_DEFAULTS: Record<string, Record<NotificationChannel, boolean>> = {
  security: { [NotificationChannel.InApp]: true, [NotificationChannel.Email]: true },
  iam: { [NotificationChannel.InApp]: true, [NotificationChannel.Email]: false },
  membership: { [NotificationChannel.InApp]: true, [NotificationChannel.Email]: true },
  integrations: { [NotificationChannel.InApp]: true, [NotificationChannel.Email]: false },
};

type ScopeTenant = 'account' | 'organization';

function resolveEnabled(
  preferences: NotificationPreference[],
  category: string,
  channel: NotificationChannel
): boolean {
  const global = preferences.find(
    (p) => p.scopeId === '' && p.category === category && p.channel === channel
  );
  if (global) return global.enabled;
  return CATEGORY_DEFAULTS[category]?.[channel] ?? false;
}

function isOrgEnforced(
  preferences: NotificationPreference[],
  category: string,
  channel: NotificationChannel
): boolean {
  return preferences.some(
    (p) => p.source === 'org_enforced' && p.category === category && p.channel === channel
  );
}

function PreferencesTableSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-3/4 max-w-md" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Skeleton className="h-4 w-20" />
            </TableHead>
            <TableHead className="text-center">
              <Skeleton className="mx-auto h-4 w-12" />
            </TableHead>
            <TableHead className="text-center">
              <Skeleton className="mx-auto h-4 w-12" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: PREFERENCE_ROW_COUNT }, (_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell className="text-center">
                <Skeleton className="mx-auto h-5 w-9 rounded-full" />
              </TableCell>
              <TableCell className="text-center">
                <Skeleton className="mx-auto h-5 w-9 rounded-full" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PreferencesTable({ scopeTenant }: { scopeTenant: ScopeTenant }) {
  const t = useTranslations('notificationPreferences');
  const { preferences, loading, error, setPreference } = useNotificationPreferences(scopeTenant);
  const [saving, setSaving] = useState<string | null>(null);

  const rows = useMemo(
    () => [
      {
        category: 'security' as const,
        locked: true,
        channels: CHANNELS.map((channel) => ({
          channel,
          enabled: true,
        })),
      },
      ...EDITABLE_CATEGORIES.map((category) => ({
        category,
        locked: false,
        channels: CHANNELS.map((channel) => ({
          channel,
          enabled: resolveEnabled(preferences, category, channel),
        })),
      })),
    ],
    [preferences]
  );

  const handleToggle = async (
    category: (typeof EDITABLE_CATEGORIES)[number],
    channel: NotificationChannel,
    enabled: boolean
  ) => {
    const key = `${category}:${channel}`;
    setSaving(key);
    try {
      await setPreference({ scopeTenant, category, channel, enabled });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errors.save'));
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <PreferencesTableSkeleton />;
  }

  if (error) {
    return <p className="text-destructive text-sm">{error.message}</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t('securityLockedHint')}</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('category')}</TableHead>
            <TableHead className="text-center">{t('inApp')}</TableHead>
            <TableHead className="text-center">{t('email')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.category}>
              <TableCell className="capitalize">{t(`categories.${row.category}`)}</TableCell>
              {row.channels.map(({ channel, enabled }) => {
                const enforced = isOrgEnforced(preferences, row.category, channel);
                const disabled = row.locked || enforced || saving === `${row.category}:${channel}`;
                return (
                  <TableCell key={channel} className="text-center">
                    <Switch
                      checked={row.locked ? true : enabled}
                      disabled={disabled}
                      onCheckedChange={(checked) => {
                        if (!row.locked) {
                          void handleToggle(
                            row.category as (typeof EDITABLE_CATEGORIES)[number],
                            channel,
                            checked
                          );
                        }
                      }}
                      aria-label={`${row.category} ${channel}`}
                    />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PreferenceScopeCard({ scopeTenant }: { scopeTenant: ScopeTenant }) {
  const t = useTranslations('notificationPreferences');

  return (
    <SettingCard
      title={t(`cards.${scopeTenant}.title`)}
      description={t(`cards.${scopeTenant}.description`)}
      titleAdornment={
        <FieldInfoPopover
          description={t(`cards.${scopeTenant}.info`)}
          ariaLabel={t(`cards.${scopeTenant}.infoAriaLabel`)}
        />
      }
    >
      <PreferencesTable scopeTenant={scopeTenant} />
    </SettingCard>
  );
}

export function NotificationPreferences() {
  const { accounts } = useAuthStore();
  const hasPersonal = useMemo(
    () => accounts.some((account) => account.type === AccountType.Personal),
    [accounts]
  );
  const hasOrganization = useMemo(
    () => accounts.some((account) => account.type === AccountType.Organization),
    [accounts]
  );

  return (
    <div className="space-y-6">
      {hasPersonal ? <PreferenceScopeCard scopeTenant="account" /> : null}
      {hasOrganization ? <PreferenceScopeCard scopeTenant="organization" /> : null}
    </div>
  );
}
