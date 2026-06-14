'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { ProjectApp } from '@grantjs/schema';
import { Key, Loader2 } from 'lucide-react';

import {
  Avatar,
  DataTable,
  type DataTableColumnConfig,
  DataTableColumnToggle,
  DETAIL_CHECKBOX_COLUMN,
  DETAIL_CHECKBOX_SKELETON,
  DETAIL_CONTENT_COLUMN_CLASS,
  DETAIL_ICON_COLUMN,
  DETAIL_ICON_SKELETON,
  DETAIL_LOADING_COLUMN,
  DETAIL_LOADING_SKELETON,
  DETAIL_PRIMARY_CONTENT_COLUMN_CLASS,
  DETAIL_TEXT_COLUMN,
  DetailAttachmentFilterToggle,
  DetailTableCheckboxCell,
  DetailTableIconCell,
  FeatureModuleCard,
  Pagination,
  RefreshButton,
  type TableSkeletonColumnConfig,
  Toolbar,
  toolbarGrow,
} from '@/components/common';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useDebounce, useDetailTableColumnVisibility, useScopeFromParams } from '@/hooks/common';
import {
  type ScopeSlugOption,
  useProjectAppFormData,
  useProjectAppMutations,
} from '@/hooks/project-apps';
import { type DetailAttachmentFilter, resolveDetailQueryIds } from '@/lib/detail-attachment-filter';

import { ProjectAppScopeSearch } from './project-app-scope-search';

const SCOPES_PAGE_LIMIT = 10;

interface ProjectAppScopesProps {
  projectApp: ProjectApp;
}

