'use client';

interface ConfigPageHeaderProps {
  /** Optional content to render on the left (e.g. hamburger menu on mobile) */
  leftSlot?: React.ReactNode;
  /** Optional content to render on the right (e.g. theme switcher) */
  rightSlot?: React.ReactNode;
}

export function ConfigPageHeader({ leftSlot, rightSlot }: ConfigPageHeaderProps) {
  return (
    <header className="panel-header">
      <div className="panel-header-left">
        {leftSlot}
        <div className="panel-header-brand">
          <img
            src="/grant-logo-black.png"
            alt=""
            className="panel-header-logo panel-header-logo-light"
          />
          <img
            src="/grant-logo-white.png"
            alt=""
            className="panel-header-logo panel-header-logo-dark"
          />
          <h1 className="panel-header-title">Config</h1>
        </div>
      </div>
      {rightSlot != null && <div className="panel-header-actions">{rightSlot}</div>}
    </header>
  );
}
