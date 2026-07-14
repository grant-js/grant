'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { EVENT_TYPES, type EventType } from '@grantjs/schema';
import { Plus, Webhook } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useScopeFromParams } from '@/hooks/common';
import { useWebhookSubscriptionMutations } from '@/hooks/webhooks';
import { useWebhooksStore } from '@/stores/webhooks.store';

const SELECTABLE_EVENT_TYPES = EVENT_TYPES.filter((type) => type !== 'api_key.rotated');

interface WebhookCreateDialogProps {
  triggerAlwaysShowLabel?: boolean;
}

export function WebhookCreateDialog({ triggerAlwaysShowLabel = false }: WebhookCreateDialogProps) {
  const t = useTranslations('webhooks');
  const scope = useScopeFromParams();
  const refetch = useWebhooksStore((state) => state.refetch);
  const handleSecretRevealed = useWebhooksStore((state) => state.handleSecretRevealed);
  const { create } = useWebhookSubscriptionMutations(scope);

  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<EventType[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setUrl('');
    setDescription('');
    setSelectedTypes([]);
  };

  const toggleType = (type: EventType, checked: boolean) => {
    setSelectedTypes((prev) => (checked ? [...prev, type] : prev.filter((item) => item !== type)));
  };

  const canSubmit = url.trim().length > 0 && selectedTypes.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    try {
      const result = await create({
        url: url.trim(),
        eventTypes: selectedTypes,
        description: description.trim() || null,
      });
      handleSecretRevealed(result.secret);
      await refetch?.();
      setOpen(false);
      reset();
      toast.success(t('subscriptions.createSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('subscriptions.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset();
        }
        setOpen(next);
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="size-4 shrink-0" />
              <span
                className={
                  triggerAlwaysShowLabel
                    ? 'ml-2 inline'
                    : 'ml-2 hidden min-[1200px]:inline min-[640px]:max-[1199px]:hidden'
                }
              >
                {t('subscriptions.new')}
              </span>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('subscriptions.new')}</TooltipContent>
      </Tooltip>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="size-4" />
            {t('createDialog.title')}
          </DialogTitle>
          <DialogDescription>{t('createDialog.description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="webhook-url">
              {t('createDialog.urlLabel')}
            </label>
            <Input
              id="webhook-url"
              placeholder={t('createDialog.urlPlaceholder')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="webhook-description">
              {t('createDialog.descriptionLabel')}
            </label>
            <Textarea
              id="webhook-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">{t('createDialog.eventTypesLabel')}</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SELECTABLE_EVENT_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedTypes.includes(type)}
                    onCheckedChange={(checked) => toggleType(type, checked === true)}
                  />
                  <span className="font-mono text-xs">{type}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('createDialog.cancel')}
          </Button>
          <Button disabled={!canSubmit} onClick={() => void handleSubmit()}>
            {submitting ? <Spinner /> : t('createDialog.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
