'use client';

import { TagSortField, SortOrder } from '@logusgraphics/grant-schema';
import { useTranslations } from 'next-intl';

import { Sorter, type SortInput } from '@/components/common';
import { useTagsStore } from '@/stores/tags.store';

export function TagSorter() {
  const t = useTranslations('tags');

  const sort = useTagsStore((state) => state.sort);
  const setSort = useTagsStore((state) => state.setSort);

  const convertSort = (gqlSort?: {
    field: TagSortField;
    order: SortOrder;
  }): SortInput<TagSortField> | undefined => {
    if (!gqlSort) return undefined;
    return {
      field: gqlSort.field,
      order: gqlSort.order,
    };
  };

  const handleSortChange = (field: TagSortField, order: SortOrder) => {
    setSort(field, order);
  };

  const fields = [
    {
      value: TagSortField.Name,
      label: t('sort.name'),
    },
    {
      value: TagSortField.Color,
      label: t('sort.color'),
    },
    {
      value: TagSortField.CreatedAt,
      label: t('sort.createdAt'),
    },
    {
      value: TagSortField.UpdatedAt,
      label: t('sort.updatedAt'),
    },
  ];

  return (
    <Sorter
      sort={convertSort(sort)}
      onSortChange={handleSortChange}
      fields={fields}
      defaultField={TagSortField.Name}
      translationNamespace="tags"
    />
  );
}
