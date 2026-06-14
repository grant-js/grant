import {
  ProjectSyncJob,
  ProjectSyncJobSortableField,
  ProjectSyncJobStatus,
  SortOrder,
} from '@grantjs/schema';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import {
  ProjectSyncJobStatusFilterValue,
  ProjectSyncJobView,
} from '@/components/features/project-sync-jobs/project-sync-job-types';

interface ProjectSyncJobsState {
  // Filters / pagination
  page: number;
  limit: number;
  search: string;
  sort: { field: ProjectSyncJobSortableField; order: SortOrder };
  status: ProjectSyncJobStatusFilterValue;
  view: ProjectSyncJobView;

  // Data
  jobs: ProjectSyncJob[];
  totalCount: number;
  loading: boolean;
  refetch: (() => void | Promise<unknown>) | null;

  // Detail / dialog state
  currentSyncJob: ProjectSyncJob | null;
  isStartDialogOpen: boolean;
  isExportDialogOpen: boolean;
  jobToCancel: ProjectSyncJob | null;

  // Actions
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  setSort: (field: ProjectSyncJobSortableField, order: SortOrder) => void;
  setStatus: (status: ProjectSyncJobStatusFilterValue) => void;
  setView: (view: ProjectSyncJobView) => void;
  setJobs: (jobs: ProjectSyncJob[]) => void;
  /** Prepends a job when absent (e.g. right after enqueue, before list refetch settles). */
  prependJob: (job: ProjectSyncJob) => void;
  setTotalCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  setRefetch: (refetch: (() => void | Promise<unknown>) | null) => void;

  setCurrentSyncJob: (job: ProjectSyncJob | null) => void;
  setStartDialogOpen: (open: boolean) => void;
  setExportDialogOpen: (open: boolean) => void;
  setJobToCancel: (job: ProjectSyncJob | null) => void;

  resetToDefaults: () => void;
}

const defaultSort = {
  field: ProjectSyncJobSortableField.EnqueuedAt,
  order: SortOrder.Desc,
};

const initialState = {
  page: 1,
  limit: 25,
  search: '',
  sort: defaultSort,
  status: null as ProjectSyncJobStatusFilterValue,
  view: ProjectSyncJobView.TABLE,
  jobs: [] as ProjectSyncJob[],
  totalCount: 0,
  loading: false,
  refetch: null as (() => void) | null,
  currentSyncJob: null as ProjectSyncJob | null,
  isStartDialogOpen: false,
  isExportDialogOpen: false,
  jobToCancel: null as ProjectSyncJob | null,
};

export const useProjectSyncJobsStore = create<ProjectSyncJobsState>()(
  devtools(
    (set) => ({
      ...initialState,

      setPage: (page) => set({ page }),
      setLimit: (limit) => set({ limit, page: 1 }),
      setSearch: (search) => set({ search, page: 1 }),
      setSort: (field, order) => set({ sort: { field, order }, page: 1 }),
      setStatus: (status) => set({ status, page: 1 }),
      setView: (view) => set({ view }),
      setJobs: (jobs) => set({ jobs }),
      prependJob: (job) =>
        set((state) => {
          if (state.jobs.some((existing) => existing.id === job.id)) {
            return state;
          }
          return { jobs: [job, ...state.jobs], totalCount: state.totalCount + 1 };
        }),
      setTotalCount: (totalCount) => set({ totalCount }),
      setLoading: (loading) => set({ loading }),
      setRefetch: (refetch) => set({ refetch }),

      setCurrentSyncJob: (currentSyncJob) => set({ currentSyncJob }),
      setStartDialogOpen: (isStartDialogOpen) => set({ isStartDialogOpen }),
      setExportDialogOpen: (isExportDialogOpen) => set({ isExportDialogOpen }),
      setJobToCancel: (jobToCancel) => set({ jobToCancel }),

      resetToDefaults: () => set({ ...initialState }),
    }),
    { name: 'grant-project-sync-jobs-store' }
  )
);

export const PROJECT_SYNC_JOB_STATUS_FILTERS: ReadonlyArray<{
  value: ProjectSyncJobStatusFilterValue;
  labelKey: string;
}> = [
  { value: null, labelKey: 'status.all' },
  { value: ProjectSyncJobStatus.Pending, labelKey: 'status.pending' },
  { value: ProjectSyncJobStatus.Running, labelKey: 'status.running' },
  { value: ProjectSyncJobStatus.Completed, labelKey: 'status.completed' },
  { value: ProjectSyncJobStatus.Failed, labelKey: 'status.failed' },
  { value: ProjectSyncJobStatus.Cancelled, labelKey: 'status.cancelled' },
];
