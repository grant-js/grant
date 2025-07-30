'use client';

import { useTranslations } from 'next-intl';

import { Sorter, type SortInput, type SortOrder } from '@/components/common';
import { GroupSortableField, GroupSortOrder, GroupSortInput } from '@/graphql/generated/types';
import { useGroupsStore } from '@/stores/groups.store';

export function GroupSorter() {
  const t = useTranslations('groups');

  // Use selective subscriptions to prevent unnecessary re-renders
  const sort = useGroupsStore((state) => state.sort);
  const setSort = useGroupsStore((state) => state.setSort);

  // Convert GraphQL types to generic Sorter types
  const convertSort = (gqlSort?: GroupSortInput): SortInput<GroupSortableField> | undefined => {
    if (!gqlSort) return undefined;
    return {
      field: gqlSort.field,
      order: gqlSort.order === GroupSortOrder.Asc ? 'ASC' : 'DESC',
    };
  };

  const handleSortChange = (field: GroupSortableField, order: SortOrder) => {
    const gqlOrder = order === 'ASC' ? GroupSortOrder.Asc : GroupSortOrder.Desc;
    setSort(field, gqlOrder);
  };

  const fields = [
    {
      value: GroupSortableField.Name,
      label: t('sort.name'),
    },
  ];

  return (
    <Sorter
      sort={convertSort(sort)}
      onSortChange={handleSortChange}
      fields={fields}
      defaultField={GroupSortableField.Name}
      translationNamespace="groups"
      showLabel={false}
    />
  );
}
