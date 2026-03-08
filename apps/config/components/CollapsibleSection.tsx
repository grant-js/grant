'use client';

import { ChevronDown } from 'lucide-react';

export interface CollapsibleSectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function CollapsibleSection({ title, expanded, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div className="collapsible-section">
      <button
        type="button"
        className="collapsible-section__trigger"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`collapsible-section-${title.replace(/\s+/g, '-').toLowerCase()}`}
        id={`collapsible-section-trigger-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <ChevronDown
          size={16}
          className="collapsible-section__chevron"
          aria-hidden
        />
        <span className="collapsible-section__title">{title}</span>
        <div className="collapsible-section__line" aria-hidden />
      </button>
      <div
        className="collapsible-section__content-wrapper"
        data-expanded={expanded}
      >
        <div
          id={`collapsible-section-${title.replace(/\s+/g, '-').toLowerCase()}`}
          className="collapsible-section__content"
          role="region"
          aria-labelledby={`collapsible-section-trigger-${title.replace(/\s+/g, '-').toLowerCase()}`}
          aria-hidden={!expanded}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
