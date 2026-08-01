'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getWebhookDetailUrl } from '@/lib/entity-detail-url';

interface WebhookNavigationButtonProps {
  subscriptionId: string;
  ariaLabel: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function WebhookNavigationButton({
  subscriptionId,
  ariaLabel,
  variant = 'outline',
  size = 'icon',
  className,
}: WebhookNavigationButtonProps) {
  const params = useParams();

  const href = useMemo(() => {
    try {
      return getWebhookDetailUrl({
        organizationId: params.organizationId as string | undefined,
        accountId: params.accountId as string | undefined,
        projectId: params.projectId as string,
        subscriptionId,
      });
    } catch {
      return null;
    }
  }, [params.organizationId, params.accountId, params.projectId, subscriptionId]);

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
