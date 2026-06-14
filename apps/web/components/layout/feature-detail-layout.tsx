import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface FeatureDetailLayoutProps {
  children: ReactNode;
  className?: string;
}

export function FeatureDetailLayout({ children, className }: FeatureDetailLayoutProps) {
  return <div className={cn('mx-auto max-w-2xl space-y-6 min-w-0', className)}>{children}</div>;
}
