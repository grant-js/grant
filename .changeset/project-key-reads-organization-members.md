---
'grant-api': minor
---

A project API key that holds `OrganizationMember:Query` can read the members of its own organization, read-only. `organizationMembers` (GraphQL and `GET /api/organization-members`) now accepts an `organizationProject` scope (`organizationId:projectId` as the scope id): the organization is derived from the scope id and the project must belong to it. The key can name only its own project scope, so it cannot read another organization's members, and a key without the permission is still refused. The transport guards are unchanged, and the member mutations and invitations still take an organization scope only. A receiver that mirrors Grant into another system can use this to resolve the display names of the members who acted in its project.