export function ProjectAppScopes({ projectApp }: ProjectAppScopesProps) {
  const t = useTranslations('projectApp.scopes');
  const tProjectApps = useTranslations('projectApps');
  const scope = useScopeFromParams();
  const projectId = useMemo(() => (scope?.id ? scope.id.split(':')[1] : undefined), [scope]);

  const canUpdate = useGrant(ResourceSlug.ProjectApp, ResourceAction.Update, {
    scope: scope!,
  });

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [scopesAttachmentFilter, setScopesAttachmentFilter] =
    useState<DetailAttachmentFilter>('all');
  const [optimisticScopes, setOptimisticScopes] = useState<string[]>(projectApp.scopes ?? []);
  const [updatingScopeSlug, setUpdatingScopeSlug] = useState<string | null>(null);

  const { updateProjectApp } = useProjectAppMutations();

  const { scopeSlugs, loading, error, refetch } = useProjectAppFormData(scope, projectId);

  useEffect(() => {
    setOptimisticScopes(projectApp.scopes ?? []);
  }, [projectApp.scopes]);

  const scopeQuerySlugs = useMemo(
    () => resolveDetailQueryIds(scopesAttachmentFilter, optimisticScopes),
    [scopesAttachmentFilter, optimisticScopes]
  );

  const filteredScopeSlugs = useMemo(() => {
    if (scopesAttachmentFilter === 'selected' && scopeQuerySlugs?.length === 0) {
      return [];
    }

    const selectedSlugSet = scopeQuerySlugs != null ? new Set(scopeQuerySlugs) : null;
    const normalizedSearch = search.trim().toLowerCase();

    return scopeSlugs
      .filter((scopeSlug) => {
        if (selectedSlugSet && !selectedSlugSet.has(scopeSlug.slug)) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return (
          scopeSlug.name.toLowerCase().includes(normalizedSearch) ||
          scopeSlug.slug.toLowerCase().includes(normalizedSearch) ||
          (scopeSlug.description?.toLowerCase().includes(normalizedSearch) ?? false)
        );
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [scopeSlugs, scopeQuerySlugs, scopesAttachmentFilter, search]);

  const totalCount = filteredScopeSlugs.length;
  const totalPages = Math.ceil(totalCount / SCOPES_PAGE_LIMIT);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const tableScopes = useMemo(() => {
    const start = (page - 1) * SCOPES_PAGE_LIMIT;
    return filteredScopeSlugs.slice(start, start + SCOPES_PAGE_LIMIT);
  }, [filteredScopeSlugs, page]);

  const isScopeChecked = useCallback(
    (slug: string) => optimisticScopes.includes(slug),
    [optimisticScopes]
  );

  const debouncedUpdateScopes = useDebounce(
    async (slug: string, shouldAdd: boolean, currentScopes: string[]) => {
      if (!scope) return;

      setUpdatingScopeSlug(slug);
      try {
        const nextScopes = shouldAdd
          ? [...currentScopes, slug]
          : currentScopes.filter((value) => value !== slug);

        await updateProjectApp(projectApp.id, {
          scope,
          scopes: nextScopes,
        });
      } finally {
        setUpdatingScopeSlug(null);
      }
    },
    300
  );

  const handleScopeToggle = useCallback(
    (slug: string, checked: boolean) => {
      const currentScopes = [...optimisticScopes];
      const nextScopes = checked
        ? [...currentScopes, slug]
        : currentScopes.filter((value) => value !== slug);

      setOptimisticScopes(nextScopes);
      debouncedUpdateScopes(slug, checked, currentScopes);
    },
    [debouncedUpdateScopes, optimisticScopes]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleAttachmentFilterChange = useCallback((value: DetailAttachmentFilter) => {
    setScopesAttachmentFilter(value);
    setPage(1);
  }, []);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const columns: DataTableColumnConfig<ScopeSlugOption>[] = [
    {
      key: 'checkbox',
      header: '',
      ...DETAIL_CHECKBOX_COLUMN,
      render: (scopeSlug: ScopeSlugOption) => (
        <DetailTableCheckboxCell>
          <Checkbox
            checked={isScopeChecked(scopeSlug.slug)}
            onCheckedChange={(checked) => handleScopeToggle(scopeSlug.slug, checked === true)}
            disabled={!canUpdate}
          />
        </DetailTableCheckboxCell>
      ),
    },
    {
      key: 'icon',
      header: '',
      ...DETAIL_ICON_COLUMN,
      render: (scopeSlug: ScopeSlugOption) => (
        <DetailTableIconCell>
          <Avatar
            initial={scopeSlug.name.charAt(0)}
            size="sm"
            icon={<Key className="h-3 w-3 text-muted-foreground" />}
          />
        </DetailTableIconCell>
      ),
    },
    {
      key: 'name',
      header: t('table.name'),
      width: '240px',
      ...DETAIL_TEXT_COLUMN,
      className: DETAIL_PRIMARY_CONTENT_COLUMN_CLASS,
      render: (scopeSlug: ScopeSlugOption) => (
        <span className="text-sm font-medium">{scopeSlug.name}</span>
      ),
    },
    {
      key: 'scope',
      header: t('table.scope'),
      width: '220px',
      ...DETAIL_TEXT_COLUMN,
      className: DETAIL_CONTENT_COLUMN_CLASS,
      render: (scopeSlug: ScopeSlugOption) => (
        <span className="font-mono text-xs rounded bg-muted px-2 py-1 text-muted-foreground break-all">
          {scopeSlug.slug}
        </span>
      ),
    },
    {
      key: 'description',
      header: t('table.description'),
      width: '280px',
      ...DETAIL_TEXT_COLUMN,
      className: DETAIL_CONTENT_COLUMN_CLASS,
      render: (scopeSlug: ScopeSlugOption) => (
        <span className="text-sm text-muted-foreground">{scopeSlug.description ?? '—'}</span>
      ),
    },
    {
      key: 'loading',
      header: '',
      ...DETAIL_LOADING_COLUMN,
      render: (scopeSlug: ScopeSlugOption) =>
        updatingScopeSlug === scopeSlug.slug ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : null,
    },
  ];

  const { visibleColumns, columnToggleItems, toggleColumn, filterSkeletonColumns } =
    useDetailTableColumnVisibility(columns);

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: filterSkeletonColumns([
      DETAIL_CHECKBOX_SKELETON,
      DETAIL_ICON_SKELETON,
      { key: 'name', type: 'text', ...DETAIL_TEXT_COLUMN },
      { key: 'scope', type: 'text', ...DETAIL_TEXT_COLUMN },
      { key: 'description', type: 'text', ...DETAIL_TEXT_COLUMN },
      DETAIL_LOADING_SKELETON,
    ]),
    rowCount: 5,
  };

  if (error) {
    return (
      <FeatureModuleCard title={t('title')} collapsible>
        <p className="text-sm text-destructive">{t('error')}</p>
      </FeatureModuleCard>
    );
  }

  return (
    <FeatureModuleCard
      title={t('title')}
      description={t('description')}
      collapsible
      toolbar={
        <Toolbar
          fullWidth
          alwaysRow
          items={[
            <RefreshButton key="refresh" onRefresh={handleRefresh} loading={loading} iconOnly />,
            <DetailAttachmentFilterToggle
              key="attachment-filter"
              value={scopesAttachmentFilter}
              onChange={handleAttachmentFilterChange}
            />,
            toolbarGrow(
              <ProjectAppScopeSearch
                key="search"
                search={search}
                onSearchChange={handleSearchChange}
                grow
              />
            ),
            <DataTableColumnToggle
              key="columns"
              columns={columnToggleItems}
              onToggle={toggleColumn}
            />,
          ]}
        />
      }
      footer={
        totalPages > 1 ? (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        ) : undefined
      }
    >
      {!loading && scopeSlugs.length === 0 ? (
        <Alert variant="info" className="rounded-lg border-info bg-info/10">
          <AlertDescription>{tProjectApps('form.noScopesAvailable')}</AlertDescription>
        </Alert>
      ) : (
        <DataTable
          data={tableScopes}
          columns={visibleColumns}
          loading={loading}
          emptyState={{
            icon: <Key />,
            title: t('empty'),
            description: t('emptyDescription'),
          }}
          skeletonConfig={skeletonConfig}
        />
      )}
    </FeatureModuleCard>
  );
}
