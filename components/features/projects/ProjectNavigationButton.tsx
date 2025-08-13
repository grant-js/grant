'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Project } from '@/graphql/generated/types';
import { Link } from '@/i18n/navigation';

interface ProjectNavigationButtonProps {
  project: Project;
  organizationId: string;
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

  return (
    <Button variant={variant} size={size} className={className} asChild>
      <Link href={`/dashboard/organizations/${organizationId}/projects/${project.id}`}>
        <ChevronRight className="h-4 w-4" />
        {!round && <span className="sr-only">{t('actions.view')}</span>}
      </Link>
    </Button>
  );
}
