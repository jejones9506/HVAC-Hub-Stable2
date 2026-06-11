// Neutralized for consistency with Android stable build.
// Reanimated usage removed to prevent any potential bundling issues.
// Splash is already no-op; AnimatedIcon is now plain View.

import { View } from 'react-native';

export function AnimatedSplashOverlay() {
  return null;
}

export function AnimatedIcon() {
  // Minimal placeholder (no reanimated)
  return (
    <View style={{ width: 128, height: 128, backgroundColor: '#208AEF', borderRadius: 64 }} />
  );
}
