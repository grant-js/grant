import { SortOrder, TagSortField, TagSortInput } from '@logusgraphics/grant-schema';
import { useTranslations } from 'next-intl';

import { Sorter, type SortInput } from '@/components/common';

interface UserTagSorterProps {
  sort?: TagSortInput;
  onSortChange: (field: TagSortField, order: SortOrder) => void;
}

export function UserTagSorter({ sort, onSortChange }: UserTagSorterProps) {
  const t = useTranslations('user.tags');

  const convertSort = (gqlSort?: TagSortInput): SortInput<TagSortField> | undefined => {
    if (!gqlSort) return undefined;
    return {
      field: gqlSort.field,
      order: gqlSort.order,
    };
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
  ];

  return (
    <Sorter
      sort={convertSort(sort)}
      onSortChange={onSortChange}
      fields={fields}
      defaultField={TagSortField.Name}
      translationNamespace="user.tags"
    />
  );
}
