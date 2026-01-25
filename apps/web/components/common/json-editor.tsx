'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useTheme } from 'next-themes';
import { createJSONEditor, JSONEditorPropsOptional, Mode } from 'vanilla-jsoneditor';

import { cn } from '@/lib/utils';

interface JsonEditorProps {
  value?: string | object;
  onChange?: (value: object | null) => void;
  onBlur?: () => void;
  disabled?: boolean;
  className?: string;
  error?: string;
  height?: string | number;
}

export function JsonEditor({
  value,
  onChange,
  onBlur,
  disabled = false,
  className = '',
  error,
}: JsonEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<ReturnType<typeof createJSONEditor> | null>(null);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);
  const valueRef = useRef(value);
  const isUserChangeRef = useRef(false);
  const invalidTextRef = useRef<string | null>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    onChangeRef.current = onChange;
    disabledRef.current = disabled;
    valueRef.current = value;
  }, [onChange, disabled, value]);

  const handleBlur = useCallback(() => {
    // Validate immediately on blur
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
      validationTimeoutRef.current = null;
    }

    if (invalidTextRef.current !== null && onChangeRef.current) {
      // Use a special marker that schema will reject
      onChangeRef.current({ __invalidJson: true } as any);
    }

    if (onBlur) {
      onBlur();
    }
  }, [onBlur]);

  const isDark =
    resolvedTheme === 'dark' ||
    (resolvedTheme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const getContentFromValue = (val: string | object | null | undefined) => {
    if (val === null || val === undefined) {
      return { text: '' };
    }

    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return { text: JSON.stringify(parsed, null, 2) };
      } catch {
        return { text: val };
      }
    }

    return { text: JSON.stringify(val, null, 2) };
  };

  const handleEditorChange = useCallback((updatedContent: any) => {
    if (disabledRef.current || !onChangeRef.current) return;

    isUserChangeRef.current = true;

    // Clear any existing validation timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
      validationTimeoutRef.current = null;
    }

    try {
      if ('text' in updatedContent && updatedContent.text && updatedContent.text.trim()) {
        const parsed = JSON.parse(updatedContent.text);
        invalidTextRef.current = null;
        onChangeRef.current(parsed);
      } else {
        invalidTextRef.current = null;
        onChangeRef.current(null);
      }
    } catch {
      // Store invalid text but don't set invalid marker or trigger validation
      // This allows users to continue typing without their content being replaced
      // Validation will only happen on blur or submit
      invalidTextRef.current = updatedContent.text;
      isUserChangeRef.current = false;
    }
  }, []);

  const getBaseProps = useCallback(
    (additionalProps?: Partial<JSONEditorPropsOptional>): JSONEditorPropsOptional => ({
      mode: Mode.text,
      mainMenuBar: false,
      navigationBar: false,
      statusBar: false,
      readOnly: disabledRef.current,
      onChange: handleEditorChange,
      ...additionalProps,
    }),
    [handleEditorChange]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const initialContent = getContentFromValue(valueRef.current);
    editorRef.current = createJSONEditor({
      target: containerRef.current,
      props: getBaseProps({ content: initialContent }),
    });

    const currentIsDark =
      resolvedTheme === 'dark' ||
      (resolvedTheme === 'system' &&
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    requestAnimationFrame(() => {
      if (!containerRef.current) return;

      containerRef.current.classList.toggle('jse-theme-dark', currentIsDark);
      containerRef.current.classList.toggle('jse-theme-light', !currentIsDark);

      const editorElements = containerRef.current.querySelectorAll(
        '.jse-contents, .jse-menu, .jse-text, .jse-main'
      );
      editorElements.forEach((element) => {
        element.classList.toggle('jse-theme-dark', currentIsDark);
        element.classList.toggle('jse-theme-light', !currentIsDark);
      });
    });

    // Add blur event listener to the container
    const container = containerRef.current;
    container.addEventListener('blur', handleBlur, true);

    return () => {
      container.removeEventListener('blur', handleBlur, true);
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
        validationTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleBlur]);

  useEffect(() => {
    if (!containerRef.current) return;

    const rootElement = containerRef.current;
    rootElement.classList.toggle('jse-theme-dark', isDark);
    rootElement.classList.toggle('jse-theme-light', !isDark);

    // Apply theme to all JSON editor elements, including nested CodeMirror elements
    const editorElements = rootElement.querySelectorAll(
      '.jse-contents, .jse-menu, .jse-text, .jse-main, .cm-editor, .cm-scroller'
    );
    editorElements.forEach((element) => {
      element.classList.toggle('jse-theme-dark', isDark);
      element.classList.toggle('jse-theme-light', !isDark);
    });
  }, [isDark, error]); // Re-apply theme when error state or theme changes

  useEffect(() => {
    if (!editorRef.current) return;

    if (isUserChangeRef.current) {
      isUserChangeRef.current = false;
      editorRef.current.updateProps(getBaseProps());
      return;
    }

    // If we have invalid text stored, don't replace it with the value
    // This preserves what the user is typing even if it's invalid JSON
    if (invalidTextRef.current !== null) {
      return;
    }

    const content = getContentFromValue(value);
    const currentContent = editorRef.current.get();
    const currentText = currentContent && 'text' in currentContent ? currentContent.text || '' : '';
    const newText = content.text || '';

    const contentChanged = currentText !== newText;

    editorRef.current.updateProps(getBaseProps(contentChanged ? { content } : undefined));
  }, [value, disabled, getBaseProps]);

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'rounded-md border overflow-hidden',
          error ? 'border-destructive' : 'border-input',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div ref={containerRef} />
      </div>
    </div>
  );
}
