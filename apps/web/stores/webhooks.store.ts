import type { WebhookSubscription } from '@grantjs/schema';
import { SortOrder } from '@grantjs/schema';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import {
  WebhookSortableField,
  type WebhookSortInput,
  type WebhookView,
} from '@/components/features/webhooks/webhook-types';

interface WebhooksState {
  page: number;
  limit: number;
  totalCount: number;
  search: string;
  sort: WebhookSortInput;
  view: WebhookView;
  subscriptions: WebhookSubscription[];
  loading: boolean;
  refetch: (() => void) | null;
  secretDialogOpen: boolean;
  revealedSecret: string | null;
  subscriptionToDelete: WebhookSubscription | null;
  currentSubscription: WebhookSubscription | null;

  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setTotalCount: (totalCount: number) => void;
  setSearch: (search: string) => void;
  setSort: (field: WebhookSortableField, order: SortOrder) => void;
  setView: (view: WebhookView) => void;
  setSubscriptions: (subscriptions: WebhookSubscription[]) => void;
  setLoading: (loading: boolean) => void;
  setRefetch: (refetch: (() => void) | null) => void;
  setSecretDialogOpen: (open: boolean) => void;
  setRevealedSecret: (secret: string | null) => void;
  handleSecretRevealed: (secret: string) => void;
  setSubscriptionToDelete: (subscription: WebhookSubscription | null) => void;
  setCurrentSubscription: (subscription: WebhookSubscription | null) => void;
  reset: () => void;
}

const defaultSort: WebhookSortInput = {
  field: WebhookSortableField.CreatedAt,
  order: SortOrder.Desc,
};

const initialState = {
  page: 1,
  limit: 10,
  totalCount: 0,
  search: '',
  sort: defaultSort,
  view: 'card' as WebhookView,
  subscriptions: [] as WebhookSubscription[],
  loading: false,
  refetch: null as (() => void) | null,
  secretDialogOpen: false,
  revealedSecret: null as string | null,
  subscriptionToDelete: null as WebhookSubscription | null,
  currentSubscription: null as WebhookSubscription | null,
};

export const useWebhooksStore = create<WebhooksState>()(
  devtools(
    (set) => ({
      ...initialState,

      setPage: (page) => set({ page }),
      setLimit: (limit) => set({ limit, page: 1 }),
      setTotalCount: (totalCount) => set({ totalCount }),
      setSearch: (search) => set({ search, page: 1 }),
      setSort: (field, order) => set({ sort: { field, order }, page: 1 }),
      setView: (view) => set({ view }),
      setSubscriptions: (subscriptions) => set({ subscriptions }),
      setLoading: (loading) => set({ loading }),
      setRefetch: (refetch) => set({ refetch }),
      setSecretDialogOpen: (open) => set({ secretDialogOpen: open }),
      setRevealedSecret: (secret) => set({ revealedSecret: secret }),
      handleSecretRevealed: (secret) => set({ revealedSecret: secret, secretDialogOpen: true }),
      setSubscriptionToDelete: (subscription) => set({ subscriptionToDelete: subscription }),
      setCurrentSubscription: (subscription) => set({ currentSubscription: subscription }),
      reset: () => set(initialState),
    }),
    { name: 'grant-webhooks-store' }
  )
);
