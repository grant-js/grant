import { useMemo } from 'react';

import { Role } from '@logusgraphics/grant-schema';

import { useAuthStore } from '@/stores/auth.store';
import { useMembersStore } from '@/stores/members.store';

/**
 * Hook to get the current user's role in the organization
 * by matching their email with the members list
 */
export function useCurrentMemberRole(): Role | null {
  const email = useAuthStore((state) => state.email);
  const members = useMembersStore((state) => state.members);

  return useMemo(() => {
    if (!email || !members || members.length === 0) {
      return null;
    }

    // Find the current user in the members list by email
    const currentMember = members.find(
      (member) => member.email?.toLowerCase() === email.toLowerCase()
    );

    return currentMember?.role || null;
  }, [email, members]);
}
