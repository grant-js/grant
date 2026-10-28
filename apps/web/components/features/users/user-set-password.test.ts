import { describe, expect, it } from 'vitest';

import de from '@/i18n/locales/de.json';
import en from '@/i18n/locales/en.json';

import { setProjectUserPasswordSchema } from './user-types';

const STRONG = 'Zq8!mWvKp4#x';

describe('setProjectUserPasswordSchema', () => {
  it('accepts a policy-conforming password that matches its confirmation', () => {
    expect(
      setProjectUserPasswordSchema.safeParse({ password: STRONG, confirmPassword: STRONG }).success
    ).toBe(true);
  });

  it('applies the password policy to the password', () => {
    const result = setProjectUserPasswordSchema.safeParse({
      password: 'short',
      confirmPassword: 'short',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a confirmation that differs, on the confirmation field', () => {
    const result = setProjectUserPasswordSchema.safeParse({
      password: STRONG,
      confirmPassword: `${STRONG}x`,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          message: 'errors.validation.passwordMismatch',
          path: ['confirmPassword'],
        }),
      ]);
    }
  });

  it('requires the confirmation', () => {
    const result = setProjectUserPasswordSchema.safeParse({
      password: STRONG,
      confirmPassword: '',
    });

    expect(result.success).toBe(false);
  });
});

describe.each(Object.entries({ en, de }))('set-password messages (%s)', (_locale, messages) => {
  it('has the action, dialog and toast copy', () => {
    const { actions, setPasswordDialog, notifications } = messages.users;

    expect(actions.setPassword).toBeTruthy();
    expect(Object.keys(setPasswordDialog).sort()).toEqual(
      [
        'cancel',
        'confirm',
        'confirmPassword',
        'description',
        'password',
        'title',
        'updating',
      ].sort()
    );
    expect(notifications.setPasswordSuccess).toBeTruthy();
    expect(notifications.setPasswordError).toBeTruthy();
  });

  it('has names and descriptions for both new project-user permissions', () => {
    for (const bucket of [messages.permissions.names, messages.permissions.descriptions]) {
      expect(bucket.projectUser.setPassword).toBeTruthy();
      expect(bucket.projectUser.exportCredentials).toBeTruthy();
    }
  });

  it('has a label for the project.user_password_set and project.user_email_changed webhook events', () => {
    expect(messages.webhooks.events.types.project.user_password_set).toBeTruthy();
    expect(messages.webhooks.events.types.project.user_email_changed).toBeTruthy();
  });

  it('does not interpolate a value into the toasts', () => {
    const { setPasswordSuccess, setPasswordError } = messages.users.notifications;

    expect(setPasswordSuccess).not.toMatch(/[{}]/);
    expect(setPasswordError).not.toMatch(/[{}]/);
  });
});
