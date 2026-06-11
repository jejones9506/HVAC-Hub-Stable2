import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Colors } from '@/constants/theme';

// Stable Tabs implementation (replaced unstable-native-tabs which can cause
// immediate launch crashes in EAS Android APKs on Android 16+).
// This uses the standard, well-tested expo-router Tabs API.
export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary || '#666',
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.backgroundElement || '#ccc',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="house" size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="equipment"
        options={{
          title: 'Equipment',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="magnifyingglass" size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calculators"
        options={{
          title: 'Calculators',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="function" size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI Assistant',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="brain.head.profile" size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="epa"
        options={{
          title: 'EPA Study',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="book.fill" size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="person" size={size} tintColor={color} />
          ),
        }}
      />
    </Tabs>
  );
}
