'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { SettingCardProps } from './setting-types';

export function SettingCard({
  title,
  description,
  children,
  footer,
  headerActions,
}: SettingCardProps) {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {headerActions && <div className="flex-shrink-0">{headerActions}</div>}
        </div>
      </CardHeader>
      <Separator />
      <CardContent>{children}</CardContent>
      {footer && (
        <>
          <Separator />
          <CardFooter>{footer}</CardFooter>
        </>
      )}
    </Card>
  );
}
