import { useTranslations } from 'next-intl';
import { GroupSortableField, GroupSortInput, SortOrder } from '@grantjs/schema';

import { Sorter, type SortInput } from '@/components/common';

interface RoleGroupSorterProps {
  sort?: GroupSortInput;
  onSortChange: (field: GroupSortableField, order: SortOrder) => void;
  iconOnly?: boolean;
  labelMinWidthPx?: 1200 | 1600;
}

export function RoleGroupSorter({
  sort,
  onSortChange,
  iconOnly,
  labelMinWidthPx,
}: RoleGroupSorterProps) {
  const t = useTranslations('role.groups');

  const convertSort = (gqlSort?: GroupSortInput): SortInput<GroupSortableField> | undefined => {
    if (!gqlSort) return undefined;
    return {
      field: gqlSort.field,
      order: gqlSort.order,
    };
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
      onSortChange={onSortChange}
      fields={fields}
      defaultField={GroupSortableField.Name}
      translationNamespace="role.groups"
      iconOnly={iconOnly}
      labelMinWidthPx={labelMinWidthPx}
    />
  );
}
