'use client';

import { useTranslations } from 'next-intl';
import { KeyRound } from 'lucide-react';

import { CopyToClipboard } from '@/components/common';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWebhooksStore } from '@/stores/webhooks.store';

export function WebhookSecretDialog() {
  const t = useTranslations('webhooks');
  const secretDialogOpen = useWebhooksStore((state) => state.secretDialogOpen);
  const revealedSecret = useWebhooksStore((state) => state.revealedSecret);
  const setSecretDialogOpen = useWebhooksStore((state) => state.setSecretDialogOpen);
  const setRevealedSecret = useWebhooksStore((state) => state.setRevealedSecret);

  if (!revealedSecret) {
    return null;
  }

  return (
    <Dialog
      open={secretDialogOpen}
      onOpenChange={(open) => {
        setSecretDialogOpen(open);
        if (!open) {
          setRevealedSecret(null);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4" />
            {t('subscriptions.secretTitle')}
          </DialogTitle>
          <DialogDescription>{t('createDialog.description')}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3">
          <code className="flex-1 break-all font-mono text-xs">{revealedSecret}</code>
          <CopyToClipboard text={revealedSecret} size="sm" variant="outline" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
