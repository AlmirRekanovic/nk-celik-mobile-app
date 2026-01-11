import { Tabs } from 'expo-router';
import { Newspaper, Settings, Vote, ShoppingBag, ScanLine, Ticket } from '@/components/Icons';
import { useAuth } from '@/contexts/AuthContext';
import { Platform } from 'react-native';

export default function TabLayout() {
  const { member } = useAuth();
  const isAdmin = member?.is_admin || false;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#D4AF37',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          height: Platform.OS === 'ios' ? 85 : 65,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: -2,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Novosti',
          tabBarIcon: ({ size, color }) => (
            <Newspaper size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="voting"
        options={{
          title: 'Glasanje',
          tabBarIcon: ({ size, color }) => (
            <Vote size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="karte"
        options={{
          title: 'Karte',
          tabBarIcon: ({ size, color }) => (
            <Ticket size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ size, color }) => (
            <ShoppingBag size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: 'Skeniraj',
          tabBarIcon: ({ size, color }) => (
            <ScanLine size={20} color={color} />
          ),
          href: isAdmin ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Postavke',
          tabBarIcon: ({ size, color }) => (
            <Settings size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
