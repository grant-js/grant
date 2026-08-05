'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { EVENT_TYPES, type EventType } from '@grantjs/schema';
import { Loader2, Zap } from 'lucide-react';

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
import { Checkbox } from '@/components/ui/checkbox';
import { useDetailTableColumnVisibility } from '@/hooks/common';
import { type DetailAttachmentFilter, resolveDetailQueryIds } from '@/lib/detail-attachment-filter';
import { eventTypeLabelKey } from '@/lib/event-type-label.lib';

import { WebhookEventSearch } from './webhook-event-search';

const EVENTS_PAGE_LIMIT = 10;

interface EventTypeRow {
  type: EventType;
}

export interface WebhookEventTypesTableProps {
  title: string;
  description: string;
  selectedEventTypes: string[];
  onToggle: (eventType: EventType, checked: boolean) => void;
  isToggleDisabled?: (eventType: EventType, isChecked: boolean) => boolean;
  updatingEventType?: string | null;
  onRefresh?: () => void | Promise<unknown>;
  refreshLoading?: boolean;
  children?: ReactNode;
}

export function WebhookEventTypesTable({
  title,
  description,
  selectedEventTypes,
  onToggle,
  isToggleDisabled,
  updatingEventType = null,
  onRefresh,
  refreshLoading = false,
  children,
}: WebhookEventTypesTableProps) {
  const t = useTranslations('webhooks.events');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [eventsAttachmentFilter, setEventsAttachmentFilter] =
    useState<DetailAttachmentFilter>('all');

  const eventQueryTypes = useMemo(
    () => resolveDetailQueryIds(eventsAttachmentFilter, selectedEventTypes),
    [eventsAttachmentFilter, selectedEventTypes]
  );

  const allEventRows = useMemo<EventTypeRow[]>(() => EVENT_TYPES.map((type) => ({ type })), []);

  const eventLabel = useCallback((type: EventType) => t(eventTypeLabelKey(type)), [t]);

  const filteredEventRows = useMemo(() => {
    if (eventsAttachmentFilter === 'selected' && eventQueryTypes?.length === 0) {
      return [];
    }

    const selectedTypeSet = eventQueryTypes != null ? new Set(eventQueryTypes) : null;
    const normalizedSearch = search.trim().toLowerCase();

    return allEventRows
      .filter((row) => {
        if (selectedTypeSet && !selectedTypeSet.has(row.type)) {
          return false;
        }
        if (!normalizedSearch) {
          return true;
        }
        const label = eventLabel(row.type).toLowerCase();
        return (
          row.type.toLowerCase().includes(normalizedSearch) || label.includes(normalizedSearch)
        );
      })
      .sort((left, right) => eventLabel(left.type).localeCompare(eventLabel(right.type)));
  }, [allEventRows, eventLabel, eventQueryTypes, eventsAttachmentFilter, search]);

  const totalCount = filteredEventRows.length;
  const totalPages = Math.ceil(totalCount / EVENTS_PAGE_LIMIT);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const tableEvents = useMemo(() => {
    const start = (page - 1) * EVENTS_PAGE_LIMIT;
    return filteredEventRows.slice(start, start + EVENTS_PAGE_LIMIT);
  }, [filteredEventRows, page]);

  const isEventChecked = useCallback(
    (eventType: string) => selectedEventTypes.includes(eventType),
    [selectedEventTypes]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleAttachmentFilterChange = useCallback((value: DetailAttachmentFilter) => {
    setEventsAttachmentFilter(value);
    setPage(1);
  }, []);

  const handleRefresh = useCallback(async () => {
    await onRefresh?.();
  }, [onRefresh]);

  const showLoadingColumn = onRefresh != null;

  const columns: DataTableColumnConfig<EventTypeRow>[] = [
    {
      key: 'checkbox',
      header: '',
      ...DETAIL_CHECKBOX_COLUMN,
      render: (row) => {
        const checked = isEventChecked(row.type);
        return (
          <DetailTableCheckboxCell>
            <Checkbox
              checked={checked}
              onCheckedChange={(nextChecked) => onToggle(row.type, nextChecked === true)}
              disabled={isToggleDisabled?.(row.type, checked) ?? false}
            />
          </DetailTableCheckboxCell>
        );
      },
    },
    {
      key: 'icon',
      header: '',
      ...DETAIL_ICON_COLUMN,
      render: () => (
        <DetailTableIconCell>
          <Avatar initial="E" size="sm" icon={<Zap className="h-3 w-3 text-muted-foreground" />} />
        </DetailTableIconCell>
      ),
    },
    {
      key: 'name',
      header: t('table.name'),
      width: '240px',
      ...DETAIL_TEXT_COLUMN,
      className: DETAIL_PRIMARY_CONTENT_COLUMN_CLASS,
      render: (row) => <span className="text-sm font-medium">{eventLabel(row.type)}</span>,
    },
    {
      key: 'event',
      header: t('table.event'),
      width: '220px',
      ...DETAIL_TEXT_COLUMN,
      className: DETAIL_CONTENT_COLUMN_CLASS,
      render: (row) => (
        <span className="break-all rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
          {row.type}
        </span>
      ),
    },
    ...(showLoadingColumn
      ? [
          {
            key: 'loading',
            header: '',
            ...DETAIL_LOADING_COLUMN,
            render: (row: EventTypeRow) =>
              updatingEventType === row.type ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : null,
          } satisfies DataTableColumnConfig<EventTypeRow>,
        ]
      : []),
  ];

  const { visibleColumns, columnToggleItems, toggleColumn, filterSkeletonColumns } =
    useDetailTableColumnVisibility(columns);

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: filterSkeletonColumns([
      DETAIL_CHECKBOX_SKELETON,
      DETAIL_ICON_SKELETON,
      { key: 'name', type: 'text', ...DETAIL_TEXT_COLUMN },
      { key: 'event', type: 'text', ...DETAIL_TEXT_COLUMN },
      ...(showLoadingColumn ? [DETAIL_LOADING_SKELETON] : []),
    ]),
    rowCount: 5,
  };

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
              ? [
                  <RefreshButton
                    key="refresh"
                    onRefresh={handleRefresh}
                    loading={refreshLoading}
                    iconOnly
                  />,
                ]
              : []),
            <DetailAttachmentFilterToggle
              key="attachment-filter"
              value={eventsAttachmentFilter}
              onChange={handleAttachmentFilterChange}
            />,
            toolbarGrow(
              <WebhookEventSearch
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
      <DataTable
        data={tableEvents}
        columns={visibleColumns}
        loading={false}
        emptyState={{
          icon: <Zap />,
          title: t('empty'),
          description: t('emptyDescription'),
        }}
        skeletonConfig={skeletonConfig}
      />
      {children}
    </FeatureModuleCard>
  );
}
