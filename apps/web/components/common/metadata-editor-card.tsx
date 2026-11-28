'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { FeatureModuleCard } from '@/components/common/feature-module-card';
import { JSON_EDITOR_MAX_HEIGHT, JsonEditor } from '@/components/common/json-editor';
import { Button } from '@/components/ui/button';

/** An entity's `metadata` as an object; anything else (a string, an array, null) reads as `{}`. */
function toMetadataObject(metadata: unknown): object {
  if (metadata != null && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata;
  }
  if (typeof metadata === 'string') {
    try {
      const parsed: unknown = JSON.parse(metadata);
      return parsed != null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

export interface MetadataEditorCardProps {
  /** The entity whose metadata is shown; the draft resets when it or its metadata changes. */
  entityId: string;
  metadata: unknown;
  title: string;
  description: string;
  /** The info popover next to the title. */
  titleAdornment?: ReactNode;
  /** Without it the editor is read-only and the card has no Save. */
  canEdit: boolean;
  /** Saves the edited metadata; the card shows "Saving…" until it settles. */
  onSave: (metadata: Record<string, unknown>) => Promise<unknown>;
}

/**
 * The metadata card of a user, role, group or permission detail page: a JSON editor that grows
 * with its content up to {@link JSON_EDITOR_MAX_HEIGHT} and scrolls inside itself, collapsed until
 * opened, with Cancel and Save for a viewer who may edit the entity.
 */
export function MetadataEditorCard({
  entityId,
  metadata,
  title,
  description,
  titleAdornment,
  canEdit,
  onSave,
}: MetadataEditorCardProps) {
  const tCommon = useTranslations('common');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const metadataValue = toMetadataObject(metadata);
  const [draft, setDraft] = useState<object>(metadataValue);

  useEffect(() => {
    setDraft(toMetadataObject(metadata));
  }, [entityId, metadata]);

  const isDraftValid =
    draft && typeof draft === 'object' && !Array.isArray(draft) && !('__invalidJson' in draft);
  const isUnchanged = JSON.stringify(metadataValue) === JSON.stringify(draft);

  const handleSave = async () => {
    if (!isDraftValid) return;
    setIsSubmitting(true);
    try {
      await onSave(draft as Record<string, unknown>);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeatureModuleCard
      title={title}
      description={description}
      collapsible
      defaultExpanded={false}
      titleAdornment={titleAdornment}
      footer={
        canEdit ? (
          <div className="flex w-full justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDraft(metadataValue)}
              disabled={isUnchanged || isSubmitting}
            >
              {tCommon('actions.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting || !isDraftValid || isUnchanged}
            >
              {isSubmitting ? tCommon('actions.saving') : tCommon('actions.save')}
            </Button>
          </div>
        ) : undefined
      }
    >
      <JsonEditor
        value={draft}
        onChange={(value) => setDraft(value ?? {})}
        disabled={!canEdit}
        className="min-h-[160px]"
        maxHeight={JSON_EDITOR_MAX_HEIGHT}
      />
    </FeatureModuleCard>
  );
}
