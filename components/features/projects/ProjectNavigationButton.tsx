'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Project, Tenant } from '@/graphql/generated/types';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { Link } from '@/i18n/navigation';

interface ProjectNavigationButtonProps {
  project: Project;
  organizationId: string; // Keep for backward compatibility, will be ignored when scope is available
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  round?: boolean;
}

export function ProjectNavigationButton({
  project,
  organizationId,
  variant = 'outline',
  size = 'icon',
  className,
  round = true,
}: ProjectNavigationButtonProps) {
  const t = useTranslations('projects');
  const scope = useScopeFromParams();

  const getProjectUrl = () => {
    if (!scope) return `/dashboard/organizations/${organizationId}/projects/${project.id}`;

    switch (scope.tenant) {
      case Tenant.Account:
        return `/dashboard/accounts/${scope.id}/projects/${project.id}`;
      case Tenant.Organization:
        return `/dashboard/organizations/${scope.id}/projects/${project.id}`;
      default:
        return `/dashboard/organizations/${organizationId}/projects/${project.id}`;
    }
  };

  return (
    <Button variant={variant} size={size} className={className} asChild>
      <Link href={getProjectUrl()}>
        <ChevronRight className="h-4 w-4" />
        {!round && <span className="sr-only">{t('actions.view')}</span>}
      </Link>
    </Button>
  );
}
