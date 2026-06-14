import { Tag } from '@grantjs/schema';

export function isSyntheticCdmEntity(
  metadata: Record<string, unknown> | null | undefined
): boolean {
  const cdmSource = metadata?.cdmSource;
  if (cdmSource && typeof cdmSource === 'object' && 'synthetic' in cdmSource) {
    return (cdmSource as { synthetic?: boolean }).synthetic === true;
  }
  return false;
}

export function getPrimaryTagFromEntity(entity: {
  primaryTag?: Tag | null;
  tags?: Tag[] | null;
}): Tag | null | undefined {
  if (entity.primaryTag) {
    return entity.primaryTag;
  }
  return entity.tags?.find((tag) => tag.isPrimary) ?? entity.tags?.[0];
}

export function getEntityTagCount(entity: {
  tags?: Tag[] | null;
  tagCount?: number | null;
}): number {
  if (typeof entity.tagCount === 'number') {
    return entity.tagCount;
  }
  return entity.tags?.length ?? 0;
}
