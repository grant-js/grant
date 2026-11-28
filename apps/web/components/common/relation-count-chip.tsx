'use client';

import { type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { type RelationPreviewTarget, useRelationPreview } from '@/hooks/common';
import { Link } from '@/i18n/navigation';
import { type EntitySegment, getEntityDetailUrl } from '@/lib/entity-detail-url';
import { translateNameKey } from '@/lib/translate-or-raw';

import { ChipPopover } from './chip-popover';
import { UserLabel } from './user-label';

/** How many related items a fetched preview lists before "View all". */
const RELATION_PREVIEW_LIMIT = 10;

const ENTITY_SEGMENT: Record<RelationPreviewTarget['entity'], EntitySegment> = {
  user: 'users',
  role: 'roles',
  group: 'groups',
  permission: 'permissions',
};

/** Tags have no detail page; the other relationships link to theirs. */
const RELATION_SEGMENT: Partial<Record<RelationPreviewTarget['relation'], EntitySegment>> = {
  roles: 'roles',
  groups: 'groups',
  permissions: 'permissions',
  users: 'users',
};

interface PreviewItem {
  id: string;
  name: string;
  /** Users only: their email shows next to the name. */
  authenticationMethods?: ReadonlyArray<{ provider: string; providerId: string }> | null;
}

interface PreviewState {
  items: PreviewItem[] | undefined;
  loading: boolean;
  error: boolean;
  /** Called on the first open; absent when the items are already loaded. */
  load?: () => void;
  called: boolean;
}

function useDetailUrl() {
  const params = useParams();
  return (segment: EntitySegment, id: string): string | null => {
    try {
      return getEntityDetailUrl({
        organizationId: params.organizationId as string | undefined,
        accountId: params.accountId as string | undefined,
        projectId: params.projectId as string | undefined,
        entitySegment: segment,
        entityId: id,
      });
    } catch {
      return null;
    }
  };
}

interface CountChipPopoverProps {
  count: number;
  children: ReactNode;
  state: PreviewState;
  /** The link of each listed item; none renders it as a chip. */
  itemHref: (item: PreviewItem) => string | null;
  /** Whether the items are users, listed with their email. */
  users?: boolean;
  /** How many items to list; the rest are behind "View all". Unbounded when omitted. */
  limit?: number;
  viewAllHref?: string | null;
}

/** The list a count chip's popover shows: loading, "Not available", the items or "None". */
function CountChipPopover({
  count,
  children,
  state,
  itemHref,
  users = false,
  limit,
  viewAllHref,
}: CountChipPopoverProps) {
  const t = useTranslations('common.relationPreview');
  const tCommon = useTranslations('common');
  const tRoot = useTranslations();
  const { load, items, loading, error, called } = state;

  const shown = limit === undefined ? (items ?? []) : (items ?? []).slice(0, limit);

  return (
    <ChipPopover
      label={children}
      hasContent={count > 0}
      contentClassName={users ? 'w-80' : undefined}
      onOpen={() => {
        if (!called) load?.();
      }}
    >
      {loading || (!called && !error) ? (
        <p className="px-1 py-1 text-sm text-muted-foreground" data-testid="relation-loading">
          {tCommon('loading')}
        </p>
      ) : error ? (
        <p className="px-1 py-1 text-sm text-muted-foreground" data-testid="relation-error">
          {t('notAvailable')}
        </p>
      ) : shown.length === 0 ? (
        <p className="px-1 py-1 text-sm text-muted-foreground">{t('none')}</p>
      ) : (
        <ul className="max-h-72 space-y-0.5 overflow-y-auto" data-testid="relation-items">
          {shown.map((item) => {
            const href = itemHref(item);
            const label = users ? <UserLabel user={item} /> : translateNameKey(tRoot, item.name);
            return (
              <li key={item.id} className="truncate text-sm">
                {href ? (
                  <Link
                    href={href}
                    className="block truncate rounded px-1 py-0.5 hover:bg-accent hover:underline"
                  >
                    {label}
                  </Link>
                ) : (
                  <Badge variant="outline" className="max-w-full truncate">
                    {translateNameKey(tRoot, item.name)}
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {viewAllHref && !loading && !error && (
        <Link
          href={viewAllHref}
          className="mt-1 block border-t px-1 pt-1.5 text-sm font-medium text-primary hover:underline"
        >
          {t('viewAll', { count: Math.max(count, items?.length ?? 0) })}
        </Link>
      )}
    </ChipPopover>
  );
}

export type RelationCountChipProps = RelationPreviewTarget & {
  entityId: string;
  /** Number of related items, as the list already knows it. */
  count: number;
  /** The chip's text, e.g. "3 roles". */
  children: ReactNode;
};

/**
 * A relationship count chip ("3 roles") whose list only knows the count. The first open
 * fetches that one entity's relationship and lists up to ten items, each a link to its detail
 * page (tags, which have none, as chips), with "View all" to the entity's own page when there
 * are more. Nothing is fetched before that.
 */
export function RelationCountChip({
  entity,
  relation,
  entityId,
  count,
  children,
}: RelationCountChipProps) {
  const target = { entity, relation } as RelationPreviewTarget;
  const preview = useRelationPreview(target, entityId);
  const detailUrl = useDetailUrl();

  const relationSegment = RELATION_SEGMENT[relation];
  const viewAllHref =
    Math.max(count, preview.items?.length ?? 0) > RELATION_PREVIEW_LIMIT
      ? detailUrl(ENTITY_SEGMENT[entity], entityId)
      : null;

  return (
    <CountChipPopover
      count={count}
      state={preview}
      itemHref={(item) => (relationSegment ? detailUrl(relationSegment, item.id) : null)}
      users={relation === 'users'}
      limit={RELATION_PREVIEW_LIMIT}
      viewAllHref={viewAllHref}
    >
      {children}
    </CountChipPopover>
  );
}

export interface LoadedCountChipProps {
  /** The related items the list already loaded with the entity. */
  items: ReadonlyArray<PreviewItem> | null | undefined;
  /** Number of related items, as the list shows it. */
  count: number;
  /** The detail page each item links to; without one, items show as chips (tags). */
  linkTo?: EntitySegment;
  /** The chip's text, e.g. "3 tags". */
  children: ReactNode;
}

/**
 * A count chip for items the list already loads with each entity (the tags of organizations,
 * projects, resources and apps; an API key's permissions; a resource's actions): the preview
 * lists those items, all of them, with nothing to fetch.
 */
export function LoadedCountChip({ items, count, linkTo, children }: LoadedCountChipProps) {
  const detailUrl = useDetailUrl();
  return (
    <CountChipPopover
      count={count}
      state={{ items: [...(items ?? [])], loading: false, error: false, called: true }}
      itemHref={(item) => (linkTo ? detailUrl(linkTo, item.id) : null)}
    >
      {children}
    </CountChipPopover>
  );
}
