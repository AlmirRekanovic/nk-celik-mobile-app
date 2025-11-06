import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { registerBackgroundFetch } from '@/services/backgroundFetch';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    registerBackgroundFetch();
  }, []);

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="news/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="admin/polls" options={{ headerShown: false }} />
        <Stack.Screen name="admin/create-poll" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
