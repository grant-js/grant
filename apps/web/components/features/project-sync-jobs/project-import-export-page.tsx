'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { DashboardLayout } from '@/components/layout';
import { usePageTitle } from '@/hooks';

import { ProjectSyncJobCancelDialog } from './project-sync-job-cancel-dialog';
import { ProjectSyncJobExportDialog } from './project-sync-job-export-dialog';
import { ProjectSyncJobPagination } from './project-sync-job-pagination';
import { ProjectSyncJobStartDialog } from './project-sync-job-start-dialog';
import { ProjectSyncJobToolbar } from './project-sync-job-toolbar';
import { ProjectSyncJobViewer } from './project-sync-job-viewer';

export interface ProjectImportExportPageProps {
  sidebar: ReactNode;
}

export function ProjectImportExportPage({ sidebar }: ProjectImportExportPageProps) {
  const t = useTranslations('projectSyncJobs');
  usePageTitle('projectSyncJobs');

  return (
    <DashboardLayout
      title={t('title')}
      sidebar={sidebar}
      actions={<ProjectSyncJobToolbar />}
      footer={<ProjectSyncJobPagination />}
    >
      <>
        <ProjectSyncJobViewer />
        <ProjectSyncJobStartDialog />
        <ProjectSyncJobExportDialog />
        <ProjectSyncJobCancelDialog />
      </>
    </DashboardLayout>
  );
}
