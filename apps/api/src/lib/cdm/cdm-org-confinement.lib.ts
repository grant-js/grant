/**
 * Org confinement for CDM password import (ADR 0010, Amendment: org-scoped eligibility).
 *
 * A credential lives on a global identity, so an import may write one only onto an identity
 * that no other organization relies on. This is the decision, kept free of I/O so it can be
 * tested exhaustively; the repository gathers the facts in a constant number of queries.
 */

export interface MembershipFacts {
  /**
   * One entry per **active** project membership of the user: the ids of the organizations
   * that project belongs to through an **active** `organization_projects` row (empty when the
   * project belongs to none).
   */
  projectOrganizationIds: ReadonlyArray<readonly string[]>;
  /** The organizations of the user's **active** organization memberships. */
  organizationIds: readonly string[];
}

/**
 * True when every membership of the user is inside `organizationId` and there is at least
 * one. A project that belongs to another organization as well, or to none, is outside.
 */
export function isConfinedToOrganization(facts: MembershipFacts, organizationId: string): boolean {
  const projectsInside = facts.projectOrganizationIds.every(
    (orgs) => orgs.length > 0 && orgs.every((id) => id === organizationId)
  );
  const organizationsInside = facts.organizationIds.every((id) => id === organizationId);
  const hasMembership = facts.projectOrganizationIds.length + facts.organizationIds.length > 0;
  return projectsInside && organizationsInside && hasMembership;
}
