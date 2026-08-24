import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { listChores } from '@/lib/api';

/**
 * Returns the number of chores that need admin review: status is 'open' and a proof
 * photo has been submitted by the kid. Refreshes each time the screen comes into focus.
 * Exported so the Review tab screen can reuse the same logic.
 */
export function useReviewCount(token: string | null): number {
  const [count, setCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      listChores(token)
        .then((chores) => {
          const pending = chores.filter(
            (c) => c.status === 'open' && c.proof_photo_url != null,
          );
          setCount(pending.length);
        })
        .catch(() => {
          // Silently ignore fetch errors — the badge is best-effort
        });
    }, [token]),
  );

  return count;
}
