import { useTranslations } from 'next-intl';
import { SortOrder, TagSortField, TagSortInput } from '@grantjs/schema';

import { Sorter, type SortInput } from '@/components/common';

interface ResourceTagSorterProps {
  sort?: TagSortInput;
  onSortChange: (field: TagSortField, order: SortOrder) => void;
  iconOnly?: boolean;
  labelMinWidthPx?: 1200 | 1600;
}

export function ResourceTagSorter({
  sort,
  onSortChange,
  iconOnly,
  labelMinWidthPx,
}: ResourceTagSorterProps) {
  const t = useTranslations('resource.tags');

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
      translationNamespace="resource.tags"
      iconOnly={iconOnly}
      labelMinWidthPx={labelMinWidthPx}
    />
  );
}
