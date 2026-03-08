'use client';

import { Menu, X } from 'lucide-react';

interface HamburgerButtonProps {
  expanded: boolean;
  onToggle: () => void;
  ariaLabel?: string;
}

export function HamburgerButton({
  expanded,
  onToggle,
  ariaLabel = 'Toggle navigation menu',
}: HamburgerButtonProps) {
  return (
    <button
      type="button"
      className="hamburger-btn"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={ariaLabel}
    >
      {expanded ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
    </button>
  );
}
