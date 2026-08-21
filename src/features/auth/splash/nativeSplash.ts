import * as SplashScreen from 'expo-splash-screen';

let preventStarted = false;

/**
 * Keep the native splash visible until the first auth-gated frame can paint.
 * Does not introduce timers or alternate session states.
 */
export async function prepareNativeSplash(): Promise<void> {
  if (preventStarted) {
    return;
  }
  preventStarted = true;
  try {
    await SplashScreen.preventAutoHideAsync();
  } catch {
    // Expo Go / unsupported environments may reject; continue without blocking.
  }
}

export async function hideNativeSplash(): Promise<void> {
  try {
    await SplashScreen.hideAsync();
  } catch {
    // Ignore if already hidden or unavailable.
  }
}
