/**
 * Moves one project's membership from one user to another (`linkProjectUserIdentity`).
 *
 * Every write names the project, and only rows of that project, or rows whose target the
 * project owns, change. Nothing here publishes an event or writes an audit row: the service
 * does both once for the whole link.
 */

/** What the service needs to decide whether a link may run. Ids and booleans only. */
export interface ProjectUserIdentityLinkFacts {
  /** The project is a live project of the organization. */
  projectInOrganization: boolean;
  /** `fromUserId` has a live membership row of the project. */
  fromIsMember: boolean;
  /** `toUserId` is a live user. */
  toIsLive: boolean;
  /** `toUserId` is a live member of the organization. */
  toInOrganization: boolean;
  /** `toUserId` already has a live membership row of the project. */
  toIsMember: boolean;
}

/** Rows moved (or, for duplicates the target already held, retired) per table. */
export interface ProjectUserIdentityLinkMoveCounts {
  projectUsers: number;
  projectUserGroups: number;
  projectUserPermissions: number;
  projectUserApiKeys: number;
  projectUserCredentials: number;
  userRoles: number;
  userGroups: number;
  userPermissions: number;
  userTags: number;
  /** Rows of the source the target already held on the same target, soft-deleted instead. */
  duplicatesRetired: number;
}

export interface ProjectUserIdentityLinkMoveResult {
  /** The id of the membership row, now the target's (the row is re-pointed, not replaced). */
  projectUserId: string;
  counts: ProjectUserIdentityLinkMoveCounts;
}

export interface IProjectUserIdentityLinkRepository {
  readLinkFacts(
    params: { projectId: string; organizationId: string; fromUserId: string; toUserId: string },
    transaction?: unknown
  ): Promise<ProjectUserIdentityLinkFacts>;

  /**
   * Re-point the source's membership row of the project, and its project-owned pivots, to the
   * target. Deletes the source's password reset and credential lockout rows of the project.
   * Fails when the source has no live membership row of the project.
   */
  moveProjectMembership(
    params: { projectId: string; fromUserId: string; toUserId: string },
    transaction?: unknown
  ): Promise<ProjectUserIdentityLinkMoveResult>;

  /**
   * Whether the user has a live membership of any project other than `projectId`. Read on the
   * unrestricted connection, outside the request's transaction: the project's row-level
   * security hides other projects' memberships from a scoped request.
   */
  hasMembershipOutsideProject(
    params: { userId: string; projectId: string },
    transaction?: unknown
  ): Promise<boolean>;

  /**
   * Remove the user's global `metadata.cdmImport` marker when it names `projectId`, so an
   * import key of the project no longer resolves to the user. Returns whether it was removed.
   */
  stripProjectImportMarker(
    params: { userId: string; projectId: string },
    transaction?: unknown
  ): Promise<boolean>;

  /** Soft-delete the user and its live organization memberships. Publishes nothing. */
  retireUser(params: { userId: string }, transaction?: unknown): Promise<void>;
}
