import type {
  IAccountProjectRepository,
  IEventPublisher,
  IOrganizationProjectRepository,
  IProjectUserCredentialEventPublisher,
  IProjectUserRepository,
  ProjectPasswordSetChange,
} from '@grantjs/core';
import type { DomainEventInput } from '@grantjs/schema';

import { runWithEventSuppressionLifted } from '@/lib/events';
import { resolveProjectScope } from '@/lib/project-scope-resolver.lib';
import { Transaction } from '@/lib/transaction-manager.lib';

/**
 * Publishes `project.user_password_set` (ADR 0011 § 8) for project credentials whose
 * stored hash changed. Standalone, not a `ProjectUserService` method, because
 * `ProjectUserService` depends on `CredentialService` and the credential service is the
 * only caller: a method there would be a construction cycle.
 *
 * `data.after` is `{ projectId, userId, source }` and nothing else: no password, no hash,
 * no key whose name webhook redaction would blank.
 *
 * A CDM import runs with event publishing suppressed so entity writes do not flood the
 * outbox. This event is the exception (a mirror tells an import's echo from an operator
 * write by `source`), so it is published with suppression lifted. The caller only passes
 * rows whose hash changed, so the exception is bounded by what the import really changed.
 */
export class ProjectUserCredentialEventPublisher implements IProjectUserCredentialEventPublisher {
  constructor(
    private readonly events: IEventPublisher,
    private readonly projectUserRepository: IProjectUserRepository,
    private readonly organizationProjectRepository: IOrganizationProjectRepository,
    private readonly accountProjectRepository: IAccountProjectRepository
  ) {}

  async publishPasswordSet(
    changes: ReadonlyArray<ProjectPasswordSetChange>,
    transaction?: Transaction
  ): Promise<void> {
    if (changes.length === 0) {
      return;
    }

    const byProject = new Map<string, ProjectPasswordSetChange[]>();
    for (const change of changes) {
      byProject.set(change.projectId, [...(byProject.get(change.projectId) ?? []), change]);
    }

    const events: DomainEventInput[] = [];
    for (const [projectId, projectChanges] of byProject) {
      // One scope lookup and one membership read per project, however many rows changed.
      const scope = await resolveProjectScope(
        {
          organizationProjects: this.organizationProjectRepository,
          accountProjects: this.accountProjectRepository,
        },
        projectId,
        transaction
      );
      const members = await this.projectUserRepository.getProjectUsers(
        { projectId, userIds: [...new Set(projectChanges.map((change) => change.userId))] },
        transaction
      );
      const memberIdByUserId = new Map(members.map((member) => [member.userId, member.id]));

      for (const { userId, source } of projectChanges) {
        const projectUserId = memberIdByUserId.get(userId);
        events.push({
          type: 'project.user_password_set',
          ...(scope ? { scope } : {}),
          subjectUserId: userId,
          ...(projectUserId ? { aggregate: { kind: 'projectUser', id: projectUserId } } : {}),
          data: { after: { projectId, userId, source } },
        });
      }
    }

    await runWithEventSuppressionLifted(() => this.events.publishMany(events, transaction));
  }
}
