'use client';

import { useEffect, useRef, useState } from 'react';

import { Check, Pencil, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EditableTextProps {
  value: string;
  onConfirm: (value: string) => Promise<void> | void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function EditableText({
  value,
  onConfirm,
  className,
  inputClassName,
  placeholder,
  disabled = false,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editableRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && editableRef.current) {
      editableRef.current.textContent = editValue || placeholder || '';

      requestAnimationFrame(() => {
        if (editableRef.current) {
          editableRef.current.focus();
          const range = document.createRange();
          range.selectNodeContents(editableRef.current);
          range.collapse(false); // Collapse to end
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      });
    }
  }, [isEditing, editValue, placeholder]);

  const handleEdit = () => {
    if (disabled) return;
    setEditValue(value);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleConfirm = async () => {
    if (editValue.trim() === value.trim()) {
      setIsEditing(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(editValue.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating value:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    if (editableRef.current) {
      const newValue = editableRef.current.textContent || '';
      setEditValue(newValue);
    }
  };

  const handleInput = () => {
    if (editableRef.current) {
      setEditValue(editableRef.current.textContent || '');
    }
  };

  if (isEditing) {
    return (
      <div className={cn('inline-flex items-center gap-2', className)}>
        <span
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            'outline-none focus:outline-none',
            'border-b-2 border-primary focus:border-primary',
            'min-w-[100px]',
            inputClassName
          )}
          style={{ wordBreak: 'break-word' }}
        />
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            aria-label="Cancel"
            onMouseDown={(e) => e.preventDefault()}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleConfirm}
            disabled={isSubmitting || editValue.trim() === value.trim()}
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            aria-label="Confirm"
            onMouseDown={(e) => e.preventDefault()}
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('group inline-flex items-center gap-2', className)}>
      <span>{value || placeholder}</span>
      {!disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleEdit}
          className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-foreground"
          aria-label="Edit"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
