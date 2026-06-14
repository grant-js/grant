'use client';

import { FeatureModuleCard } from '@/components/common/feature-module-card';

import { SettingCardProps } from './setting-types';

export function SettingCard(props: SettingCardProps) {
  return <FeatureModuleCard {...props} className="max-w-2xl mx-auto" />;
}
