'use client';

import { PageTableColumnToggle, RefreshButton, Toolbar } from '@/components/common';
import { useProjectSyncJobsStore } from '@/stores/project-sync-jobs.store';

import { ProjectSyncJobExportTrigger } from './project-sync-job-export-trigger';
import { ProjectSyncJobLimit } from './project-sync-job-limit';
import { ProjectSyncJobSearch } from './project-sync-job-search';
import { ProjectSyncJobSorter } from './project-sync-job-sorter';
import { ProjectSyncJobStartTrigger } from './project-sync-job-start-trigger';
import { ProjectSyncJobStatusFilter } from './project-sync-job-status-filter';
import { ProjectSyncJobViewSwitcher } from './project-sync-job-view-switcher';

export function ProjectSyncJobToolbar() {
  const refetch = useProjectSyncJobsStore((state) => state.refetch);
  const loading = useProjectSyncJobsStore((state) => state.loading);

  const toolbarItems = [
    <RefreshButton key="refresh" onRefresh={refetch ?? undefined} loading={loading} />,
    <ProjectSyncJobSearch key="search" />,
    <ProjectSyncJobSorter key="sorter" />,
    <ProjectSyncJobStatusFilter key="status" />,
    <ProjectSyncJobLimit key="limit" />,
    <PageTableColumnToggle key="columns" />,
    <ProjectSyncJobViewSwitcher key="view" />,
    <ProjectSyncJobStartTrigger key="start" layout="toolbar" />,
    <ProjectSyncJobExportTrigger key="export" layout="toolbar" />,
  ];

  return <Toolbar items={toolbarItems} />;
}
