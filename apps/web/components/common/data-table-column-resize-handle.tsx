'use client';

import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslations } from 'next-intl';

import {
  clampColumnWidth,
  DATA_TABLE_RESIZE_LARGE_STEP_PX,
  DATA_TABLE_RESIZE_STEP_PX,
  type DataTableColumnBounds,
} from '@/lib/data-table-column-resize';
import { cn } from '@/lib/utils';

interface DataTableColumnResizeHandleProps {
  /** Header text of the column, for the accessible name. */
  label: string;
  /** User-set width in px; `undefined` while the column has its default width. */
  width?: number;
  /** Declared default width in px, when it is a px / rem value. */
  defaultWidth?: number;
  bounds: DataTableColumnBounds;
  onResize: (width: number) => void;
  /** Back to the default width. */
  onReset: () => void;
}

/**
 * Drag handle on the right edge of a header cell, and a WAI-ARIA window splitter for the keyboard.
 * Renders inside the `th`, which must be `position: relative`.
 */
export function DataTableColumnResizeHandle({
  label,
  width,
  defaultWidth,
  bounds,
  onResize,
  onReset,
}: DataTableColumnResizeHandleProps) {
  const t = useTranslations('common.dataTable');
  const handleRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [measured, setMeasured] = useState<number | undefined>();

  const measure = useCallback((): number | undefined => {
    const rendered = handleRef.current?.parentElement?.getBoundingClientRect().width;
    return rendered && rendered > 0 ? rendered : undefined;
  }, []);

  // Without a user width the column renders at its default (or shares leftover space): read it.
  useEffect(() => {
    if (width === undefined) setMeasured(measure());
  }, [width, measure]);

  const current = width ?? measured ?? defaultWidth ?? bounds.min;
  const valueNow = clampColumnWidth(current, bounds);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, startWidth: width ?? measure() ?? current };
    setDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    onResize(
      clampColumnWidth(drag.current.startWidth + event.clientX - drag.current.startX, bounds)
    );
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? DATA_TABLE_RESIZE_LARGE_STEP_PX : DATA_TABLE_RESIZE_STEP_PX;
    let next: number;

    switch (event.key) {
      case 'ArrowLeft':
        next = valueNow - step;
        break;
      case 'ArrowRight':
        next = valueNow + step;
        break;
      case 'Home':
        next = bounds.min;
        break;
      case 'End':
        next = bounds.max;
        break;
      case 'Enter':
        event.preventDefault();
        onReset();
        return;
      default:
        return;
    }

    event.preventDefault();
    onResize(clampColumnWidth(next, bounds));
  };

  return (
    <div
      ref={handleRef}
      role="separator"
      aria-orientation="vertical"
      aria-label={t('resizeColumn', { column: label })}
      aria-valuenow={Math.round(valueNow)}
      aria-valuemin={bounds.min}
      aria-valuemax={bounds.max}
      tabIndex={0}
      data-dragging={dragging || undefined}
      className={cn(
        'group absolute inset-y-0 right-0 z-10 flex w-2 cursor-col-resize touch-none select-none justify-end outline-none',
        'focus-visible:ring-ring focus-visible:ring-1'
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
    >
      <span
        aria-hidden
        className={cn(
          'bg-border h-full w-px transition-colors',
          'group-hover:bg-primary group-focus-visible:bg-primary group-data-[dragging]:bg-primary group-data-[dragging]:w-0.5'
        )}
      />
    </div>
  );
}
