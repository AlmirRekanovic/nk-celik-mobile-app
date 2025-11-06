import { Tabs } from 'expo-router';
import { Newspaper, Settings, Vote, ShoppingBag } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#DC2626',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Novosti',
          tabBarIcon: ({ size, color }) => (
            <Newspaper size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="voting"
        options={{
          title: 'Glasanje',
          tabBarIcon: ({ size, color }) => (
            <Vote size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Prodavnica',
          tabBarIcon: ({ size, color }) => (
            <ShoppingBag size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Postavke',
          tabBarIcon: ({ size, color }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
