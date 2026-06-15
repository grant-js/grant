'use client';

import { useCallback, useEffect, useRef } from 'react';

interface UseInfiniteScrollOptions {
  enabled: boolean;
  loading: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
}

export function useInfiniteScroll({
  enabled,
  loading,
  onLoadMore,
  rootMargin = '48px',
}: UseInfiniteScrollOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sentinelNodeRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  const loadingRef = useRef(loading);

  onLoadMoreRef.current = onLoadMore;
  loadingRef.current = loading;

  const disconnectObserver = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = null;
  }, []);

  const connectObserver = useCallback(() => {
    disconnectObserver();

    const root = containerRef.current;
    const sentinel = sentinelNodeRef.current;
    if (!enabled || !root || !sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loadingRef.current) {
          return;
        }
        onLoadMoreRef.current();
      },
      { root, rootMargin, threshold: 0 }
    );

    observer.observe(sentinel);
    observerRef.current = observer;
  }, [disconnectObserver, enabled, rootMargin]);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      sentinelNodeRef.current = node;
      if (node) {
        connectObserver();
      } else {
        disconnectObserver();
      }
    },
    [connectObserver, disconnectObserver]
  );

  useEffect(() => {
    connectObserver();
    return disconnectObserver;
  }, [connectObserver, disconnectObserver]);

  // Re-check intersection after a fetch completes while the sentinel is still visible.
  useEffect(() => {
    if (!loading) {
      connectObserver();
    }
  }, [loading, connectObserver]);

  return { containerRef, sentinelRef };
}
