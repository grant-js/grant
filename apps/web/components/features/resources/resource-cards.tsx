'use client';

import { TagColor } from '@grantjs/constants';
import { Resource, Tag } from '@grantjs/schema';
import { Package, Tags, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CardBody, CardGrid, CardHeader, ScrollBadges } from '@/components/common';
import { transformTagsToBadges } from '@/lib/tag';
import { useResourcesStore } from '@/stores/resources.store';

import { ResourceActions } from './resource-actions';
import { ResourceAudit } from './resource-audit';
import { ResourceCardSkeleton } from './resource-card-skeleton';
import { ResourceCreateDialog } from './resource-create-dialog';

export function ResourceCards() {
  const t = useTranslations('resources');

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
        action: search ? undefined : <ResourceCreateDialog />,
      }}
      skeleton={{
        component: <ResourceCardSkeleton />,
        count: limit,
      }}
      renderHeader={(resource: Resource) => (
        <CardHeader
          avatar={{
            initial: resource.name.charAt(0),
            size: 'lg',
          }}
          title={resource.name}
          description={resource.description || undefined}
          color={resource.tags?.find((tag: Tag) => tag.isPrimary)?.color as TagColor}
          actions={<ResourceActions resource={resource} />}
        />
      )}
      renderBody={(resource: Resource) => (
        <CardBody
          items={[
            {
              label: {
                icon: <Zap className="h-3 w-3" />,
                text: t('form.actions'),
              },
              value: (
                <ScrollBadges
                  items={
                    resource.actions?.map((action) => ({
                      id: action,
                      label: action,
                    })) || []
                  }
                  height={60}
                />
              ),
            },
            {
              label: {
                icon: <Tags className="h-3 w-3" />,
                text: t('form.tags'),
              },
              value: (
                <ScrollBadges
                  items={transformTagsToBadges(resource.tags)}
                  height={60}
                  showAsRound={true}
                />
              ),
            },
          ]}
        />
      )}
      renderFooter={(resource: Resource) => <ResourceAudit resource={resource} />}
    />
  );
}
