'use client';

import { Limit } from '@/components/common';

interface GroupLimitProps {
  limit: number;
  onLimitChange: (limit: number) => void;
}

export function GroupLimit({ limit, onLimitChange }: GroupLimitProps) {
  return (
    <Limit
      limit={limit}
      onLimitChange={onLimitChange}
      namespace="groups"
      translationKey="limit.label"
    />
  );
}
