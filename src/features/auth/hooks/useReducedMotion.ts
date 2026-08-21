import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** True when the OS Reduce Motion setting is enabled. Does not affect routing. */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) {
          setReducedMotion(enabled);
        }
      })
      .catch(() => {
        if (mounted) {
          setReducedMotion(false);
        }
      });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reducedMotion;
}
