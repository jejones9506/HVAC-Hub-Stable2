import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initializeApp } from '@/store/hvacStore';

export default function RootLayout() {
  useEffect(() => {
    // Initialize auth + Supabase session persistence on app start (Step 2)
    initializeApp();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false, // All screens manage their own headers/titles + dropdown menus (no bottom tabs)
      }}
    />
  );
}
