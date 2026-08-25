import { useEffect } from 'react';

import { ensureSubscribedIfGranted } from '@/lib/push';

// Silently re-enroll this device for push on boot when notifications are already granted. No
// prompt, no UI: the opt-in card is gone (PC-72) and enrollment is automatic. The one-time
// permission request happens on the login / PIN-unlock gesture (requestNotificationsOnGesture).
export function usePushAutoEnroll(): void {
  useEffect(() => {
    void ensureSubscribedIfGranted();
  }, []);
}
