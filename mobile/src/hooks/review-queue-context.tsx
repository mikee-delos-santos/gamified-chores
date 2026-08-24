import { createContext, useContext, type ReactNode } from 'react';

import { useSession } from '@/lib/session';

import { useReviewQueue, type UseReviewQueueResult } from './use-review-queue';

// One shared review queue for the whole admin area. The tab-bar badge and the Review list both
// read this single instance, so the count can never diverge from the visible rows. Awarding or
// rejecting a chore refetches this queue, which is why the badge drops the moment a chore leaves
// the needs-review state instead of waiting for a full app reload.
const ReviewQueueContext = createContext<UseReviewQueueResult | null>(null);

export function ReviewQueueProvider({ children }: { children: ReactNode }) {
  const { token } = useSession();
  const value = useReviewQueue(token);
  return <ReviewQueueContext.Provider value={value}>{children}</ReviewQueueContext.Provider>;
}

export function useReviewQueueContext(): UseReviewQueueResult {
  const ctx = useContext(ReviewQueueContext);
  if (!ctx) {
    throw new Error('useReviewQueueContext must be used inside a ReviewQueueProvider');
  }
  return ctx;
}
