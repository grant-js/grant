'use client';

import { Project, Tenant } from '@logusgraphics/grant-schema';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useProjectScope } from '@/hooks/common/useProjectScope';
import { Link } from '@/i18n/navigation';

interface ProjectNavigationButtonProps {
  project: Project;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  round?: boolean;
}

export function ProjectNavigationButton({
  project,
  variant = 'outline',
  size = 'icon',
  className,
  round = true,
}: ProjectNavigationButtonProps) {
  const t = useTranslations('projects');
  const scope = useProjectScope();

  const getProjectUrl = () => {
    switch (scope!.tenant) {
      case Tenant.Account:
        return `/dashboard/accounts/${scope!.id}/projects/${project.id}`;
      case Tenant.Organization:
        return `/dashboard/organizations/${scope!.id}/projects/${project.id}`;
      default:
        throw new Error('Invalid scope');
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
