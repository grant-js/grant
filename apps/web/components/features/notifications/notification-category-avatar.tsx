'use client';

import type { EventCategory } from '@grantjs/schema';
import type { LucideIcon } from 'lucide-react';
import { Bell, KeyRound, Shield, Users, Webhook } from 'lucide-react';

import { cn } from '@/lib/utils';

/** Aligns with project sidebar feature icons where a category maps cleanly. */
const CATEGORY_ICONS: Record<EventCategory, LucideIcon> = {
  security: KeyRound,
  iam: Shield,
  membership: Users,
  integrations: Webhook,
};

function isEventCategory(value: string): value is EventCategory {
  return value in CATEGORY_ICONS;
}

export function NotificationCategoryAvatar({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const resolved = isEventCategory(category) ? category : null;
  const Icon = resolved ? CATEGORY_ICONS[resolved] : Bell;

  return (
    <span
      className={cn(
        'bg-muted text-muted-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-full',
        className
      )}
      aria-hidden
    >
      <Icon className="size-4" />
    </span>
  );
}
