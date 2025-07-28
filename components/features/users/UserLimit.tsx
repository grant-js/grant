import { Limit } from '@/components/common';

interface UserLimitProps {
  limit: number;
  onLimitChange: (limit: number) => void;
}

export function UserLimit({ limit, onLimitChange }: UserLimitProps) {
  return (
    <Limit
      limit={limit}
      onLimitChange={onLimitChange}
      namespace="users"
      translationKey="limit"
      options={[10, 20, 50, 100]}
    />
  );
}
