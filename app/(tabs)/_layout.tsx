import { Tabs } from 'expo-router';
import { Colors } from '../../src/core/theme/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.cardBorder,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'בית', tabBarIcon: () => null }} />
    </Tabs>
  );
}
