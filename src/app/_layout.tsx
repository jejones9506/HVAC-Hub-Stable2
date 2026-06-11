import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useEffect } from 'react';

import AppTabs from '@/components/app-tabs';
import { initializeApp } from '@/store/hvacStore';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Initialize auth + Supabase session persistence on app start (Step 2)
    initializeApp();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppTabs />
    </ThemeProvider>
  );
}
