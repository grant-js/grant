'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AccountType, NotificationChannel, type NotificationPreference } from '@grantjs/schema';

import { DataTable, type DataTableColumnConfig } from '@/components/common/data-table';
import { FieldInfoPopover } from '@/components/common/field-info-popover';
import { SettingCard } from '@/components/features/settings';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { useNotificationPreferences } from '@/hooks/notifications';
import { DATA_TABLE_SWITCH_COLUMN_WIDTH } from '@/lib/detail-table-column-width';
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

  const columns: DataTableColumnConfig<(typeof rows)[number]>[] = [
    {
      key: 'category',
      header: t('category'),
      width: '120px',
      className: 'capitalize',
      render: (row) => t(`categories.${row.category}`),
    },
    ...CHANNELS.map((channel): DataTableColumnConfig<(typeof rows)[number]> => ({
      key: channel,
      header: channel === NotificationChannel.InApp ? t('inApp') : t('email'),
      width: DATA_TABLE_SWITCH_COLUMN_WIDTH,
      columnWidthMode: 'fixed',
      enableResizing: false,
      enableHiding: false,
      truncate: false,
      className: 'text-center',
      render: (row) => {
        const enabled = row.channels.find((entry) => entry.channel === channel)?.enabled ?? false;
        const enforced = isOrgEnforced(preferences, row.category, channel);
        const disabled = row.locked || enforced || saving === `${row.category}:${channel}`;
        return (
          <div className="flex justify-center">
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
          </div>
        );
      },
    })),
  ];

  if (error) {
    return <p className="text-destructive text-sm">{error.message}</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t('securityLockedHint')}</p>
      <DataTable
        tableId={`notifications.preferences.${scopeTenant}`}
        data={rows}
        columns={columns}
        loading={loading}
        emptyState={{ icon: null, title: '', description: '' }}
        skeletonConfig={{
          rowCount: PREFERENCE_ROW_COUNT,
          columns: [
            { key: 'category', type: 'text', width: '120px' },
            ...CHANNELS.map((channel) => ({
              key: channel,
              type: 'switch' as const,
              width: DATA_TABLE_SWITCH_COLUMN_WIDTH,
            })),
          ],
        }}
      />
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
