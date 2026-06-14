'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { getTagBorderClasses, ResourceAction, ResourceSlug, TagColor } from '@grantjs/constants';
import { Group } from '@grantjs/schema';
import { Calendar, Check, Fingerprint, Group as GroupIcon, Info, Pencil, X } from 'lucide-react';

import { Avatar, CopyToClipboard, EditableText, JsonEditor } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useScopeFromParams } from '@/hooks/common';
import { useGroupMutations } from '@/hooks/groups';
import { getDocsUrl } from '@/lib/constants';
import { getPrimaryTagFromEntity } from '@/lib/entity-list';
import { cn } from '@/lib/utils';

interface GroupInfoProps {
  group: Group;
  onAfterGroupMutation?: () => void | Promise<unknown>;
}

export function GroupInfo({ group, onAfterGroupMutation }: GroupInfoProps) {
  const t = useTranslations('group.info');
  const tGroups = useTranslations('groups.form');
  const scope = useScopeFromParams();
  const { updateGroup } = useGroupMutations();
  const [isMetadataEditing, setIsMetadataEditing] = useState(false);
  const [isMetadataSubmitting, setIsMetadataSubmitting] = useState(false);
  const [metadataDraft, setMetadataDraft] = useState<object>({});

  const canUpdate = useGrant(ResourceSlug.Group, ResourceAction.Update, {
    scope: scope!,
  });

  const primaryTag = getPrimaryTagFromEntity(group);

  const createdFormatted = new Date(group.createdAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const updatedFormatted = new Date(group.updatedAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const metadataValue =
    group.metadata != null && typeof group.metadata === 'object' && !Array.isArray(group.metadata)
      ? group.metadata
      : {};

  const handleMetadataEditStart = () => {
    setMetadataDraft(metadataValue);
    setIsMetadataEditing(true);
  };

  const handleMetadataReset = () => {
    setMetadataDraft(metadataValue);
    setIsMetadataEditing(false);
  };

  const handleMetadataConfirm = async () => {
    const isValid =
      metadataDraft &&
      typeof metadataDraft === 'object' &&
      !Array.isArray(metadataDraft) &&
      !('__invalidJson' in metadataDraft);
    if (!isValid) return;

    setIsMetadataSubmitting(true);
    try {
      await updateGroup({
        id: group.id,
        input: {
          scope: scope!,
          metadata: metadataDraft as Record<string, unknown>,
        },
      });
      await onAfterGroupMutation?.();
      setIsMetadataEditing(false);
    } finally {
      setIsMetadataSubmitting(false);
    }
  };

  const isMetadataDraftValid =
    metadataDraft &&
    typeof metadataDraft === 'object' &&
    !Array.isArray(metadataDraft) &&
    !('__invalidJson' in metadataDraft);
  const isMetadataUnchanged = JSON.stringify(metadataValue) === JSON.stringify(metadataDraft);

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex min-w-0 flex-col items-stretch gap-6 min-[1200px]:flex-row min-[1200px]:gap-8">
        <div className="flex min-w-0 flex-1 items-start gap-4 md:gap-6">
          <Avatar
            initial={group.name.charAt(0)}
            size="lg"
            icon={<GroupIcon className="h-5 w-5 text-muted-foreground" />}
            className={cn(
              'h-16 w-16 md:h-24 md:w-24',
              primaryTag?.color
                ? cn('border-2', getTagBorderClasses(primaryTag.color as TagColor))
                : undefined
            )}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <EditableText
              value={group.name || ''}
              onConfirm={async (newName: string) => {
                await updateGroup({
                  id: group.id,
                  input: { name: newName, scope: scope! },
                });
                await onAfterGroupMutation?.();
              }}
              className="text-2xl font-semibold"
              inputClassName="text-2xl font-semibold"
              placeholder="Group name"
              disabled={!canUpdate}
            />
            <EditableText
              value={group.description || ''}
              onConfirm={async (newDescription: string) => {
                await updateGroup({
                  id: group.id,
                  input: { description: newDescription, scope: scope! },
                });
                await onAfterGroupMutation?.();
              }}
              className="text-sm text-muted-foreground"
              inputClassName="text-sm"
              placeholder={t('noDescription')}
              disabled={!canUpdate}
            />
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <Fingerprint className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="shrink-0 text-muted-foreground">{t('groupId')}:</span>
              <span className="min-w-0 truncate font-semibold">{group.id}</span>
              <CopyToClipboard text={group.id} size="sm" variant="ghost" className="shrink-0" />
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
            <p className="text-sm font-medium text-muted-foreground">{t('metadata')}</p>
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
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{tGroups('metadataInfo')}</p>
                  <a
                    href={`${getDocsUrl()}/core-concepts/permission-conditions.html#field-paths`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {tGroups('metadataDocsLink')}
                  </a>
                </div>
              </PopoverContent>
            </Popover>
            {canUpdate &&
              (isMetadataEditing ? (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={handleMetadataReset}
                    disabled={isMetadataSubmitting}
                    aria-label="Reset"
                  >
                    <X className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-primary"
                    onClick={handleMetadataConfirm}
                    disabled={isMetadataSubmitting || !isMetadataDraftValid || isMetadataUnchanged}
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
                  onClick={handleMetadataEditStart}
                  aria-label="Edit metadata"
                >
                  <Pencil className="size-3.5" />
                </Button>
              ))}
          </div>
          <JsonEditor
            value={isMetadataEditing ? metadataDraft : metadataValue}
            onChange={isMetadataEditing ? (value) => setMetadataDraft(value ?? {}) : undefined}
            disabled={!isMetadataEditing}
            className="min-h-[120px]"
          />
        </div>
      </div>
    </div>
  );
}
