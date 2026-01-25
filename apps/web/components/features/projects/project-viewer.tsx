'use client';

import { useCallback, useEffect } from 'react';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { useProjectScope } from '@/hooks/common';
import { useProjects } from '@/hooks/projects';
import { useProjectsStore } from '@/stores/projects.store';

import { ProjectCards } from './project-cards';
import { ProjectTable } from './project-table';
import { ProjectView } from './project-types';

export function ProjectViewer() {
  const scope = useProjectScope();
  const view = useProjectsStore((state) => state.view);
  const page = useProjectsStore((state) => state.page);
  const limit = useProjectsStore((state) => state.limit);
  const search = useProjectsStore((state) => state.search);
  const sort = useProjectsStore((state) => state.sort);
  const selectedTagIds = useProjectsStore((state) => state.selectedTagIds);
  const setTotalCount = useProjectsStore((state) => state.setTotalCount);
  const setProjects = useProjectsStore((state) => state.setProjects);
  const setLoading = useProjectsStore((state) => state.setLoading);
  const setRefetch = useProjectsStore((state) => state.setRefetch);

  const { projects, loading, totalCount, refetch } = useProjects({
    scope: scope!,
    page,
    limit,
    search,
    sort,
    tagIds: selectedTagIds,
  });

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    setRefetch(handleRefetch);
    return () => setRefetch(null);
  }, [handleRefetch, setRefetch]);

  useEffect(() => {
    setProjects(projects);
  }, [projects, setProjects]);

  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

  useEffect(() => {
    if (totalCount && totalCount !== 0) {
      setTotalCount(totalCount);
    }
  }, [totalCount, setTotalCount]);

  const canQuery = useGrant(ResourceSlug.Project, ResourceAction.Query, {
    scope: scope!,
  });

  if (!scope || !canQuery) {
    return null;
  }

  switch (view) {
    case ProjectView.CARD:
      return <ProjectCards />;
    case ProjectView.TABLE:
      return <ProjectTable />;
    default:
      return <ProjectCards />;
  }
}
