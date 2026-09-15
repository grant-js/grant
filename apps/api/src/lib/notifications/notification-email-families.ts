import type { EventType } from '@grantjs/schema';
import { EVENT_TYPES } from '@grantjs/schema';

const NOTIFICATION_EMAIL_FAMILIES = [
  'namedEntity',
  'assignment',
  'subjectAssignment',
  'apiKey',
  'userRole',
  'invitation',
  'membership',
  'security',
  'sync',
] as const;

export type NotificationEmailFamily = (typeof NOTIFICATION_EMAIL_FAMILIES)[number];

export const NOTIFICATION_EMAIL_FAMILY_BY_TYPE: Record<EventType, NotificationEmailFamily> = {
  'role.created': 'namedEntity',
  'role.updated': 'namedEntity',
  'role.deleted': 'namedEntity',
  'permission.created': 'namedEntity',
  'permission.updated': 'namedEntity',
  'permission.deleted': 'namedEntity',
  'group.created': 'namedEntity',
  'group.updated': 'namedEntity',
  'group.deleted': 'namedEntity',
  'resource.created': 'namedEntity',
  'resource.updated': 'namedEntity',
  'resource.deleted': 'namedEntity',
  'role.permission_assigned': 'assignment',
  'role.permission_revoked': 'assignment',
  'user.permission_assigned': 'subjectAssignment',
  'user.permission_revoked': 'subjectAssignment',
  'group.permission_assigned': 'assignment',
  'group.permission_revoked': 'assignment',
  'role.group_assigned': 'assignment',
  'role.group_revoked': 'assignment',
  'user.group_assigned': 'subjectAssignment',
  'user.group_revoked': 'subjectAssignment',
  'api_key.created': 'apiKey',
  'api_key.rotated': 'apiKey',
  'api_key.revoked': 'apiKey',
  'user.role_assigned': 'userRole',
  'user.role_revoked': 'userRole',
  'organization.invitation_sent': 'invitation',
  'organization.invitation_accepted': 'invitation',
  'organization.invitation_revoked': 'invitation',
  'organization.member_added': 'membership',
  'organization.member_role_changed': 'membership',
  'organization.member_removed': 'membership',
  'project.user_added': 'membership',
  'project.user_removed': 'membership',
  'project.user_profile_updated': 'membership',
  'user.email_verification_requested': 'security',
  'organization.mfa_enforcement_changed': 'security',
  'signing_key.created': 'security',
  'signing_key.rotated': 'security',
  'user.mfa_enabled': 'security',
  'user.mfa_disabled': 'security',
  'user.mfa_recovery_codes_regenerated': 'security',
  'user.session_revoked': 'security',
  'user.sessions_revoked': 'security',
  'user.password_changed': 'security',
  'project_sync.completed': 'sync',
  'project_sync.failed': 'sync',
};

export function assertNotificationEmailFamilyCoverage(): EventType[] {
  return EVENT_TYPES.filter((type) => !(type in NOTIFICATION_EMAIL_FAMILY_BY_TYPE));
}
