'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Permission } from '@grantjs/schema';
import { ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getEntityDetailUrl } from '@/lib/entity-detail-url';

interface PermissionNavigationButtonProps {
  permission: Permission;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  round?: boolean;
}

export function PermissionNavigationButton({
  permission,
  variant = 'outline',
  size = 'icon',
  className,
  round = true,
}: PermissionNavigationButtonProps) {
  const t = useTranslations('permissions');
  const params = useParams();

  const href = useMemo(
    () =>
      getEntityDetailUrl({
        organizationId: params.organizationId as string | undefined,
        accountId: params.accountId as string | undefined,
        projectId: params.projectId as string | undefined,
        entitySegment: 'permissions',
        entityId: permission.id,
      }),
    [params.organizationId, params.accountId, params.projectId, permission.id]
  );

  return (
    <Button variant={variant} size={size} className={className} asChild>
      <Link href={href}>
        <ChevronRight className="h-4 w-4" />
        {!round && <span className="sr-only">{t('actions.view')}</span>}
      </Link>
    </Button>
  );
}
