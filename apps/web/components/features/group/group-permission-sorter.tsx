import { useTranslations } from 'next-intl';
import { PermissionSortableField, PermissionSortInput, SortOrder } from '@grantjs/schema';

import { Sorter, type SortInput } from '@/components/common';

interface GroupPermissionSorterProps {
  sort?: PermissionSortInput;
  onSortChange: (field: PermissionSortableField, order: SortOrder) => void;
  iconOnly?: boolean;
  labelMinWidthPx?: 1200 | 1600;
}

export function GroupPermissionSorter({
  sort,
  onSortChange,
  iconOnly,
  labelMinWidthPx,
}: GroupPermissionSorterProps) {
  const t = useTranslations('group.permissions');

  const convertSort = (
    gqlSort?: PermissionSortInput
  ): SortInput<PermissionSortableField> | undefined => {
    if (!gqlSort) return undefined;
    return {
      field: gqlSort.field,
      order: gqlSort.order,
    };
  };

  const fields = [
    {
      value: PermissionSortableField.Name,
      label: t('sort.name'),
    },
  ];

  return (
    <Sorter
      sort={convertSort(sort)}
      onSortChange={onSortChange}
      fields={fields}
      defaultField={PermissionSortableField.Name}
      translationNamespace="group.permissions"
      iconOnly={iconOnly}
      labelMinWidthPx={labelMinWidthPx}
    />
  );
}
