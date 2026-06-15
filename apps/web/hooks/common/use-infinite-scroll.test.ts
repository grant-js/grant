// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useInfiniteScroll } from './use-infinite-scroll';

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  private readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();

  trigger(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }
}

describe('useInfiniteScroll', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls onLoadMore when the sentinel intersects', () => {
    const onLoadMore = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll({
        enabled: true,
        loading: false,
        onLoadMore,
      })
    );

    const root = document.createElement('div');
    const sentinel = document.createElement('div');
    result.current.containerRef.current = root;
    act(() => {
      result.current.sentinelRef(sentinel);
    });

    const observer = MockIntersectionObserver.instances.at(-1);
    expect(observer).toBeDefined();
    act(() => {
      observer?.trigger(true);
    });

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not call onLoadMore while loading', () => {
    const onLoadMore = vi.fn();
    const { result } = renderHook(() =>
      useInfiniteScroll({
        enabled: true,
        loading: true,
        onLoadMore,
      })
    );

    const root = document.createElement('div');
    const sentinel = document.createElement('div');
    result.current.containerRef.current = root;
    act(() => {
      result.current.sentinelRef(sentinel);
    });

    const observer = MockIntersectionObserver.instances.at(-1);
    act(() => {
      observer?.trigger(true);
    });

    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
