'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { LucideIcon, ShieldPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Link } from '@/i18n/navigation';
import { getEntityCreateUrl } from '@/lib/entity-detail-url';
import { cn } from '@/lib/utils';

type EntitySegment =
  'roles' | 'groups' | 'permissions' | 'users' | 'resources' | 'apps' | 'webhooks';

interface EntityCreateNavigateButtonProps {
  entitySegment: EntitySegment;
  label: string;
  icon?: LucideIcon;
  alwaysShowLabel?: boolean;
  className?: string;
}

export function EntityCreateNavigateButton({
  entitySegment,
  label,
  icon: Icon = ShieldPlus,
  alwaysShowLabel = false,
  className,
}: EntityCreateNavigateButtonProps) {
  const params = useParams();

  const href = useMemo(() => {
    try {
      return getEntityCreateUrl({
        organizationId: params.organizationId as string | undefined,
        accountId: params.accountId as string | undefined,
        projectId: params.projectId as string | undefined,
        entitySegment,
      });
    } catch {
      return null;
    }
  }, [params.organizationId, params.accountId, params.projectId, entitySegment]);

  if (!href) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          asChild
          className={cn(
            'w-full sm:w-auto',
            !alwaysShowLabel && [
              'min-[640px]:max-[1199px]:size-9 min-[640px]:max-[1199px]:min-w-9 min-[640px]:max-[1199px]:max-w-9 min-[640px]:max-[1199px]:p-2',
              'min-[1200px]:size-auto min-[1200px]:min-w-0 min-[1200px]:max-w-none',
            ],
            className
          )}
        >
          <Link href={href}>
            <Icon className="size-4 shrink-0" />
            <span
              className={
                alwaysShowLabel
                  ? 'inline'
                  : 'inline min-[640px]:max-[1199px]:hidden min-[1200px]:inline'
              }
            >
              {label}
            </span>
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
