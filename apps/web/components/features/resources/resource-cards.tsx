'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { TagColor } from '@grantjs/constants';
import { Resource } from '@grantjs/schema';
import { Activity, Package, PackagePlus, Tags, Zap } from 'lucide-react';

import {
  CardBody,
  CardGrid,
  CardHeader,
  EntityCreateNavigateButton,
  EntityNavigationButton,
  LoadedCountChip,
} from '@/components/common';
import { usePageCardFields } from '@/hooks/common';
import { getEntityTagCount, getPrimaryTagFromEntity } from '@/lib/entity-list';
import { useResourcesStore } from '@/stores/resources.store';

import { ResourceActions } from './resource-actions';
import { ResourceActiveStatusLabel } from './resource-active-status-label';
import { ResourceAudit } from './resource-audit';
import { ResourceCardSkeleton } from './resource-card-skeleton';

export function ResourceCards() {
  const t = useTranslations('resources');
  const tCommon = useTranslations('common');

  const cardFields = useMemo(
    () => [
      { key: 'isActive', label: t('table.isActive') },
      { key: 'actions', label: t('form.actions') },
      { key: 'tags', label: t('table.tags') },
    ],
    [t]
  );
  const { arrange } = usePageCardFields(cardFields, { listId: 'resources.list' });

  const limit = useResourcesStore((state) => state.limit);
  const search = useResourcesStore((state) => state.search);
  const resources = useResourcesStore((state) => state.resources);
  const loading = useResourcesStore((state) => state.loading);

  return (
    <CardGrid<Resource>
      entities={resources}
      loading={loading}
      emptyState={{
        icon: <Package />,
        title: search ? t('noSearchResults.title') : t('noResources.title'),
        description: search ? t('noSearchResults.description') : t('noResources.description'),
        action: search ? undefined : (
          <EntityCreateNavigateButton
            entitySegment="resources"
            label={t('createDialog.trigger')}
            icon={PackagePlus}
            alwaysShowLabel
          />
        ),
      }}
      skeleton={{
        component: <ResourceCardSkeleton />,
        count: limit,
      }}
      renderHeader={(resource: Resource) => {
        const primaryTag = getPrimaryTagFromEntity(resource);
        return (
          <CardHeader
            avatar={{
              initial: resource.name.charAt(0),
              size: 'lg',
            }}
            title={resource.name}
            description={resource.description || undefined}
            color={primaryTag?.color as TagColor | undefined}
            actions={<ResourceActions resource={resource} />}
          />
        );
      }}
      renderBody={(resource: Resource) => (
        <CardBody
          items={arrange([
            {
              key: 'isActive',
              label: {
                icon: <Activity className="h-3 w-3" />,
                text: t('table.isActive'),
              },
              value: <ResourceActiveStatusLabel isActive={resource.isActive} />,
            },
            {
              key: 'actions',
              label: {
                icon: <Zap className="h-3 w-3" />,
                text: t('form.actions'),
              },
              value: (
                <LoadedCountChip
                  items={resource.actions?.map((action) => ({ id: action, name: action }))}
                  count={resource.actions?.length ?? 0}
                >
                  {t('actionCount', { count: resource.actions?.length ?? 0 })}
                </LoadedCountChip>
              ),
            },
            {
              key: 'tags',
              label: {
                icon: <Tags className="h-3 w-3" />,
                text: t('table.tags'),
              },
              value: (
                <LoadedCountChip items={resource.tags} count={getEntityTagCount(resource)}>
                  {tCommon('tagCount', { count: getEntityTagCount(resource) })}
                </LoadedCountChip>
              ),
            },
          ])}
        />
      )}
      renderFooter={(resource: Resource) => (
        <div className="flex items-center justify-between w-full gap-2">
          <ResourceAudit resource={resource} />
          <EntityNavigationButton
            entitySegment="resources"
            entityId={resource.id}
            ariaLabel={t('actions.view')}
            size="lg"
          />
        </div>
      )}
    />
  );
}
