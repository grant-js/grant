'use client';

import { User, Tenant } from '@logusgraphics/grant-schema';
import { ChevronRight } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useProjectScope } from '@/hooks/common/useProjectScope';
import { Link } from '@/i18n/navigation';

interface UserNavigationButtonProps {
  user: User;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  round?: boolean;
}

export function UserNavigationButton({
  user,
  variant = 'outline',
  size = 'icon',
  className,
  round = true,
}: UserNavigationButtonProps) {
  const t = useTranslations('users');
  const scope = useProjectScope();
  const params = useParams();
  const projectId = params.projectId as string;

  const getUserUrl = () => {
    switch (scope!.tenant) {
      case Tenant.Account:
        return `/dashboard/accounts/${scope!.id}/projects/${projectId}/users/${user.id}`;
      case Tenant.Organization:
        return `/dashboard/organizations/${scope!.id}/projects/${projectId}/users/${user.id}`;
      default:
        throw new Error('Invalid scope');
    }
  };

  return (
    <Button variant={variant} size={size} className={className} asChild>
      <Link href={getUserUrl()}>
        <ChevronRight className="h-4 w-4" />
        {!round && <span className="sr-only">{t('actions.view')}</span>}
      </Link>
    </Button>
  );
}
