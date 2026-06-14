'use client';

import { type ReactNode, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ProjectApp } from '@grantjs/schema';
import type { LucideIcon } from 'lucide-react';
import { Fingerprint, LayoutGrid } from 'lucide-react';

import { CopyToClipboard, EntityDetailInfoTable, FeatureModuleCard } from '@/components/common';

function detailInfoTableIcon(Icon: LucideIcon): ReactNode {
  return <Icon className="h-3 w-3 text-muted-foreground" />;
}

interface ProjectAppTestSummaryCardProps {
  projectApp: ProjectApp;
}

export function ProjectAppTestSummaryCard({ projectApp }: ProjectAppTestSummaryCardProps) {
  const t = useTranslations('projectApp.test');
  const tInfo = useTranslations('projectApp.info');

  const infoRows = useMemo(
    () => [
      {
        id: 'name',
        icon: detailInfoTableIcon(LayoutGrid),
        label: t('summary.name'),
        value: <span className="font-semibold">{projectApp.name}</span>,
      },
      {
        id: 'clientId',
        icon: detailInfoTableIcon(Fingerprint),
        label: t('summary.clientId'),
        value: (
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate font-mono font-semibold">{projectApp.clientId}</span>
            <CopyToClipboard
              text={projectApp.clientId}
              size="sm"
              variant="ghost"
              className="shrink-0"
            />
          </div>
        ),
      },
    ],
    [projectApp.clientId, projectApp.name, t]
  );

  return (
    <FeatureModuleCard
      title={t('summary.title')}
      description={t('summary.description')}
      collapsible
    >
      <EntityDetailInfoTable
        rows={infoRows}
        fieldColumnHeader={tInfo('tableField')}
        valueColumnHeader={tInfo('tableValue')}
        withTopSeparator={false}
      />
    </FeatureModuleCard>
  );
}
