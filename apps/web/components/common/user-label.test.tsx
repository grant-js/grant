// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { UserLabel } from './user-label';

describe('UserLabel', () => {
  it('shows the name and, beside it, the email of the Email method', () => {
    render(
      <UserLabel
        user={{
          name: 'Sam Lee',
          authenticationMethods: [
            { provider: 'github', providerId: '42' },
            { provider: 'email', providerId: 'sam.lee@example.test' },
          ],
        }}
      />
    );
    expect(screen.getByText('Sam Lee')).toBeDefined();
    const email = screen.getByTestId('user-label-email');
    expect(email.textContent).toBe('sam.lee@example.test');
    expect(email.getAttribute('title')).toBe('sam.lee@example.test');
  });

  it('shows the name alone when the user has no Email method', () => {
    render(
      <UserLabel
        user={{ name: 'Sam Lee', authenticationMethods: [{ provider: 'google', providerId: 'x' }] }}
      />
    );
    expect(screen.getByText('Sam Lee')).toBeDefined();
    expect(screen.queryByTestId('user-label-email')).toBeNull();
  });

  it('shows the name alone when no authentication methods were loaded', () => {
    render(<UserLabel user={{ name: 'Sam Lee' }} />);
    expect(screen.queryByTestId('user-label-email')).toBeNull();
  });
});
