// Neutralized for stable Android 16 APK builds.
// The heavy Reanimated Keyframe + worklets splash was causing immediate launch crashes
// in standalone EAS APKs (even when not directly imported in some cases).
// Splash is now removed from _layout.tsx. This file now exports simple no-op components
// to avoid pulling in unstable reanimated 4 + worklets code paths during bundling.

import { View } from 'react-native';

export function AnimatedSplashOverlay() {
  // No-op: prevents any Keyframe/worklets execution on app launch
  return null;
}

export function AnimatedIcon() {
  // Minimal placeholder (no reanimated) in case referenced elsewhere
  return (
    <View style={{ width: 128, height: 128, backgroundColor: '#208AEF', borderRadius: 64 }} />
  );
}
