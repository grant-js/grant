import { useEffect, useRef } from 'react';

import { useRouter } from 'next/navigation';

import { UserView } from '@/components/features/users/UserViewSwitcher';
import { UserSortableField, SortOrder } from '@/graphql/generated/types';
import { useUsersStore } from '@/stores/users.store';

export function useUrlSync() {
  const router = useRouter();
  const { page, limit, search, sort, view, selectedTagIds, isInitialized, initializeFromUrl } =
    useUsersStore();
  const lastUrlRef = useRef<string>('');
  const isInitializingRef = useRef(false);

  // Initialize store from URL on mount (only once)
  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialized && !isInitializingRef.current) {
      isInitializingRef.current = true;
      const params = new URLSearchParams(window.location.search);
      initializeFromUrl(params);
    }
  }, [isInitialized, initializeFromUrl]);

  // Sync store changes to URL (only when initialized)
  useEffect(() => {
    if (!isInitialized || typeof window === 'undefined') return;

    const params = new URLSearchParams();

    if (page > 1) params.set('page', page.toString());
    if (limit !== 50) params.set('limit', limit.toString());
    if (search) params.set('search', search);
    if (sort.field !== UserSortableField.Name || sort.order !== SortOrder.Asc) {
      params.set('sortField', sort.field);
      params.set('sortOrder', sort.order);
    }
    if (view !== UserView.CARD) params.set('view', view);
    if (selectedTagIds.length > 0) params.set('tagIds', selectedTagIds.join(','));

    const newUrl = params.toString() ? `?${params.toString()}` : '';
    const currentUrl = window.location.search;

    // Only update URL if it's actually different and not the same as last update
    if (newUrl !== currentUrl && newUrl !== lastUrlRef.current) {
      lastUrlRef.current = newUrl;
      router.push(newUrl as any);
    }
  }, [page, limit, search, sort, view, selectedTagIds, isInitialized, router]);
}
