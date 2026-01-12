import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { registerBackgroundFetch } from '@/services/backgroundFetch';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { NewsProvider, useNews } from '@/contexts/NewsContext';
import LoadingScreen from '@/components/LoadingScreen';

function AppContent() {
  const { loading: authLoading } = useAuth();
  const { initialized: newsInitialized } = useNews();
  const [forceReady, setForceReady] = useState(false);

  useEffect(() => {
    registerBackgroundFetch();

    const timeout = setTimeout(() => {
      console.warn('App initialization timeout - forcing ready state');
      setForceReady(true);
    }, 15000);

    return () => clearTimeout(timeout);
  }, []);

  if (!forceReady && (authLoading || !newsInitialized)) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="news/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="admin/polls" options={{ headerShown: false }} />
        <Stack.Screen name="admin/create-poll" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <NewsProvider>
        <AppContent />
      </NewsProvider>
    </AuthProvider>
  );
}
