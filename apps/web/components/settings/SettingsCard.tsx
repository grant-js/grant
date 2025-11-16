'use client';

import { ReactNode } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface SettingsCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function SettingsCard({ title, description, children, footer }: SettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">{children}</CardContent>
      {footer && (
        <>
          <Separator />
          <div className="p-6">{footer}</div>
        </>
      )}
    </Card>
  );
}

