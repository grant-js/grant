'use client';

import { useTranslations } from 'next-intl';
import { Check, Info, Lock } from 'lucide-react';

import { DataTable, type DataTableColumnConfig } from '@/components/common/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DATA_TABLE_STATUS_COLUMN_WIDTH } from '@/lib/detail-table-column-width';

interface Feature {
  name: string;
  personal: 'allowed' | 'blocked';
  organization: 'allowed' | 'blocked';
}

interface FeatureGroup {
  category: string;
  features: Feature[];
}

const featureGroups: FeatureGroup[] = [
  {
    category: 'projects',
    features: [
      { name: 'createProject', personal: 'allowed', organization: 'blocked' },
      { name: 'editProject', personal: 'allowed', organization: 'blocked' },
      { name: 'deleteProject', personal: 'allowed', organization: 'blocked' },
    ],
  },
  {
    category: 'projectApps',
    features: [
      { name: 'createProjectApp', personal: 'blocked', organization: 'blocked' },
      { name: 'editProjectApp', personal: 'blocked', organization: 'blocked' },
      { name: 'deleteProjectApp', personal: 'blocked', organization: 'blocked' },
    ],
  },
  {
    category: 'users',
    features: [
      { name: 'createUser', personal: 'allowed', organization: 'blocked' },
      { name: 'editUser', personal: 'allowed', organization: 'blocked' },
      { name: 'deleteUser', personal: 'allowed', organization: 'blocked' },
    ],
  },
  {
    category: 'roles',
    features: [
      { name: 'createRole', personal: 'allowed', organization: 'blocked' },
      { name: 'editRole', personal: 'allowed', organization: 'blocked' },
      { name: 'deleteRole', personal: 'allowed', organization: 'blocked' },
    ],
  },
  {
    category: 'groups',
    features: [
      { name: 'createGroup', personal: 'allowed', organization: 'blocked' },
      { name: 'editGroup', personal: 'allowed', organization: 'blocked' },
      { name: 'deleteGroup', personal: 'allowed', organization: 'blocked' },
    ],
  },
  {
    category: 'permissions',
    features: [
      { name: 'createPermission', personal: 'allowed', organization: 'blocked' },
      { name: 'editPermission', personal: 'allowed', organization: 'blocked' },
      { name: 'deletePermission', personal: 'allowed', organization: 'blocked' },
    ],
  },
  {
    category: 'resources',
    features: [
      { name: 'createResource', personal: 'allowed', organization: 'blocked' },
      { name: 'editResource', personal: 'allowed', organization: 'blocked' },
      { name: 'deleteResource', personal: 'allowed', organization: 'blocked' },
    ],
  },
  {
    category: 'tags',
    features: [
      { name: 'createTag', personal: 'allowed', organization: 'blocked' },
      { name: 'editTag', personal: 'allowed', organization: 'blocked' },
      { name: 'deleteTag', personal: 'allowed', organization: 'blocked' },
    ],
  },
  {
    category: 'apiKeys',
    features: [
      { name: 'createApiKey', personal: 'allowed', organization: 'blocked' },
      { name: 'revokeApiKey', personal: 'allowed', organization: 'blocked' },
      { name: 'deleteApiKey', personal: 'allowed', organization: 'blocked' },
    ],
  },
  {
    category: 'organizations',
    features: [
      { name: 'createOrganization', personal: 'blocked', organization: 'blocked' },
      { name: 'editOrganization', personal: 'blocked', organization: 'blocked' },
      { name: 'deleteOrganization', personal: 'blocked', organization: 'blocked' },
    ],
  },
  {
    category: 'members',
    features: [
      { name: 'inviteMember', personal: 'blocked', organization: 'blocked' },
      { name: 'updateMemberRole', personal: 'blocked', organization: 'blocked' },
      { name: 'removeMember', personal: 'blocked', organization: 'blocked' },
      { name: 'resendInvitation', personal: 'blocked', organization: 'blocked' },
      { name: 'revokeInvitation', personal: 'blocked', organization: 'blocked' },
    ],
  },
  {
    category: 'settings',
    features: [
      { name: 'updateProfile', personal: 'blocked', organization: 'blocked' },
      { name: 'changePassword', personal: 'blocked', organization: 'blocked' },
      { name: 'deleteAccount', personal: 'blocked', organization: 'blocked' },
      { name: 'createSecondaryAccount', personal: 'blocked', organization: 'blocked' },
    ],
  },
];

function StatusIcon({ status }: { status: 'allowed' | 'blocked' }) {
  if (status === 'allowed') {
    return <Check className="h-4 w-4 text-green-600 dark:text-green-500" />;
  }
  return <Lock className="h-4 w-4 text-amber-600 dark:text-amber-500" />;
}

interface EmailVerificationFeaturesDialogProps {
  trigger?: React.ReactNode;
}

export function EmailVerificationFeaturesDialog({ trigger }: EmailVerificationFeaturesDialogProps) {
  const t = useTranslations('auth.featureGating');

  // The feature column fits its content; the two check columns are fixed and centred.
  const columns: DataTableColumnConfig<Feature>[] = [
    {
      key: 'feature',
      header: t('table.feature'),
      width: '160px',
      className: 'font-medium',
      render: (feature) => t(`features.${feature.name}`),
    },
    ...(['personal', 'organization'] as const).map((account): DataTableColumnConfig<Feature> => ({
      key: account,
      header: t(`table.${account}`),
      width: DATA_TABLE_STATUS_COLUMN_WIDTH,
      columnWidthMode: 'fixed',
      enableResizing: false,
      enableHiding: false,
      truncate: false,
      align: 'center',
      render: (feature) => <StatusIcon status={feature[account]} />,
    })),
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-8 text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/50"
          >
            <Info className="h-4 w-4" />
            {t('viewFeatures')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-600" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Legend */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-green-600 dark:text-green-500" />
              <span className="text-muted-foreground">{t('legend.allowed')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-amber-600 dark:text-amber-500" />
              <span className="text-muted-foreground">{t('legend.blocked')}</span>
            </div>
          </div>

          <ScrollArea className="h-[50vh] pr-4">
            <div className="space-y-6">
              {featureGroups.map((group) => (
                <div key={group.category}>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    {t(`categories.${group.category}`)}
                    <Badge variant="outline" className="font-normal text-xs">
                      {group.features.length}
                    </Badge>
                  </h3>
                  <DataTable<Feature>
                    tableId="emailVerification.features"
                    data={group.features}
                    columns={columns}
                    loading={false}
                    emptyState={{ icon: null, title: '', description: '' }}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Summary Note */}
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>{t('note.title')}</strong> {t('note.description')}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
