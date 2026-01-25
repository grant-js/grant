import { SortOrder, ResourceSortableField, ResourceSortInput } from '@grantjs/schema';
import { useTranslations } from 'next-intl';

import { Sorter, type SortInput } from '@/components/common';
import { useResourcesStore } from '@/stores/resources.store';

export function ResourceSorter() {
  const t = useTranslations('resources');

  const sort = useResourcesStore((state) => state.sort);
  const setSort = useResourcesStore((state) => state.setSort);

  const convertSort = (
    gqlSort?: ResourceSortInput
  ): SortInput<ResourceSortableField> | undefined => {
    if (!gqlSort) return undefined;
    return {
      field: gqlSort.field,
      order: gqlSort.order,
    };
  };

  const handleSortChange = (field: ResourceSortableField, order: SortOrder) => {
    setSort(field, order);
  };

  const fields = [
    {
      value: ResourceSortableField.Name,
      label: t('sort.name'),
    },
    {
      value: ResourceSortableField.Slug,
      label: t('sort.slug'),
    },
    {
      value: ResourceSortableField.CreatedAt,
      label: t('sort.createdAt'),
    },
    {
      value: ResourceSortableField.UpdatedAt,
      label: t('sort.updatedAt'),
    },
  ];

  return (
    <Sorter
      sort={convertSort(sort)}
      onSortChange={handleSortChange}
      fields={fields}
      defaultField={ResourceSortableField.Name}
      translationNamespace="resources"
    />
  );
}
