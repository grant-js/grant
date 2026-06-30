'use client';

import { useMemo, useState } from 'react';
import { EVENT_TYPES, type EventType, type Scope } from '@grantjs/schema';
import { KeyRound, Plus, RefreshCw, Trash2 } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { useScopeFromParams } from '@/hooks/common';
import { useWebhookSubscriptions } from '@/hooks/webhooks';

import { WebhookDeliveriesTable } from './webhook-deliveries-table';

interface WebhookSubscriptionsManagerProps {
  scope?: Scope | null;
}

export function WebhookSubscriptionsManager({
  scope: scopeProp,
}: WebhookSubscriptionsManagerProps) {
  const scopeFromParams = useScopeFromParams();
  const scope = scopeProp ?? scopeFromParams;

  const { subscriptions, loading, error, create, update, rotateSecret, remove } =
    useWebhookSubscriptions(scope);

  const [createOpen, setCreateOpen] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);

  const selectedSubscription = useMemo(
    () => subscriptions.find((s) => s.id === selectedSubscriptionId) ?? null,
    [subscriptions, selectedSubscriptionId]
  );

  if (!scope) {
    return null;
  }

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await update(id, { active });
      toast.success(active ? 'Subscription enabled' : 'Subscription disabled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update subscription');
    }
  };

  const handleRotate = async (id: string) => {
    try {
      const result = await rotateSecret(id);
      setRevealedSecret(result.secret);
      toast.success('Signing secret rotated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rotate secret');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      if (selectedSubscriptionId === id) setSelectedSubscriptionId(null);
      toast.success('Subscription deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete subscription');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Webhook subscriptions</CardTitle>
            <CardDescription>
              Send signed domain events to external endpoints (Slack, n8n, etc.).
            </CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="size-4" /> New subscription
          </Button>
        </CardHeader>
        <CardContent>
          {revealedSecret && (
            <Alert className="mb-4">
              <KeyRound className="size-4" />
              <AlertTitle>Signing secret (shown once)</AlertTitle>
              <AlertDescription>
                <code className="break-all font-mono text-xs">{revealedSecret}</code>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    void navigator.clipboard?.writeText(revealedSecret);
                    toast.success('Copied to clipboard');
                  }}
                >
                  Copy
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Failed to load subscriptions</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : subscriptions.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No webhook subscriptions yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((subscription) => (
                  <TableRow
                    key={subscription.id}
                    className="cursor-pointer"
                    data-state={selectedSubscriptionId === subscription.id ? 'selected' : undefined}
                    onClick={() => setSelectedSubscriptionId(subscription.id)}
                  >
                    <TableCell className="max-w-xs truncate font-mono text-xs">
                      {subscription.url}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {subscription.eventTypes.slice(0, 3).map((type) => (
                          <Badge key={type} variant="secondary">
                            {type}
                          </Badge>
                        ))}
                        {subscription.eventTypes.length > 3 && (
                          <Badge variant="outline">+{subscription.eventTypes.length - 3}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={subscription.active}
                        onCheckedChange={(checked) => handleToggleActive(subscription.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRotate(subscription.id)}
                          title="Rotate secret"
                        >
                          <RefreshCw className="size-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(subscription.id)}
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedSubscription && (
        <Card>
          <CardHeader>
            <CardTitle>Recent deliveries</CardTitle>
            <CardDescription className="font-mono text-xs">
              {selectedSubscription.url}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WebhookDeliveriesTable scope={scope} subscriptionId={selectedSubscription.id} />
          </CardContent>
        </Card>
      )}

      <CreateSubscriptionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={async (input) => {
          const result = await create(input);
          setRevealedSecret(result.secret);
          setCreateOpen(false);
          toast.success('Subscription created');
        }}
      />
    </div>
  );
}

interface CreateSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: {
    url: string;
    eventTypes: EventType[];
    description?: string | null;
  }) => Promise<void>;
}

function CreateSubscriptionDialog({ open, onOpenChange, onCreate }: CreateSubscriptionDialogProps) {
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
    setSelectedTypes((prev) => (checked ? [...prev, type] : prev.filter((t) => t !== type)));
  };

  const canSubmit = url.trim().length > 0 && selectedTypes.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onCreate({
        url: url.trim(),
        eventTypes: selectedTypes,
        description: description.trim() || null,
      });
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create subscription');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New webhook subscription</DialogTitle>
          <DialogDescription>
            The signing secret is generated and shown once after creation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="webhook-url">
              Endpoint URL
            </label>
            <Input
              id="webhook-url"
              placeholder="https://example.com/webhooks/grant"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="webhook-description">
              Description (optional)
            </label>
            <Textarea
              id="webhook-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">Event types</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {EVENT_TYPES.map((type) => (
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {submitting ? <Spinner /> : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
