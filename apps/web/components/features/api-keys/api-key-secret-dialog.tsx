'use client';

import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CopyToClipboard } from '@/components/common';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface ApiKeySecretDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientSecret: string;
}

export function ApiKeySecretDialog({
  open,
  onOpenChange,
  clientId,
  clientSecret,
}: ApiKeySecretDialogProps) {
  const t = useTranslations('user.apiKeys.secretDialog');

  const handleInteractionOutside = (event: Event) => {
    event.preventDefault();
  };

  const handleEscapeKeyDown = (event: KeyboardEvent) => {
    event.preventDefault();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[500px]"
        onPointerDownOutside={handleInteractionOutside}
        onInteractOutside={handleInteractionOutside}
        onEscapeKeyDown={handleEscapeKeyDown}
      >
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                {t('warning')}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('clientId')}</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono break-all">
                {clientId}
              </code>
              <CopyToClipboard text={clientId} size="sm" variant="outline" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('clientSecret')}</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono break-all">
                {clientSecret}
              </code>
              <CopyToClipboard text={clientSecret} size="sm" variant="outline" />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
