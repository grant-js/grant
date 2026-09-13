'use client';

import { Avatar } from '@/components/common';
import { getInitials } from '@/lib/utils';

interface OAuthAppHeadingProps {
  title: string;
  name?: string | null;
  pictureUrl?: string | null;
  description?: string;
}

export function OAuthAppHeading({ title, name, pictureUrl, description }: OAuthAppHeadingProps) {
  return (
    <div className="space-y-3 text-center">
      <Avatar
        initial={getInitials(name || title, 2, 'A')}
        imageUrl={pictureUrl || undefined}
        size="xl"
        className="mx-auto h-16 w-16"
      />
      <div className="min-w-0 space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  );
}
