import { ApiKeySortableField, ApiKeySortInput, SortOrder } from '@grantjs/schema';
import { useTranslations } from 'next-intl';

import { Sorter, type SortInput } from '@/components/common';

interface UserApiKeySorterProps {
  sort?: ApiKeySortInput;
  onSortChange: (field: ApiKeySortableField, order: SortOrder) => void;
}

export function UserApiKeySorter({ sort, onSortChange }: UserApiKeySorterProps) {
  const t = useTranslations('user.apiKeys');

  const convertSort = (gqlSort?: ApiKeySortInput): SortInput<ApiKeySortableField> | undefined => {
    if (!gqlSort) return undefined;
    return {
      field: gqlSort.field,
      order: gqlSort.order,
    };
  };

  const fields = [
    {
      value: ApiKeySortableField.Name,
      label: t('sort.name'),
    },
    {
      value: ApiKeySortableField.CreatedAt,
      label: t('sort.createdAt'),
    },
    {
      value: ApiKeySortableField.ExpiresAt,
      label: t('sort.expiresAt'),
    },
    {
      value: ApiKeySortableField.LastUsedAt,
      label: t('sort.lastUsedAt'),
    },
  ];

  return (
    <Sorter
      sort={convertSort(sort)}
      onSortChange={onSortChange}
      fields={fields}
      defaultField={ApiKeySortableField.CreatedAt}
      translationNamespace="user.apiKeys"
    />
  );
}
