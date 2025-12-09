import { Project, ProjectSortableField, SortOrder } from '@logusgraphics/grant-schema';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { ProjectView } from '@/components/features/projects/ProjectViewSwitcher';

interface ProjectsState {
  // State
  page: number;
  limit: number;
  search: string;
  sort: { field: ProjectSortableField; order: SortOrder };
  view: ProjectView;
  selectedTagIds: string[];
  totalCount: number;
  isInitialized: boolean;

  // Data state
  projects: Project[];
  loading: boolean;

  // Dialog state
  projectToDelete: { id: string; name: string } | null;
  projectToEdit: Project | null;
  isCreateDialogOpen: boolean;

  // Current project detail (for breadcrumb)
  currentProject: Project | null;

  // Actions
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  setSort: (field: ProjectSortableField, order: SortOrder) => void;
  setView: (view: ProjectView) => void;
  setSelectedTagIds: (tagIds: string[]) => void;
  setTotalCount: (count: number) => void;
  setProjects: (projects: Project[]) => void;
  setLoading: (loading: boolean) => void;
  resetToDefaults: () => void;
  initializeFromUrl: (params: URLSearchParams) => void;

  // Dialog actions
  setProjectToDelete: (project: { id: string; name: string } | null) => void;
  setProjectToEdit: (project: Project | null) => void;
  setCreateDialogOpen: (open: boolean) => void;
  setCurrentProject: (project: Project | null) => void;
}

const defaultSort = { field: ProjectSortableField.Name, order: SortOrder.Asc };

export const useProjectsStore = create<ProjectsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      page: 1,
      limit: 50,
      search: '',
      sort: defaultSort,
      view: ProjectView.CARD,
      selectedTagIds: [],
      totalCount: 0,
      isInitialized: false,

      // Data state
      projects: [],
      loading: false,

      // Dialog state
      projectToDelete: null,
      projectToEdit: null,
      isCreateDialogOpen: false,

      // Current project detail
      currentProject: null,

      // Actions
      setPage: (page) => set({ page }),
      setLimit: (limit) => set({ limit, page: 1 }),
      setSearch: (search) => set({ search, page: 1 }),
      setSort: (field, order) => set({ sort: { field, order }, page: 1 }),
      setView: (view) => set({ view }),
      setSelectedTagIds: (tagIds) => set({ selectedTagIds: tagIds, page: 1 }),
      setTotalCount: (totalCount) => set({ totalCount }),
      setProjects: (projects) => set({ projects }),
      setLoading: (loading) => set({ loading }),
      resetToDefaults: () =>
        set({
          page: 1,
          limit: 50,
          search: '',
          sort: defaultSort,
          view: ProjectView.CARD,
          selectedTagIds: [],
          totalCount: 0,
          isInitialized: false,
          projects: [],
          loading: false,
          projectToDelete: null,
          projectToEdit: null,
          isCreateDialogOpen: false,
          currentProject: null,
        }),
      initializeFromUrl: (params) => {
        const state = get();
        if (state.isInitialized) return;

        const page = parseInt(params.get('page') || '1');
        const limit = parseInt(params.get('limit') || '50');
        const search = params.get('search') || '';
        const sortField =
          (params.get('sortField') as ProjectSortableField) || ProjectSortableField.Name;
        const sortOrder = (params.get('sortOrder') as SortOrder) || SortOrder.Asc;
        const view = (params.get('view') as ProjectView) || ProjectView.CARD;
        const selectedTagIds = params.get('tagIds')?.split(',').filter(Boolean) || [];

        set({
          page,
          limit,
          search,
          sort: { field: sortField, order: sortOrder },
          view,
          selectedTagIds,
          isInitialized: true,
        });
      },

      // Dialog actions
      setProjectToDelete: (project) => set({ projectToDelete: project }),
      setProjectToEdit: (project) => set({ projectToEdit: project }),
      setCreateDialogOpen: (open) => set({ isCreateDialogOpen: open }),
      setCurrentProject: (project) => set({ currentProject: project }),
    }),
    {
      name: 'projects-store',
    }
  )
);
