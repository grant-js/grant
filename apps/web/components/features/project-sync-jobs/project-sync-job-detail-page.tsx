'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { DashboardLayout } from '@/components/layout';
import { usePageTitle } from '@/hooks';

import { ProjectSyncJobCancelDialog } from './project-sync-job-cancel-dialog';
import { ProjectSyncJobDetailToolbar } from './project-sync-job-detail-toolbar';
import { ProjectSyncJobDetailViewer } from './project-sync-job-detail-viewer';

export interface ProjectSyncJobDetailPageProps {
  sidebar: ReactNode;
}

export function ProjectSyncJobDetailPage({ sidebar }: ProjectSyncJobDetailPageProps) {
  const t = useTranslations('projectSyncJobs');
  usePageTitle('projectSyncJobs.detail');

  return (
    <DashboardLayout
      title={t('detail.title')}
      sidebar={sidebar}
      actions={<ProjectSyncJobDetailToolbar />}
    >
      <div className="p-4">
        <ProjectSyncJobDetailViewer />
        <ProjectSyncJobCancelDialog />
      </div>
    </DashboardLayout>
  );
}
