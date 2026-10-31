'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { machineOnlyGate } from '@grantjs/constants';
import { ChevronDown, KeyRound, Loader2 } from 'lucide-react';

import {
  DataTable,
  type DataTableColumnConfig,
  DataTableColumnToggle,
  DETAIL_CHECKBOX_COLUMN,
  DETAIL_CHECKBOX_SKELETON,
  DETAIL_CONTENT_COLUMN_CLASS,
  DETAIL_LOADING_COLUMN,
  DETAIL_LOADING_SKELETON,
  DETAIL_PRIMARY_CONTENT_COLUMN_CLASS,
  DETAIL_TEXT_COLUMN,
  DetailAttachmentFilterToggle,
  DetailTableCheckboxCell,
  FeatureModuleCard,
  Pagination,
  RefreshButton,
  type TableSkeletonColumnConfig,
  Toolbar,
  toolbarGrow,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDetailTableColumnVisibility } from '@/hooks/common';
import {
  API_KEY_SCOPES_PAGE_LIMIT,
  type ApiKeyScopeGroup,
  type ApiKeyScopeRow,
  getScopeGroupState,
  groupScopeRows,
  toggleScopeGroup,
  toggleScopeRow,
} from '@/lib/api-key-scope-groups';
import type { DetailAttachmentFilter } from '@/lib/detail-attachment-filter';
import {
  isKeyLike,
  type KeyTranslator,
  toCamelCaseSlug,
  translateOrRaw,
  translatePermissionField,
} from '@/lib/translate-or-raw';
import { cn } from '@/lib/utils';

import { ApiKeyScopeSearch } from './api-key-scope-search';

type ScopeTableItem =
  | { kind: 'group'; group: ApiKeyScopeGroup; rowsInView: ApiKeyScopeRow[]; collapsed: boolean }
  | { kind: 'row'; row: ApiKeyScopeRow };

