'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getEntityDetailUrl } from '@/lib/entity-detail-url';

type EntitySegment = 'roles' | 'groups' | 'permissions' | 'users' | 'resources' | 'apps';

interface EntityNavigationButtonProps {
  entitySegment: EntitySegment;
  entityId: string;
  ariaLabel: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function EntityNavigationButton({
  entitySegment,
  entityId,
  ariaLabel,
  variant = 'outline',
  size = 'icon',
  className,
}: EntityNavigationButtonProps) {
  const params = useParams();

  const href = useMemo(() => {
    try {
      return getEntityDetailUrl({
        organizationId: params.organizationId as string | undefined,
        accountId: params.accountId as string | undefined,
        projectId: params.projectId as string | undefined,
        entitySegment,
        entityId,
      });
    } catch {
      return null;
    }
  }, [params.organizationId, params.accountId, params.projectId, entitySegment, entityId]);

  if (!href) {
    return null;
  }

  return (
    <Button variant={variant} size={size} className={className} asChild>
      <Link href={href} aria-label={ariaLabel}>
        <ChevronRight className="h-4 w-4" />
      </Link>
    </Button>
  );
}
