import { Tabs } from 'expo-router';
import { Newspaper, Settings, Vote, ShoppingBag, ScanLine, Ticket, MessageCircle } from '@/components/Icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { member, isGuest } = useAuth();
  const { isDarkMode } = useTheme();
  const isAdmin = member?.is_admin || false;
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#D4AF37',
        tabBarInactiveTintColor: isDarkMode ? '#9CA3AF' : '#6B7280',
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: isDarkMode ? '#374151' : '#E5E7EB',
          paddingBottom: insets.bottom > 0 ? insets.bottom : Platform.OS === 'ios' ? 20 : 10,
          height: (insets.bottom > 0 ? insets.bottom : Platform.OS === 'ios' ? 20 : 10) + 60,
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
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ size, color }) => (
            <MessageCircle size={20} color={color} />
          ),
          href: isGuest ? null : undefined,
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
