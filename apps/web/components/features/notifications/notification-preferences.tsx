'use client';

import { useMemo, useState } from 'react';
import type { NotificationChannel, NotificationPreference } from '@grantjs/schema';

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
  iam: { in_app: true, email: false },
  membership: { in_app: true, email: true },
  integrations: { in_app: true, email: false },
};

interface NotificationPreferencesProps {
  /** Tenant the preferences apply to (e.g. "organization"). */
  scopeTenant: string;
}

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

export function NotificationPreferences({ scopeTenant }: NotificationPreferencesProps) {
  const { preferences, loading, error, setPreference } = useNotificationPreferences(scopeTenant);
  const [saving, setSaving] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      EDITABLE_CATEGORIES.map((category) => ({
        category,
        channels: CHANNELS.map((channel) => ({
          channel,
          enabled: resolveEnabled(preferences, category, channel),
        })),
      })),
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
      toast.error(err instanceof Error ? err.message : 'Failed to save preference');
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
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Notification preferences</h2>
        <p className="text-muted-foreground text-sm">
          Security notifications are always on and cannot be disabled.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead className="text-center">In-app</TableHead>
            <TableHead className="text-center">Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.category}>
              <TableCell className="capitalize">{row.category}</TableCell>
              {row.channels.map(({ channel, enabled }) => (
                <TableCell key={channel} className="text-center">
                  <Switch
                    checked={enabled}
                    disabled={saving === `${row.category}:${channel}`}
                    onCheckedChange={(checked) => handleToggle(row.category, channel, checked)}
                    aria-label={`${row.category} ${channel}`}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
