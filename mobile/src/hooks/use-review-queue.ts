import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { Chore, listChores } from '@/lib/api';

// A chore is in the review queue when a kid has submitted proof but the admin has not yet
// awarded it. Ordered oldest-first by id (ids are monotonic; no created_at in the wire shape).
function filterQueue(chores: Chore[]): Chore[] {
  return chores
    .filter((c) => c.status === 'open' && c.proof_photo_urls.length > 0)
    .sort((a, b) => a.id - b.id);
}

export interface UseReviewQueueResult {
  queue: Chore[];
  loading: boolean;
  refreshing: boolean;
  refetch: () => void;
  onRefresh: () => void;
}

/**
 * Fetches the admin chore list and returns the subset awaiting review, sorted oldest-first.
 * The badge in the tab bar and the queue list both consume this hook so the count can never
 * diverge from the visible rows.
 */
export function useReviewQueue(token: string | null): UseReviewQueueResult {
  const [queue, setQueue] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refetch = useCallback(async () => {
    if (!token) return;
    try {
      const all = await listChores(token);
      setQueue(filterQueue(all));
    } catch {
      // Leave the previous data in place on failure; the screen shows it stale.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  // Refresh whenever this screen (or any screen that mounts the hook) gains focus.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
  }, [refetch]);

  return { queue, loading, refreshing, refetch, onRefresh };
}
