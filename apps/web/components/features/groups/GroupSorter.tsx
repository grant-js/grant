'use client';

import { GroupSortableField, SortOrder, GroupSortInput } from '@logusgraphics/grant-schema';
import { useTranslations } from 'next-intl';

import { Sorter, type SortInput } from '@/components/common';
import { useGroupsStore } from '@/stores/groups.store';

export function GroupSorter() {
  const t = useTranslations('groups');

  const sort = useGroupsStore((state) => state.sort);
  const setSort = useGroupsStore((state) => state.setSort);

  const convertSort = (gqlSort?: GroupSortInput): SortInput<GroupSortableField> | undefined => {
    if (!gqlSort) return undefined;
    return {
      field: gqlSort.field,
      order: gqlSort.order,
    };
  };

  const handleSortChange = (field: GroupSortableField, order: SortOrder) => {
    setSort(field, order);
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
