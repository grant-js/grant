import type { WebhookDeliveryAttempt } from '@grantjs/schema';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface WebhookDeliveriesState {
  page: number;
  limit: number;
  totalCount: number;
  deliveries: WebhookDeliveryAttempt[];
  loading: boolean;
  refetch: (() => void) | null;

  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setTotalCount: (totalCount: number) => void;
  setDeliveries: (deliveries: WebhookDeliveryAttempt[]) => void;
  setLoading: (loading: boolean) => void;
  setRefetch: (refetch: (() => void) | null) => void;
  reset: () => void;
}

const initialState = {
  page: 1,
  limit: 10,
  totalCount: 0,
  deliveries: [] as WebhookDeliveryAttempt[],
  loading: false,
  refetch: null as (() => void) | null,
};

export const useWebhookDeliveriesStore = create<WebhookDeliveriesState>()(
  devtools(
    (set) => ({
      ...initialState,
      setPage: (page) => set({ page }),
      setLimit: (limit) => set({ limit, page: 1 }),
      setTotalCount: (totalCount) => set({ totalCount }),
      setDeliveries: (deliveries) => set({ deliveries }),
      setLoading: (loading) => set({ loading }),
      setRefetch: (refetch) => set({ refetch }),
      reset: () => set(initialState),
    }),
    { name: 'grant-webhook-deliveries-store' }
  )
);
