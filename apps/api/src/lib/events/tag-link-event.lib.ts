import type { DomainEventInput } from '@grantjs/schema';

export type TagTargetKind = 'user' | 'group' | 'role' | 'permission' | 'resource';

/**
 * The `tag.linked` / `tag.unlinked` event for one tag pivot row (`user_tags`,
 * `group_tags`, `role_tags`, `permission_tags`, `resource_tags`).
 *
 * The aggregate is the pivot. What was linked travels in `data.after` for **both**
 * types, unlike other revoke events, which carry it in `before`: a tag pivot has no
 * subject user to name the target, and these types were published with `after` before
 * the envelope kept an identity `before`, so they stay as they are for compatibility.
 * Ids and the target kind only.
 *
 * `subjectUserId` is set only for a user target. Project routing is derived from the
 * aggregate by `linkedEntityRefsOf` (the tag's projects and the target's).
 */
export function tagLinkEvent(
  type: 'tag.linked' | 'tag.unlinked',
  target: { kind: TagTargetKind; id: string },
  pivot: { id: string; tagId: string }
): DomainEventInput {
  return {
    type,
    aggregate: { kind: `${target.kind}Tag`, id: pivot.id },
    subjectUserId: target.kind === 'user' ? target.id : null,
    data: { after: { tagId: pivot.tagId, targetKind: target.kind, targetId: target.id } },
  };
}
