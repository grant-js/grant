'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp, GripVertical, Settings2 } from 'lucide-react';
import type { PointerEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useDataTableColumnsStore } from '@/stores/data-table-columns.store';

export interface DataTableColumnToggleItem {
  key: string;
  label: string;
  visible: boolean;
  /** False for columns that stay where they are (actions); they get no grip or move buttons. */
  movable: boolean;
}

export interface DataTableColumnToggleProps {
  /** In the table's display order. */
  columns: DataTableColumnToggleItem[];
  onToggle: (key: string, visible: boolean) => void;
  /** Moves a movable column to `toIndex` among the movable columns; no move controls without it. */
  onMove?: (key: string, toIndex: number) => void;
  /** Restores visibility, order and widths to the defaults; the button is hidden without it. */
  onReset?: () => void;
  iconOnly?: boolean;
}

interface DragState {
  key: string;
  /** Index among the movable columns the row would land on when released. */
  overIndex: number;
}

const ANNOUNCEMENT_CLEAR_MS = 4000;

export function DataTableColumnToggle({
  columns,
  onToggle,
  onMove,
  onReset,
  iconOnly = true,
}: DataTableColumnToggleProps) {
  const t = useTranslations('common.dataTable');

  const [announcement, setAnnouncement] = useState('');
  const [drag, setDrag] = useState<DragState | null>(null);

  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  // After a move the row is rebuilt in a new place; focus goes back to the button just used
  // (or the other one when that button is now disabled at the end of the range).
  const refocus = useRef<{ key: string; direction: 'up' | 'down' } | null>(null);

  const movableKeys = columns.filter((column) => column.movable).map((column) => column.key);

  // The page toolbar picker gets its items one effect after the move, so refocus waits for
  // the order to actually change.
  const orderSignature = columns.map((column) => column.key).join('\0');
  useLayoutEffect(() => {
    const target = refocus.current;
    if (!target) return;
    refocus.current = null;

    const other = target.direction === 'up' ? 'down' : 'up';
    const preferred = buttonRefs.current.get(`${target.key}:${target.direction}`);
    const fallback = buttonRefs.current.get(`${target.key}:${other}`);
    (preferred && !preferred.disabled ? preferred : fallback)?.focus();
  }, [orderSignature]);

  useEffect(() => {
    if (!announcement) return;
    const timer = window.setTimeout(() => setAnnouncement(''), ANNOUNCEMENT_CLEAR_MS);
    return () => window.clearTimeout(timer);
  }, [announcement]);

  if (columns.length === 0) {
    return null;
  }

  const moveTo = (key: string, toIndex: number, focusAfter?: 'up' | 'down') => {
    if (!onMove) return;
    const column = columns.find((candidate) => candidate.key === key);
    const from = movableKeys.indexOf(key);
    const to = Math.min(movableKeys.length - 1, Math.max(0, toIndex));
    if (!column || from === -1 || to === from) return;

    if (focusAfter) refocus.current = { key, direction: focusAfter };
    onMove(key, to);
    setAnnouncement(
      t('columnMoved', { column: column.label, position: to + 1, total: movableKeys.length })
    );
  };

  const moveBy = (key: string, delta: -1 | 1) => {
    moveTo(key, movableKeys.indexOf(key) + delta, delta < 0 ? 'up' : 'down');
  };

  const indexUnderPointer = (clientY: number): number => {
    let index = 0;
    movableKeys.forEach((key, position) => {
      const rect = rowRefs.current.get(key)?.getBoundingClientRect();
      if (rect && clientY >= rect.top) index = position;
    });
    return index;
  };

  const handleGripPointerDown = (key: string, event: PointerEvent<HTMLSpanElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDrag({ key, overIndex: movableKeys.indexOf(key) });
  };

  const handleGripPointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    if (!drag) return;
    const overIndex = indexUnderPointer(event.clientY);
    if (overIndex !== drag.overIndex) setDrag({ ...drag, overIndex });
  };

  const handleGripPointerUp = (event: PointerEvent<HTMLSpanElement>) => {
    if (!drag) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    moveTo(drag.key, indexUnderPointer(event.clientY));
    setDrag(null);
  };

  const trigger = (
    <Button
      variant="outline"
      size={iconOnly ? 'default' : 'sm'}
      className={iconOnly ? 'size-9 min-w-9 max-w-9 p-2' : 'h-8'}
      aria-label={t('columns')}
    >
      <Settings2 className={iconOnly ? 'h-4 w-4' : 'mr-2 h-4 w-4'} />
      {!iconOnly && t('columns')}
    </Button>
  );

  return (
    <Popover>
      {iconOnly ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>{t('columns')}</TooltipContent>
        </Tooltip>
      ) : (
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      )}
      <PopoverContent align="end" className="w-[260px] p-1">
        <div className="text-muted-foreground px-2 py-1.5 text-sm font-medium">
          {t('toggleColumns')}
        </div>
        <ul className="max-h-80 overflow-y-auto" aria-label={t('toggleColumns')}>
          {columns.map((column) => {
            const movableIndex = movableKeys.indexOf(column.key);
            const checkboxId = `column-toggle-${column.key}`;
            const dragging = drag?.key === column.key;
            const dropTarget = drag !== null && drag.overIndex === movableIndex && !dragging;
            const canMove = onMove !== undefined && column.movable;

            return (
              <li
                key={column.key}
                ref={(node) => {
                  if (node) rowRefs.current.set(column.key, node);
                  else rowRefs.current.delete(column.key);
                }}
                className={cn(
                  'flex items-center gap-1 rounded-sm px-1 py-0.5',
                  dragging && 'bg-accent opacity-70',
                  dropTarget && 'ring-ring ring-1'
                )}
              >
                {onMove &&
                  (canMove ? (
                    // Pointer-only affordance; the move buttons are the keyboard path.
                    <span
                      aria-hidden="true"
                      data-testid={`column-grip-${column.key}`}
                      className="text-muted-foreground flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm active:cursor-grabbing"
                      onPointerDown={(event) => handleGripPointerDown(column.key, event)}
                      onPointerMove={handleGripPointerMove}
                      onPointerUp={handleGripPointerUp}
                      onPointerCancel={() => setDrag(null)}
                    >
                      <GripVertical className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="size-6 shrink-0" aria-hidden="true" />
                  ))}
                <Checkbox
                  id={checkboxId}
                  checked={column.visible}
                  onCheckedChange={(checked) => onToggle(column.key, checked === true)}
                />
                <label htmlFor={checkboxId} className="min-w-0 flex-1 truncate text-sm">
                  {column.label}
                </label>
                {canMove && (
                  <>
                    <Button
                      ref={(node) => {
                        if (node) buttonRefs.current.set(`${column.key}:up`, node);
                        else buttonRefs.current.delete(`${column.key}:up`);
                      }}
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      aria-label={t('moveColumnUp', { column: column.label })}
                      disabled={movableIndex === 0}
                      onClick={() => moveBy(column.key, -1)}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      ref={(node) => {
                        if (node) buttonRefs.current.set(`${column.key}:down`, node);
                        else buttonRefs.current.delete(`${column.key}:down`);
                      }}
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      aria-label={t('moveColumnDown', { column: column.label })}
                      disabled={movableIndex === movableKeys.length - 1}
                      onClick={() => moveBy(column.key, 1)}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
        {onReset && (
          <div className="mt-1 border-t pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={onReset}
            >
              {t('resetColumns')}
            </Button>
          </div>
        )}
        <div role="status" aria-live="polite" className="sr-only">
          {announcement}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Toolbar item for the page's list table; renders nothing until a table publishes columns. */
export function PageTableColumnToggle({ iconOnly }: Pick<DataTableColumnToggleProps, 'iconOnly'>) {
  const columns = useDataTableColumnsStore((state) => state.columnToggleItems);
  const onToggle = useDataTableColumnsStore((state) => state.toggleColumnVisibility);
  const onMove = useDataTableColumnsStore((state) => state.moveColumn);
  const onReset = useDataTableColumnsStore((state) => state.resetColumns);

  if (!onToggle) {
    return null;
  }

  return (
    <DataTableColumnToggle
      columns={columns}
      onToggle={onToggle}
      onMove={onMove ?? undefined}
      onReset={onReset ?? undefined}
      iconOnly={iconOnly}
    />
  );
}
