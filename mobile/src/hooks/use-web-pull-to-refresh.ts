import { useEffect } from 'react';
import { Platform } from 'react-native';

// react-native-web never wires RefreshControl's pull gesture, so pull-to-refresh is dead on the
// PWA. This hook restores it and, importantly, makes it *feel* like a native app: the list
// follows your finger with elastic resistance, and it only refreshes when you pull past the
// threshold and release. No-op on native, where RefreshControl already handles this.
//
// RESISTANCE < 1 is the "play" — the content moves less than your finger, so a small pull barely
// budges and you have to deliberately drag past the threshold before letting go.
const RESISTANCE = 0.5;
const SPRING_MS = 220;

export function useWebPullToRefresh(
  node: HTMLElement | null,
  onRefresh: () => void,
  { threshold = 100 }: { threshold?: number } = {},
) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !node) return;

    let startY = 0;
    let pulling = false;
    let dy = 0;

    const setPull = (px: number) => {
      node.style.transform = px > 0 ? `translateY(${px}px)` : '';
    };

    const springBack = () => {
      node.style.transition = `transform ${SPRING_MS}ms ease-out`;
      setPull(0);
      window.setTimeout(() => {
        node.style.transition = '';
      }, SPRING_MS);
    };

    const onTouchStart = (e: TouchEvent) => {
      // Only arm a pull when the list is already scrolled to the very top.
      pulling = node.scrollTop <= 0;
      startY = e.touches[0]?.clientY ?? 0;
      dy = 0;
      node.style.transition = '';
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling) return;
      dy = (e.touches[0]?.clientY ?? 0) - startY;
      if (dy <= 0) {
        // Dragging back up — hand control back to normal scrolling.
        pulling = false;
        setPull(0);
        return;
      }
      // Stop the page from scrolling while we own the gesture, and follow the finger.
      e.preventDefault();
      setPull(dy * RESISTANCE);
    };

    const onTouchEnd = () => {
      if (!pulling) return;
      const triggered = dy > threshold;
      pulling = false;
      springBack();
      if (triggered) onRefresh();
    };

    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchmove', onTouchMove, { passive: false });
    node.addEventListener('touchend', onTouchEnd, { passive: true });
    node.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
      node.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [node, onRefresh, threshold]);
}