export interface ApiKeyScopesTableProps {
  title: string;
  description?: string;
  rows: ApiKeyScopeRow[];
  selectedIds: readonly string[];
  /** Called with the whole next selection; omitted (or `readOnly`) renders the checkboxes disabled. */
  onSelectionChange?: (nextIds: string[]) => void;
  readOnly?: boolean;
  /** Rows shown but not togglable, with the reason shown in a tooltip. */
  disabledRows?: ReadonlyMap<string, string>;
  /** Rows whose change is being saved. */
  updatingIds?: ReadonlySet<string>;
  loading?: boolean;
  error?: boolean;
  onRefresh?: () => void | Promise<unknown>;
  /** The create picker shows the whole catalogue; the detail card pages it. */
  paginated?: boolean;
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  /** Shown above the table (e.g. which model governs the key). */
  notice?: ReactNode;
  /** Shown in the card footer, after the pager (e.g. "Convert to scopes"). */
  footerActions?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ApiKeyScopesTable({
  title,
  description,
  rows,
  selectedIds,
  onSelectionChange,
  readOnly = false,
  disabledRows,
  updatingIds,
  loading = false,
  error = false,
  onRefresh,
  paginated = false,
  page = 1,
  limit = API_KEY_SCOPES_PAGE_LIMIT,
  onPageChange,
  notice,
  footerActions,
  emptyTitle,
  emptyDescription,
}: ApiKeyScopesTableProps) {
  const t = useTranslations('user.apiKeys.scopes');
  const tRoot = useTranslations();
  const translate = tRoot as unknown as KeyTranslator;

  const [search, setSearch] = useState('');
  const [attachmentFilter, setAttachmentFilter] = useState<DetailAttachmentFilter>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(new Set());

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const disabledIds = useMemo(() => new Set(disabledRows?.keys() ?? []), [disabledRows]);
  const interactive = !readOnly && onSelectionChange !== undefined;

  const resourceLabel = useCallback(
    (group: ApiKeyScopeGroup) => {
      const byName = group.resourceName && translateOrRaw(translate, group.resourceName);
      if (byName && byName !== group.resourceName) return byName;
      const byCatalogue = `resources.names.${toCamelCaseSlug(group.key)}`;
      if (translate.has(byCatalogue)) return translate(byCatalogue);
      return group.resourceName && !isKeyLike(group.resourceName) ? group.resourceName : group.key;
    },
    [translate]
  );

  const rowsInView = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (attachmentFilter === 'selected' && !selectedSet.has(row.permission.id)) return false;
      if (!needle) return true;
      const haystack = [
        translatePermissionField(translate, row.permission, 'name'),
        translatePermissionField(translate, row.permission, 'description'),
        `${row.permission.resource?.slug ?? ''}:${row.permission.action}`,
        row.permission.resource?.name
          ? translateOrRaw(translate, row.permission.resource.name)
          : '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [rows, attachmentFilter, selectedSet, search, translate]);

  const paginate = paginated && rowsInView.length > limit;
  const totalPages = paginated ? Math.ceil(rowsInView.length / limit) : 0;

  useEffect(() => {
    if (paginated && totalPages > 0 && page > totalPages) {
      onPageChange?.(totalPages);
    }
  }, [paginated, page, totalPages, onPageChange]);

  const sortedRowsInView = useMemo(
    () => groupScopeRows(rowsInView).flatMap((group) => group.rows),
    [rowsInView]
  );

  const pageRows = useMemo(() => {
    if (!paginate) return sortedRowsInView;
    const start = (page - 1) * limit;
    return sortedRowsInView.slice(start, start + limit);
  }, [paginate, sortedRowsInView, page, limit]);

  const items = useMemo<ScopeTableItem[]>(() => {
    const groupsInView = new Map(groupScopeRows(rowsInView).map((group) => [group.key, group]));
    const searching = search.trim() !== '';
    const result: ScopeTableItem[] = [];
    for (const group of groupScopeRows(pageRows)) {
      const full = groupsInView.get(group.key) ?? group;
      const collapsed = !searching && collapsedGroups.has(group.key);
      result.push({ kind: 'group', group, rowsInView: full.rows, collapsed });
      if (!collapsed) {
        for (const row of group.rows) result.push({ kind: 'row', row });
      }
    }
    return result;
  }, [pageRows, rowsInView, collapsedGroups, search]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      onPageChange?.(1);
    },
    [onPageChange]
  );

  const handleFilterChange = useCallback(
    (value: DetailAttachmentFilter) => {
      setAttachmentFilter(value);
      onPageChange?.(1);
    },
    [onPageChange]
  );

  const toggleCollapsed = useCallback((key: string) => {
    setCollapsedGroups((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleRowToggle = useCallback(
    (permissionId: string, checked: boolean) => {
      onSelectionChange?.(toggleScopeRow(selectedIds, permissionId, checked));
    },
    [onSelectionChange, selectedIds]
  );

  const handleGroupToggle = useCallback(
    (groupRows: ApiKeyScopeRow[], checked: boolean) => {
      onSelectionChange?.(toggleScopeGroup(selectedIds, groupRows, disabledIds, checked));
    },
    [onSelectionChange, selectedIds, disabledIds]
  );

  const renderGroupRow = useCallback(
    (item: ScopeTableItem) => {
      if (item.kind !== 'group') return null;
      const { group, rowsInView: groupRows, collapsed } = item;
      const label = resourceLabel(group);
      const state = getScopeGroupState(groupRows, selectedSet, disabledIds);
      const selectedCount = groupRows.filter((row) => selectedSet.has(row.permission.id)).length;
      const checkboxId = `api-key-scope-group-${group.key}`;

      return (
        <div className="flex items-center gap-3 pl-1">
          <Checkbox
            id={checkboxId}
            checked={state === 'indeterminate' ? 'indeterminate' : state === 'checked'}
            onCheckedChange={(checked) => handleGroupToggle(groupRows, checked === true)}
            disabled={!interactive || state === 'disabled'}
            aria-label={t('groups.allActionsFor', { resource: label })}
          />
          <button
            type="button"
            onClick={() => toggleCollapsed(group.key)}
            aria-expanded={!collapsed}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ChevronDown
              className={cn(
                'size-4 shrink-0 text-muted-foreground transition-transform',
                collapsed && '-rotate-90'
              )}
              aria-hidden
            />
            <span className="truncate text-sm font-medium">{label}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {t('groups.count', { selected: selectedCount, total: groupRows.length })}
            </span>
          </button>
          <label htmlFor={checkboxId} className="shrink-0 text-xs text-muted-foreground">
            {t('groups.allActions')}
          </label>
        </div>
      );
    },
    [disabledIds, handleGroupToggle, interactive, resourceLabel, selectedSet, t, toggleCollapsed]
  );

  const renderMachineOnlyBadge = (row: ApiKeyScopeRow) => {
    if (!row.machineOnly) return null;
    const gate = machineOnlyGate(row.permission.resource?.slug ?? '', row.permission.action);
    const badge = <Badge variant="outline">{t('machineOnly.badge')}</Badge>;
    if (!gate) return badge;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">{badge}</span>
          </TooltipTrigger>
          <TooltipContent>
            {t('machineOnly.tooltip', { gate: `${gate.resource}:${gate.action}` })}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const columns: DataTableColumnConfig<ScopeTableItem>[] = [
    {
      key: 'checkbox',
      header: '',
      ...DETAIL_CHECKBOX_COLUMN,
      render: (item) => {
        if (item.kind !== 'row') return null;
        const id = item.row.permission.id;
        const reason = disabledRows?.get(id);
        const checkbox = (
          <Checkbox
            checked={selectedSet.has(id)}
            onCheckedChange={(checked) => handleRowToggle(id, checked === true)}
            disabled={!interactive || reason !== undefined}
            aria-label={t('table.select', {
              name: translatePermissionField(translate, item.row.permission, 'name'),
            })}
          />
        );
        if (reason === undefined) {
          return <DetailTableCheckboxCell>{checkbox}</DetailTableCheckboxCell>;
        }
        return (
          <DetailTableCheckboxCell>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">{checkbox}</span>
                </TooltipTrigger>
                <TooltipContent>{reason}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DetailTableCheckboxCell>
        );
      },
    },
    {
      key: 'name',
      header: t('table.name'),
      width: '220px',
      ...DETAIL_TEXT_COLUMN,
      className: DETAIL_PRIMARY_CONTENT_COLUMN_CLASS,
      render: (item) =>
        item.kind === 'row' ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              {translatePermissionField(translate, item.row.permission, 'name')}
            </span>
            {renderMachineOnlyBadge(item.row)}
          </div>
        ) : null,
    },
    {
      key: 'permission',
      header: t('table.permission'),
      width: '200px',
      ...DETAIL_TEXT_COLUMN,
      className: DETAIL_CONTENT_COLUMN_CLASS,
      render: (item) =>
        item.kind === 'row' ? (
          <span className="break-all rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
            {item.row.permission.resource?.slug ?? '—'}:{item.row.permission.action}
          </span>
        ) : null,
    },
    {
      key: 'description',
      header: t('table.description'),
      width: '280px',
      ...DETAIL_TEXT_COLUMN,
      className: DETAIL_CONTENT_COLUMN_CLASS,
      render: (item) =>
        item.kind === 'row' ? (
          <span className="text-sm text-muted-foreground">
            {translatePermissionField(translate, item.row.permission, 'description') || '—'}
          </span>
        ) : null,
    },
    ...(updatingIds
      ? [
          {
            key: 'loading',
            header: '',
            ...DETAIL_LOADING_COLUMN,
            render: (item: ScopeTableItem) =>
              item.kind === 'row' && updatingIds.has(item.row.permission.id) ? (
                <Loader2
                  className="size-4 animate-spin text-muted-foreground"
                  aria-label={t('saving')}
                />
              ) : null,
          },
        ]
      : []),
  ];

  const { visibleColumns, columnToggleItems, toggleColumn, filterSkeletonColumns } =
    useDetailTableColumnVisibility(columns);

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: filterSkeletonColumns([
      DETAIL_CHECKBOX_SKELETON,
      { key: 'name', type: 'text', ...DETAIL_TEXT_COLUMN },
      { key: 'permission', type: 'text', ...DETAIL_TEXT_COLUMN },
      { key: 'description', type: 'text', ...DETAIL_TEXT_COLUMN },
      ...(updatingIds ? [DETAIL_LOADING_SKELETON] : []),
    ]),
    rowCount: 5,
  };

  if (error) {
    return (
      <FeatureModuleCard title={title} collapsible>
        <p className="text-sm text-destructive">{t('error')}</p>
      </FeatureModuleCard>
    );
  }

  const pager =
    paginate && onPageChange ? (
      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    ) : null;

  return (
    <FeatureModuleCard
      title={title}
      description={description}
      collapsible
      toolbar={
        <Toolbar
          fullWidth
          alwaysRow
          items={[
            ...(onRefresh
              ? [<RefreshButton key="refresh" onRefresh={onRefresh} loading={loading} iconOnly />]
              : []),
            <DetailAttachmentFilterToggle
              key="attachment-filter"
              value={attachmentFilter}
              onChange={handleFilterChange}
            />,
            toolbarGrow(
              <ApiKeyScopeSearch
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
        pager || footerActions ? (
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div>{pager}</div>
            {footerActions}
          </div>
        ) : undefined
      }
    >
      {notice}
      <DataTable
        data={items}
        columns={visibleColumns}
        loading={loading}
        fullWidthRow={renderGroupRow}
        emptyState={{
          icon: <KeyRound />,
          title: emptyTitle ?? t('empty'),
          description: emptyDescription ?? t('emptyDescription'),
        }}
        skeletonConfig={skeletonConfig}
      />
    </FeatureModuleCard>
  );
}
