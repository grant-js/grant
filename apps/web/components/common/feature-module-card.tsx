'use client';

import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export interface FeatureModuleCardProps {
  title: ReactNode;
  /** Renders inline next to the title (e.g. metadata info popover). */
  titleAdornment?: ReactNode;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** @deprecated Prefer `toolbar` in the card body. Kept for non-collapsible cards only. */
  headerActions?: ReactNode;
  /** Renders above children inside the card body (e.g. table toolbar). */
  toolbar?: ReactNode;
  className?: string;
  contentClassName?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

function CardTitleBlock({
  title,
  titleAdornment,
  description,
}: {
  title: ReactNode;
  titleAdornment?: ReactNode;
  description?: string;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      {titleAdornment ? (
        <div className="flex min-w-0 items-center gap-1.5">
          <CardTitle>{title}</CardTitle>
          {titleAdornment}
        </div>
      ) : (
        <CardTitle>{title}</CardTitle>
      )}
      {description && <CardDescription>{description}</CardDescription>}
    </div>
  );
}

function CardBodySection({
  toolbar,
  headerActions,
  children,
  footer,
  contentClassName,
  compactBottom,
}: {
  toolbar?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  contentClassName?: string;
  /** When true, omits bottom padding (card wrapper provides it). */
  compactBottom?: boolean;
}) {
  const bodyToolbar = toolbar ?? headerActions;

  return (
    <div className={cn('flex flex-col gap-4', !compactBottom && 'pb-6')}>
      <Separator />
      <CardContent className={cn('min-w-0', contentClassName)}>
        {bodyToolbar && <div className="mb-4 flex w-full min-w-0">{bodyToolbar}</div>}
        {children}
      </CardContent>
      {footer && (
        <>
          <Separator />
          <CardFooter className="w-full pt-0">{footer}</CardFooter>
        </>
      )}
    </div>
  );
}

export function FeatureModuleCard({
  title,
  titleAdornment,
  description,
  children,
  footer,
  headerActions,
  toolbar,
  className,
  contentClassName,
  collapsible = false,
  defaultExpanded = true,
}: FeatureModuleCardProps) {
  const bodyToolbar = toolbar ?? (collapsible ? headerActions : undefined);
  const headerToolbar = collapsible ? undefined : headerActions;

  if (!collapsible) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader className={cn('flex flex-col', headerToolbar ? 'gap-4' : 'gap-0')}>
          <CardTitleBlock title={title} titleAdornment={titleAdornment} description={description} />
          {headerToolbar && <div className="flex w-full min-w-0">{headerToolbar}</div>}
        </CardHeader>
        <CardBodySection
          toolbar={toolbar}
          compactBottom
          footer={footer}
          contentClassName={contentClassName}
        >
          {children}
        </CardBodySection>
      </Card>
    );
  }

  return (
    <Collapsible
      defaultOpen={defaultExpanded}
      className={cn('group/collapsible w-full', className)}
    >
      <Card className="w-full flex flex-col gap-0 py-0">
        <div
          className={cn(
            'flex w-full items-center gap-4 px-6 pt-6 pb-6',
            'group-data-[state=open]/collapsible:pb-4'
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'min-w-0 text-left',
                    'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  )}
                >
                  <CardTitle>{title}</CardTitle>
                </button>
              </CollapsibleTrigger>
              {titleAdornment}
            </div>
            {description ? (
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'w-full text-left',
                    'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  )}
                >
                  <CardDescription>{description}</CardDescription>
                </button>
              </CollapsibleTrigger>
            ) : null}
          </div>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                'inline-flex shrink-0 items-center justify-center rounded-sm p-1',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
              aria-label="Toggle section"
            >
              <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <CardBodySection
            toolbar={bodyToolbar}
            footer={footer}
            contentClassName={contentClassName}
          >
            {children}
          </CardBodySection>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
