import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/**
 * Regression test for a deadlock that shipped twice in this component, in two
 * different disguises.
 *
 * Permissions here are fetched lazily — `useGrant(..., { enabled: hasBeenOpened })` —
 * so on the first render both grants are false and no action is available. Anything
 * that hides or disables the trigger in that state is self-defeating: the trigger is
 * what sets `hasBeenOpened`, so removing it means the permissions are never fetched,
 * the state never changes, and the menu never appears.
 *
 * It shipped first as `if (actions.length === 0) return null` (no menu at all), and
 * then, once that was fixed, as `isLoading={!permissionsResolved || …}` — which
 * `Actions` renders as a spinner *and* a disabled trigger, so the menu spun forever.
 *
 * Hence the assertion: before any interaction, the trigger must exist and be enabled.
 * That is the property both bugs violated, and it does not depend on which mechanism
 * a future edit uses to break it.
 */

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// `@/components/common` reaches `@/i18n/navigation`, whose `createNavigation` imports
// `next/navigation` in a form the test runner cannot resolve. Nothing here navigates.
vi.mock('@/i18n/navigation', () => ({
  Link: 'a',
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@grantjs/client/react', () => ({
  // Exactly the disabled-fetch state: nothing granted, nothing loading.
  useGrant: () => ({ isGranted: false, isLoading: false }),
}));

vi.mock('@/hooks/auth', () => ({
  useRequiresEmailVerificationForMutation: () => false,
}));

vi.mock('@/hooks/common', () => ({
  useProjectGrantContext: () => undefined,
}));

vi.mock('@/hooks/webhooks', () => ({
  useWebhookSubscriptionMutations: () => ({ rotateSecret: vi.fn() }),
}));

vi.mock('@/stores/webhooks.store', () => ({
  useWebhooksStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      refetch: vi.fn(),
      handleSecretRevealed: vi.fn(),
      setSubscriptionToDelete: vi.fn(),
    }),
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const { WebhookSubscriptionActions } = await import('./webhook-subscription-actions');

const subscription = {
  id: 'sub-1',
  url: 'https://example.test/hook',
} as never;

const scope = { tenant: 'organizationProject', id: 'org-1:project-1' } as never;

describe('WebhookSubscriptionActions', () => {
  it('renders an enabled trigger before permissions have been requested', () => {
    render(<WebhookSubscriptionActions subscription={subscription} scope={scope} />);

    // `Actions` renders its trigger as a button; opening it is what allows the
    // permission queries to run at all.
    const trigger = screen.getByRole('button');

    expect(trigger).toBeDefined();
    expect(trigger.hasAttribute('disabled')).toBe(false);
  });
});
