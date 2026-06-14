'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { getTagBorderClasses, ResourceAction, ResourceSlug, TagColor } from '@grantjs/constants';
import { Permission } from '@grantjs/schema';
import {
  Calendar,
  Check,
  CopyCheck,
  Fingerprint,
  Info,
  Package,
  Pencil,
  Play,
  X,
} from 'lucide-react';

import { Avatar, CopyToClipboard, EditableText, JsonEditor } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useScopeFromParams } from '@/hooks/common';
import { usePermissionMutations } from '@/hooks/permissions';
import { getPrimaryTagFromEntity } from '@/lib/entity-list';
import { cn } from '@/lib/utils';

interface PermissionInfoProps {
  permission: Permission;
  onAfterPermissionMutation?: () => void | Promise<unknown>;
}

export function PermissionInfo({ permission, onAfterPermissionMutation }: PermissionInfoProps) {
  const t = useTranslations('permission.info');
  const scope = useScopeFromParams();
  const { updatePermission } = usePermissionMutations();
  const [isConditionEditing, setIsConditionEditing] = useState(false);
  const [isConditionSubmitting, setIsConditionSubmitting] = useState(false);
  const [conditionDraft, setConditionDraft] = useState<object>({});

  const canUpdate = useGrant(ResourceSlug.Permission, ResourceAction.Update, {
    scope: scope!,
  });

  const primaryTag = getPrimaryTagFromEntity(permission);

  const createdFormatted = new Date(permission.createdAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const updatedFormatted = new Date(permission.updatedAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const conditionValue =
    permission.condition != null &&
    typeof permission.condition === 'object' &&
    !Array.isArray(permission.condition)
      ? permission.condition
      : {};

  const handleConditionEditStart = () => {
    setConditionDraft(conditionValue);
    setIsConditionEditing(true);
  };

  const handleConditionReset = () => {
    setConditionDraft(conditionValue);
    setIsConditionEditing(false);
  };

  const handleConditionConfirm = async () => {
    const isValid =
      conditionDraft &&
      typeof conditionDraft === 'object' &&
      !Array.isArray(conditionDraft) &&
      !('__invalidJson' in conditionDraft);
    if (!isValid) return;

    setIsConditionSubmitting(true);
    try {
      await updatePermission(permission.id, {
        scope: scope!,
        condition: conditionDraft as Record<string, unknown>,
      });
      await onAfterPermissionMutation?.();
      setIsConditionEditing(false);
    } finally {
      setIsConditionSubmitting(false);
    }
  };

  const isConditionDraftValid =
    conditionDraft &&
    typeof conditionDraft === 'object' &&
    !Array.isArray(conditionDraft) &&
    !('__invalidJson' in conditionDraft);
  const isConditionUnchanged = JSON.stringify(conditionValue) === JSON.stringify(conditionDraft);

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex min-w-0 flex-col items-stretch gap-6 min-[1200px]:flex-row min-[1200px]:gap-8">
        <div className="flex min-w-0 flex-1 items-start gap-4 md:gap-6">
          <Avatar
            initial={permission.name.charAt(0)}
            size="lg"
            icon={<CopyCheck className="h-5 w-5 text-muted-foreground" />}
            className={cn(
              'h-16 w-16 md:h-24 md:w-24',
              primaryTag?.color
                ? cn('border-2', getTagBorderClasses(primaryTag.color as TagColor))
                : undefined
            )}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <EditableText
              value={permission.name || ''}
              onConfirm={async (newName: string) => {
                await updatePermission(permission.id, { name: newName, scope: scope! });
                await onAfterPermissionMutation?.();
              }}
              className="text-2xl font-semibold"
              inputClassName="text-2xl font-semibold"
              placeholder="Permission name"
              disabled={!canUpdate}
            />
            <EditableText
              value={permission.description || ''}
              onConfirm={async (newDescription: string) => {
                await updatePermission(permission.id, {
                  description: newDescription,
                  scope: scope!,
                });
                await onAfterPermissionMutation?.();
              }}
              className="text-sm text-muted-foreground"
              inputClassName="text-sm"
              placeholder={t('noDescription')}
              disabled={!canUpdate}
            />
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {permission.resource && (
                <div className="inline-flex items-center gap-2">
                  <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('resource')}:</span>
                  <Badge variant="outline">{permission.resource.name}</Badge>
                </div>
              )}
              <div className="inline-flex items-center gap-2">
                <Play className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">{t('action')}:</span>
                <Badge variant="secondary">{permission.action}</Badge>
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <Fingerprint className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="shrink-0 text-muted-foreground">{t('permissionId')}:</span>
              <span className="min-w-0 truncate font-semibold">{permission.id}</span>
              <CopyToClipboard
                text={permission.id}
                size="sm"
                variant="ghost"
                className="shrink-0"
              />
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <div className="inline-flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">{t('created')}:</span>
                <span className="font-semibold">{createdFormatted}</span>
              </div>
              <div className="inline-flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">{t('updated')}:</span>
                <span className="font-semibold">{updatedFormatted}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1 min-[1200px]:max-w-md">
          <div className="mb-2 flex items-center gap-1.5">
            <p className="text-sm font-medium text-muted-foreground">{t('condition')}</p>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex size-5 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Field information"
                >
                  <Info className="size-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 z-[99999999]" align="start">
                <p className="text-sm text-muted-foreground">{t('conditionInfo')}</p>
              </PopoverContent>
            </Popover>
            {canUpdate &&
              (isConditionEditing ? (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={handleConditionReset}
                    disabled={isConditionSubmitting}
                    aria-label="Reset"
                  >
                    <X className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-primary"
                    onClick={handleConditionConfirm}
                    disabled={
                      isConditionSubmitting || !isConditionDraftValid || isConditionUnchanged
                    }
                    aria-label="Confirm"
                  >
                    <Check className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={handleConditionEditStart}
                  aria-label="Edit condition"
                >
                  <Pencil className="size-3.5" />
                </Button>
              ))}
          </div>
          <JsonEditor
            value={isConditionEditing ? conditionDraft : conditionValue}
            onChange={isConditionEditing ? (value) => setConditionDraft(value ?? {}) : undefined}
            disabled={!isConditionEditing}
            className="min-h-[120px]"
          />
        </div>
      </div>
    </div>
  );
}
