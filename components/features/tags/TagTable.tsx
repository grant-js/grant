'use client';

import { Tag as TagIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Avatar } from '@/components/common/Avatar';
import { DataTable, type ColumnConfig } from '@/components/common/DataTable';
import { type ColumnConfig as SkeletonColumnConfig } from '@/components/common/TableSkeleton';
import { Badge } from '@/components/ui/badge';
import { Tag } from '@/graphql/generated/types';
import { getTagBorderClasses, TagColor } from '@/lib/constants/colors';
import { useTagsStore } from '@/stores/tags.store';

import { CreateTagDialog } from './CreateTagDialog';
import { TagActions } from './TagActions';
import { TagAudit } from './TagAudit';

export function TagTable() {
  const t = useTranslations('tags');
  const { tags, loading } = useTagsStore();

  const columns: ColumnConfig<any>[] = [
    {
      key: 'avatar',
      header: '',
      width: '60px',
      className: 'pl-4',
      render: (tag: Tag) => (
        <Avatar
          initial={tag.name.charAt(0)}
          size="md"
          className={
            tag.color ? `border-2 ${getTagBorderClasses(tag.color as TagColor)}` : undefined
          }
        />
      ),
    },
    {
      key: 'name',
      header: t('table.name'),
      width: '240px',
      render: (tag: Tag) => <span className="text-sm font-medium">{tag.name}</span>,
    },
    {
      key: 'color',
      header: t('table.color'),
      width: '150px',
      render: (tag: Tag) => (
        <div className="flex items-center space-x-2">
          <Badge
            variant="outline"
            className={`w-3 h-3 rounded-full p-0 border-2 bg-transparent ${getTagBorderClasses(tag.color as TagColor)}`}
          />
          <span className="capitalize">{tag.color}</span>
        </div>
      ),
    },
    {
      key: 'audit',
      header: t('table.audit'),
      width: '200px',
      render: (tag: Tag) => <TagAudit tag={tag} />,
    },
  ];

  const skeletonConfig: { columns: SkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'avatar', type: 'avatar-only' },
      { key: 'name', type: 'text' },
      { key: 'color', type: 'text' },
      { key: 'audit', type: 'audit' },
    ],
    rowCount: 5,
  };

  return (
    <DataTable
      data={tags}
      columns={columns}
      loading={loading}
      emptyState={{
        icon: <TagIcon className="h-12 w-12" />,
        title: t('noTags.title'),
        description: t('noTags.description'),
        action: <CreateTagDialog />,
      }}
      actionsColumn={{
        render: (tag) => <TagActions tag={tag} />,
      }}
      skeletonConfig={skeletonConfig}
    />
  );
}
