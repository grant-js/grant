'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { type RelationPreviewTarget, useRelationPreview } from '@/hooks/common';
import { Link } from '@/i18n/navigation';
import { type EntitySegment, getEntityDetailUrl } from '@/lib/entity-detail-url';

/** How many related items the preview lists before "View all". */
const RELATION_PREVIEW_LIMIT = 10;
const OPEN_DELAY_MS = 300;
const CLOSE_DELAY_MS = 150;

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
};

export type RelationCountChipProps = RelationPreviewTarget & {
  entityId: string;
  /** Number of related items, as the list already knows it. */
  count: number;
  /** The chip's text, e.g. "3 roles". */
  children: ReactNode;
};

/**
 * A relationship count chip ("3 roles") that previews what it counts. Hovering it (after a
 * short delay), focusing it or tapping it fetches that one entity's relationship and lists up
 * to ten items, each a link to its detail page (tags, which have none, as chips), with "View
 * all" to the entity's own page when there are more. Nothing is fetched before that, and a
 * zero count opens nothing. A failed fetch says "Not available", never an error toast.
 */
export function RelationCountChip({
  entity,
  relation,
  entityId,
  count,
  children,
}: RelationCountChipProps) {
  const t = useTranslations('common.relationPreview');
  const tCommon = useTranslations('common');
  const params = useParams();
  const target = { entity, relation } as RelationPreviewTarget;
  const { load, items, loading, error, called } = useRelationPreview(target, entityId);

  const [open, setOpen] = useState(false);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const clearTimers = () => {
    if (openTimer.current !== null) window.clearTimeout(openTimer.current);
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  };
  useEffect(() => clearTimers, []);

  const show = () => {
    clearTimers();
    if (!called) load();
    setOpen(true);
  };
  const showSoon = () => {
    clearTimers();
    openTimer.current = window.setTimeout(show, OPEN_DELAY_MS);
  };
  const hideSoon = () => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  const detailUrl = (segment: EntitySegment, id: string): string | null => {
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

  if (count <= 0) {
    return <Badge variant="secondary">{children}</Badge>;
  }

  const relationSegment = RELATION_SEGMENT[relation];
  const shown = (items ?? []).slice(0, RELATION_PREVIEW_LIMIT);
  const viewAllHref =
    Math.max(count, items?.length ?? 0) > RELATION_PREVIEW_LIMIT
      ? detailUrl(ENTITY_SEGMENT[entity], entityId)
      : null;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) show();
        else {
          clearTimers();
          setOpen(false);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onMouseEnter={showSoon}
          onMouseLeave={hideSoon}
          onFocus={show}
          aria-haspopup="dialog"
        >
          <Badge variant="secondary" className="cursor-pointer">
            {children}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64 p-2"
        onMouseEnter={clearTimers}
        onMouseLeave={hideSoon}
        onOpenAutoFocus={(event) => event.preventDefault()}
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
          <ul className="space-y-0.5" data-testid="relation-items">
            {shown.map((item) => {
              const href = relationSegment ? detailUrl(relationSegment, item.id) : null;
              return (
                <li key={item.id} className="truncate text-sm">
                  {href ? (
                    <Link
                      href={href}
                      className="block truncate rounded px-1 py-0.5 hover:bg-accent hover:underline"
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <Badge variant="outline" className="max-w-full truncate">
                      {item.name}
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
      </PopoverContent>
    </Popover>
  );
}
