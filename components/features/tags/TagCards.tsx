'use client';

import { Tag as TagIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CardGrid, CardHeader } from '@/components/common';
import { Tag } from '@/graphql/generated/types';
import { useTagsStore } from '@/stores/tags.store';

import { CreateTagDialog } from './CreateTagDialog';
import { TagActions } from './TagActions';
import { TagAudit } from './TagAudit';
import { TagCardSkeleton } from './TagCardSkeleton';

export function TagCards() {
  const t = useTranslations('tags');
  const { tags, loading, limit, search } = useTagsStore();

  return (
    <CardGrid<Tag>
      entities={tags}
      loading={loading}
      emptyState={{
        icon: TagIcon,
        title: search ? t('noSearchResults.title') : t('noTags.title'),
        description: search ? t('noSearchResults.description') : t('noTags.description'),
        action: search ? undefined : <CreateTagDialog />,
      }}
      skeleton={{
        component: <TagCardSkeleton />,
        count: limit,
      }}
      renderHeader={(tag: Tag) => (
        <CardHeader
          avatar={{
            initial: tag.name.charAt(0),
            size: 'lg',
          }}
          title={tag.name}
          description={tag.color}
          color={tag.color}
          actions={<TagActions tag={tag} />}
        />
      )}
      renderBody={() => null} // Tags don't have additional body content
      renderFooter={(tag: Tag) => (
        <div className="flex items-center justify-between w-full">
          <TagAudit tag={tag} />
        </div>
      )}
    />
  );
}
