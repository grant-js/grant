import { Limit } from '@/components/common';

interface RoleLimitProps {
  limit: number;
  onLimitChange: (limit: number) => void;
}

export function RoleLimit({ limit, onLimitChange }: RoleLimitProps) {
  return (
    <Limit
      limit={limit}
      onLimitChange={onLimitChange}
      namespace="roles"
      translationKey="limit"
      options={[10, 20, 50, 100]}
    />
  );
}
