'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getProjectSyncJobDetailUrl } from '@/lib/entity-detail-url';

interface ProjectSyncJobNavigationButtonProps {
  projectId: string;
  jobId: string;
  ariaLabel: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function ProjectSyncJobNavigationButton({
  projectId,
  jobId,
  ariaLabel,
  variant = 'outline',
  size = 'icon',
  className,
}: ProjectSyncJobNavigationButtonProps) {
  const params = useParams();

  const href = useMemo(() => {
    try {
      return getProjectSyncJobDetailUrl({
        organizationId: params.organizationId as string | undefined,
        accountId: params.accountId as string | undefined,
        projectId,
        jobId,
      });
    } catch {
      return null;
    }
  }, [params.organizationId, params.accountId, projectId, jobId]);

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
