import { useTranslations } from 'next-intl';

import { Sorter, type SortInput, type SortOrder } from '@/components/common';
import { RoleSortOrder, RoleSortableField, RoleSortInput } from '@/graphql/generated/types';

interface RoleSorterProps {
  sort?: RoleSortInput;
  onSortChange: (field: RoleSortableField, order: RoleSortOrder) => void;
}

export function RoleSorter({ sort, onSortChange }: RoleSorterProps) {
  const t = useTranslations('roles');

  // Convert GraphQL types to generic Sorter types
  const convertSort = (gqlSort?: RoleSortInput): SortInput<RoleSortableField> | undefined => {
    if (!gqlSort) return undefined;
    return {
      field: gqlSort.field,
      order: gqlSort.order === RoleSortOrder.Asc ? 'ASC' : 'DESC',
    };
  };

  const handleSortChange = (field: RoleSortableField, order: SortOrder) => {
    const gqlOrder = order === 'ASC' ? RoleSortOrder.Asc : RoleSortOrder.Desc;
    onSortChange(field, gqlOrder);
  };

  const fields = [
    {
      value: RoleSortableField.Name,
      label: t('sort.name'),
    },
  ];

  return (
    <Sorter
      sort={convertSort(sort)}
      onSortChange={handleSortChange}
      fields={fields}
      defaultField={RoleSortableField.Name}
      translationNamespace="roles"
    />
  );
}
