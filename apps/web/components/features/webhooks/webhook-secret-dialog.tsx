'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, Download, KeyRound } from 'lucide-react';

import { CopyToClipboard } from '@/components/common';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useWebhooksStore } from '@/stores/webhooks.store';

export function WebhookSecretDialog() {
  const t = useTranslations('webhooks.secretDialog');
  const secretDialogOpen = useWebhooksStore((state) => state.secretDialogOpen);
  const revealedSecret = useWebhooksStore((state) => state.revealedSecret);
  const currentSubscription = useWebhooksStore((state) => state.currentSubscription);
  const setSecretDialogOpen = useWebhooksStore((state) => state.setSecretDialogOpen);
  const setRevealedSecret = useWebhooksStore((state) => state.setRevealedSecret);

  if (!revealedSecret) {
    return null;
  }

  const handleDownloadSecret = () => {
    const payload = {
      signingSecret: revealedSecret,
      ...(currentSubscription
        ? {
            subscriptionId: currentSubscription.id,
            url: currentSubscription.url,
          }
        : {}),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentSubscription
      ? `webhook-signing-secret-${currentSubscription.id}.json`
      : 'webhook-signing-secret.json';
    a.click();
    URL.revokeObjectURL(url);
  };

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4" />
            {t('title')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Alert variant="warning">
            <AlertTriangle />
            <AlertTitle>{t('warningTitle')}</AlertTitle>
            <AlertDescription>{t('warning')}</AlertDescription>
          </Alert>

          <div className="flex flex-col gap-3">
            <Label htmlFor="webhook-signing-secret">{t('secretLabel')}</Label>
            <div className="flex items-center gap-2">
              <code
                id="webhook-signing-secret"
                className="flex-1 break-all rounded-md bg-muted px-3 py-2.5 font-mono text-sm leading-relaxed"
              >
                {revealedSecret}
              </code>
              <CopyToClipboard text={revealedSecret} size="sm" variant="outline" />
            </div>
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={handleDownloadSecret}>
            <Download className="size-4" />
            {t('downloadSecret')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
