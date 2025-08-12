'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Organization } from '@/graphql/generated/types';
import { Link } from '@/i18n/navigation';

interface OrganizationNavigationButtonProps {
  organization: Organization;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  round?: boolean;
}

export function OrganizationNavigationButton({
  organization,
  variant = 'outline',
  size = 'icon',
  className,
  round = true,
}: OrganizationNavigationButtonProps) {
  const t = useTranslations('organizations');

  return (
    <Button variant={variant} size={size} className={className} asChild>
      <Link href={`/dashboard/org/${organization.id}/projects`}>
        <ChevronRight className="h-4 w-4" />
        {!round && <span className="sr-only">{t('actions.view')}</span>}
      </Link>
    </Button>
  );
}
