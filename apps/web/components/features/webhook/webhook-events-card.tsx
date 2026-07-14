'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { EVENT_TYPES, type EventType, type WebhookSubscription } from '@grantjs/schema';
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
import {
  useDebounce,
  useDetailTableColumnVisibility,
  useProjectGrantContext,
  useScopeFromParams,
} from '@/hooks/common';
import { useWebhookSubscriptionMutations } from '@/hooks/webhooks';
import { type DetailAttachmentFilter, resolveDetailQueryIds } from '@/lib/detail-attachment-filter';

import { WebhookEventSearch } from './webhook-event-search';

const EVENTS_PAGE_LIMIT = 10;

const SELECTABLE_EVENT_TYPES = EVENT_TYPES.filter((type) => type !== 'api_key.rotated');

interface EventTypeRow {
  type: EventType;
}

interface WebhookEventsCardProps {
  subscription: WebhookSubscription;
  onAfterWebhookMutation?: () => void | Promise<unknown>;
}

export function WebhookEventsCard({
  subscription,
  onAfterWebhookMutation,
}: WebhookEventsCardProps) {
  const t = useTranslations('webhooks.events');
  const scope = useScopeFromParams();
  const projectGrantContext = useProjectGrantContext();
  const { update } = useWebhookSubscriptionMutations(scope);

  const canUpdate = useGrant(ResourceSlug.Project, ResourceAction.Update, {
    scope: scope!,
    context: projectGrantContext,
  });

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [eventsAttachmentFilter, setEventsAttachmentFilter] =
    useState<DetailAttachmentFilter>('all');
  const [optimisticEventTypes, setOptimisticEventTypes] = useState<string[]>(
    subscription.eventTypes
  );
  const [updatingEventType, setUpdatingEventType] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticEventTypes(subscription.eventTypes);
  }, [subscription.eventTypes]);

  const eventQueryTypes = useMemo(
    () => resolveDetailQueryIds(eventsAttachmentFilter, optimisticEventTypes),
    [eventsAttachmentFilter, optimisticEventTypes]
  );

  const allEventRows = useMemo<EventTypeRow[]>(
    () => SELECTABLE_EVENT_TYPES.map((type) => ({ type })),
    []
  );

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
        return row.type.toLowerCase().includes(normalizedSearch);
      })
      .sort((left, right) => left.type.localeCompare(right.type));
  }, [allEventRows, eventQueryTypes, eventsAttachmentFilter, search]);

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
    (eventType: string) => optimisticEventTypes.includes(eventType),
    [optimisticEventTypes]
  );

  const debouncedUpdateEvents = useDebounce(
    async (eventType: string, shouldAdd: boolean, currentEventTypes: string[]) => {
      if (!scope) {
        return;
      }

      setUpdatingEventType(eventType);
      try {
        const nextEventTypes = shouldAdd
          ? [...currentEventTypes, eventType]
          : currentEventTypes.filter((value) => value !== eventType);

        await update(subscription.id, { eventTypes: nextEventTypes as EventType[] });
        await onAfterWebhookMutation?.();
      } finally {
        setUpdatingEventType(null);
      }
    },
    300
  );

  const handleEventToggle = useCallback(
    (eventType: string, checked: boolean) => {
      const currentEventTypes = [...optimisticEventTypes];

      if (!checked && currentEventTypes.length <= 1) {
        return;
      }

      const nextEventTypes = checked
        ? [...currentEventTypes, eventType]
        : currentEventTypes.filter((value) => value !== eventType);

      setOptimisticEventTypes(nextEventTypes);
      debouncedUpdateEvents(eventType, checked, currentEventTypes);
    },
    [debouncedUpdateEvents, optimisticEventTypes]
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
    await onAfterWebhookMutation?.();
  }, [onAfterWebhookMutation]);

  const columns: DataTableColumnConfig<EventTypeRow>[] = [
    {
      key: 'checkbox',
      header: '',
      ...DETAIL_CHECKBOX_COLUMN,
      render: (row) => (
        <DetailTableCheckboxCell>
          <Checkbox
            checked={isEventChecked(row.type)}
            onCheckedChange={(checked) => handleEventToggle(row.type, checked === true)}
            disabled={!canUpdate || (isEventChecked(row.type) && optimisticEventTypes.length <= 1)}
          />
        </DetailTableCheckboxCell>
      ),
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
      render: (row) => <span className="text-sm font-medium">{row.type}</span>,
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
    {
      key: 'loading',
      header: '',
      ...DETAIL_LOADING_COLUMN,
      render: (row) =>
        updatingEventType === row.type ? (
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
      { key: 'event', type: 'text', ...DETAIL_TEXT_COLUMN },
      DETAIL_LOADING_SKELETON,
    ]),
    rowCount: 5,
  };

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
            <RefreshButton key="refresh" onRefresh={handleRefresh} loading={false} iconOnly />,
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
    </FeatureModuleCard>
  );
}
