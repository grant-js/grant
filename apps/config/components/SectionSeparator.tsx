'use client';

export interface SectionSeparatorProps {
  title: string;
}

export function SectionSeparator({ title }: SectionSeparatorProps) {
  return (
    <div className="config-section-separator" role="separator" aria-label={`Section: ${title}`}>
      <span className="config-section-separator__title">{title}</span>
    </div>
  );
}
