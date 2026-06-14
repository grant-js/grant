import {
  CreateProjectAppResult,
  ProjectApp,
  ProjectAppSortableField,
  ProjectAppSortInput,
  SortOrder,
} from '@grantjs/schema';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type ProjectAppView = 'table' | 'card';

interface ProjectAppsState {
  page: number;
  limit: number;
  totalCount: number;
  view: ProjectAppView;
  search: string;
  sort: ProjectAppSortInput;
  selectedTagIds: string[];
  loading: boolean;
  refetch: (() => void) | null;

  projectApps: ProjectApp[];
  projectAppToEdit: ProjectApp | null;
  projectAppToDelete: ProjectApp | null;
  createdProjectApp: CreateProjectAppResult | null;
  secretDialogOpen: boolean;
  currentProjectApp: ProjectApp | null;

  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setTotalCount: (count: number) => void;
  setView: (view: ProjectAppView) => void;
  setSearch: (search: string) => void;
  setSort: (field: ProjectAppSortableField, order: SortOrder) => void;
  setSelectedTagIds: (tagIds: string[]) => void;
  setLoading: (loading: boolean) => void;
  setRefetch: (refetch: (() => void) | null) => void;
  setProjectApps: (apps: ProjectApp[]) => void;
  setProjectAppToEdit: (app: ProjectApp | null) => void;
  setProjectAppToDelete: (app: ProjectApp | null) => void;
  setCreatedProjectApp: (app: CreateProjectAppResult | null) => void;
  setSecretDialogOpen: (open: boolean) => void;
  setCurrentProjectApp: (app: ProjectApp | null) => void;
  handleProjectAppCreated: (result: CreateProjectAppResult | null) => void;
  resetToDefaults: () => void;
}

const defaultSort: ProjectAppSortInput = {
  field: ProjectAppSortableField.CreatedAt,
  order: SortOrder.Desc,
} as ProjectAppSortInput;

const initialState = {
  page: 1,
  limit: 50,
  totalCount: 0,
  view: 'card' as ProjectAppView,
  search: '',
  sort: defaultSort,
  selectedTagIds: [] as string[],
  loading: false,
  refetch: null as (() => void) | null,
  projectApps: [] as ProjectApp[],
  projectAppToEdit: null as ProjectApp | null,
  projectAppToDelete: null as ProjectApp | null,
  createdProjectApp: null as CreateProjectAppResult | null,
  secretDialogOpen: false,
  currentProjectApp: null as ProjectApp | null,
};

export const useProjectAppsStore = create<ProjectAppsState>()(
  devtools(
    (set) => ({
      ...initialState,

      setPage: (page) => set({ page }),
      setLimit: (limit) => set({ limit, page: 1 }),
      setTotalCount: (totalCount) => set({ totalCount }),
      setView: (view) => set({ view }),
      setSearch: (search) => set({ search, page: 1 }),
      setSort: (field, order) => set({ sort: { field, order }, page: 1 }),
      setSelectedTagIds: (tagIds) => set({ selectedTagIds: tagIds, page: 1 }),
      setLoading: (loading) => set({ loading }),
      setRefetch: (refetch) => set({ refetch }),
      setProjectApps: (projectApps) => set({ projectApps }),
      setProjectAppToEdit: (projectAppToEdit) => set({ projectAppToEdit }),
      setProjectAppToDelete: (projectAppToDelete) => set({ projectAppToDelete }),
      setCreatedProjectApp: (createdProjectApp) => set({ createdProjectApp }),
      setSecretDialogOpen: (secretDialogOpen) => set({ secretDialogOpen }),
      setCurrentProjectApp: (currentProjectApp) => set({ currentProjectApp }),
      handleProjectAppCreated: (result) => {
        if (result) {
          set({ createdProjectApp: result, secretDialogOpen: true });
        }
      },
      resetToDefaults: () =>
        set({
          ...initialState,
          sort: defaultSort,
          selectedTagIds: [],
          createdProjectApp: null,
          secretDialogOpen: false,
          currentProjectApp: null,
        }),
    }),
    { name: 'grant-project-apps-store' }
  )
);
