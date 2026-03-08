'use client';

import { AlertCircle, Check } from 'lucide-react';
import type { EnvCategoryId } from '@/lib/env-metadata';
import { ENV_CATEGORIES } from '@/lib/env-metadata';
import { CATEGORY_ICONS } from './category-icons';

interface ConfigSidebarProps {
  activeTab: EnvCategoryId;
  onTabChange: (tab: EnvCategoryId) => void;
  isCategoryMisconfigured: (categoryId: EnvCategoryId) => boolean;
}

export function ConfigSidebar({
  activeTab,
  onTabChange,
  isCategoryMisconfigured,
}: ConfigSidebarProps) {
  return (
    <aside className="config-sidebar">
      <div className="card">
        <div className="sidebar-tabs">
          {ENV_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id];
            const misconfigured = isCategoryMisconfigured(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                className={`sidebar-tab ${activeTab === cat.id ? 'active' : ''}`}
                onClick={() => onTabChange(cat.id)}
              >
                {Icon && <Icon className="tab-icon" />}
                <span>{cat.label}</span>
                {misconfigured ? (
                  <AlertCircle className="tab-status tab-status-error" aria-label="Has issues" />
                ) : (
                  <Check className="tab-status tab-status-ok" aria-label="OK" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
