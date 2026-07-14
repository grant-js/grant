'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { NotificationChannel, NotificationPreference } from '@grantjs/schema';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
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

const EDITABLE_CATEGORIES = ['iam', 'membership', 'integrations'] as const;
const CHANNELS: NotificationChannel[] = ['in_app', 'email'];

const CATEGORY_DEFAULTS: Record<string, Record<NotificationChannel, boolean>> = {
  security: { in_app: true, email: true },
  iam: { in_app: true, email: false },
  membership: { in_app: true, email: true },
  integrations: { in_app: true, email: false },
};

const TENANT_TABS = ['account', 'organization'] as const;
type TenantTab = (typeof TENANT_TABS)[number];

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

function PreferencesTable({ scopeTenant }: { scopeTenant: string }) {
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
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive text-sm">{error.message}</p>;
  }

  return (
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
  );
}

export function NotificationPreferences() {
  const t = useTranslations('notificationPreferences');
  const [activeTenant, setActiveTenant] = useState<TenantTab>('organization');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="text-muted-foreground text-sm">{t('securityLockedHint')}</p>
      </div>
      <div className="flex gap-2">
        {TENANT_TABS.map((tenant) => (
          <Button
            key={tenant}
            type="button"
            variant={activeTenant === tenant ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTenant(tenant)}
          >
            {t(`tenants.${tenant}`)}
          </Button>
        ))}
      </div>
      <PreferencesTable scopeTenant={activeTenant} />
    </div>
  );
}
