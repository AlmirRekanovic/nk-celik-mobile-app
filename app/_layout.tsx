import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { registerBackgroundFetch } from '@/services/backgroundFetch';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { NewsProvider, useNews } from '@/contexts/NewsContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import LoadingScreen from '@/components/LoadingScreen';

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { loading: authLoading } = useAuth();
  const { initialized: newsInitialized } = useNews();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    registerBackgroundFetch();
  }, []);

  useEffect(() => {
    const isReady = !authLoading && newsInitialized;

    if (isReady && !appReady) {
      setAppReady(true);
      SplashScreen.hideAsync().catch(err => {
        console.error('Error hiding splash screen:', err);
      });
    }
  }, [authLoading, newsInitialized, appReady]);

  useEffect(() => {
    const forceHideTimer = setTimeout(() => {
      if (!appReady) {
        console.warn('[AppContent] Forcing app ready after timeout');
        setAppReady(true);
        SplashScreen.hideAsync().catch(err => {
          console.error('Error hiding splash screen:', err);
        });
      }
    }, 5000);

    return () => clearTimeout(forceHideTimer);
  }, [appReady]);

  if (!appReady) {
    return null;
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
    <ThemeProvider>
      <AuthProvider>
        <NewsProvider>
          <AppContent />
        </NewsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
