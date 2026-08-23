import { useEffect } from 'react';
import { Platform } from 'react-native';

// react-native-web never wires RefreshControl's pull gesture, so pull-to-refresh is dead on the
// PWA. This hook restores it: it watches touch drags at the very top of a scroll node and fires
// onRefresh once the drag passes a threshold. No-op on native, where RefreshControl works.
export function useWebPullToRefresh(
  node: HTMLElement | null,
  onRefresh: () => void,
  { threshold = 70 }: { threshold?: number } = {},
) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !node) return;

    let startY = 0;
    let pulling = false;

    const onTouchStart = (e: TouchEvent) => {
      // Only arm a pull when the list is already scrolled to the top.
      pulling = node.scrollTop <= 0;
      startY = e.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling) return;
      const dy = (e.touches[0]?.clientY ?? 0) - startY;
      if (dy > threshold) {
        pulling = false;
        onRefresh();
      }
    };

    const onTouchEnd = () => {
      pulling = false;
    };

    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchmove', onTouchMove, { passive: true });
    node.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
    };
  }, [node, onRefresh, threshold]);
}
