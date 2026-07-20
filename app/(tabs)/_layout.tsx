import { useState } from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Newspaper,
  Vote,
  ShoppingBag,
  ScanLine,
  Ticket,
  MessageCircle,
  Settings,
  Menu as MenuIcon,
  Star,
} from '@/components/Icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import MenuDrawer from '@/components/MenuDrawer';

export default function TabLayout() {
  const { member, isGuest } = useAuth();
  const { isDarkMode } = useTheme();
  const isAdmin = member?.is_admin || false;
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
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
            tabBarIcon: ({ color }) => <Newspaper size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="karte"
          options={{
            title: 'Karte',
            tabBarIcon: ({ color }) => <Ticket size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="sezonske"
          options={{
            title: 'Sezonske',
            tabBarIcon: ({ color }) => <Star size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color }) => <MessageCircle size={20} color={color} />,
            // Admin gets Skeniraj here instead; guests never see chat.
            href: isGuest || isAdmin ? null : undefined,
          }}
        />
        <Tabs.Screen
          name="checkin"
          options={{
            title: 'Skeniraj',
            tabBarIcon: ({ color }) => <ScanLine size={20} color={color} />,
            href: isAdmin ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: 'Meni',
            tabBarIcon: ({ color }) => <MenuIcon size={22} color={color} />,
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setDrawerOpen(true);
            },
          }}
        />
        <Tabs.Screen name="voting" options={{ href: null, title: 'Glasanje', tabBarIcon: ({ color }) => <Vote size={20} color={color} /> }} />
        <Tabs.Screen name="shop" options={{ href: null, title: 'Shop', tabBarIcon: ({ color }) => <ShoppingBag size={20} color={color} /> }} />
        <Tabs.Screen name="settings" options={{ href: null, title: 'Postavke', tabBarIcon: ({ color }) => <Settings size={20} color={color} /> }} />
      </Tabs>
      <MenuDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
