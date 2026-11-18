export interface ScopeSlugOption {
  slug: string;
  name: string;
  description: string | null;
  /** The project permission behind the slug, or null when several share its `resource:action`. */
  permissionId: string | null;
}

interface ScopeSlugPermission {
  id: string;
  name?: string | null;
  description?: string | null;
  action: string;
  resource?: { slug?: string | null } | null;
}

/** One option per `resource:action` slug of the project's permissions, first permission's name. */
export function toScopeSlugOptions(
  permissions: readonly (ScopeSlugPermission | null | undefined)[]
): ScopeSlugOption[] {
  const bySlug = new Map<string, ScopeSlugOption>();
  for (const permission of permissions) {
    const resourceSlug = permission?.resource?.slug;
    if (!permission || !resourceSlug || !permission.name) continue;
    const slug = `${resourceSlug}:${permission.action}`;
    const existing = bySlug.get(slug);
    if (existing) {
      existing.permissionId = null;
      continue;
    }
    bySlug.set(slug, {
      slug,
      name: permission.name,
      description: permission.description ?? null,
      permissionId: permission.id,
    });
  }
  return Array.from(bySlug.values());
}
