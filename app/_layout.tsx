import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { registerBackgroundFetch } from '@/services/backgroundFetch';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { NewsProvider, useNews } from '@/contexts/NewsContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import LoadingScreen from '@/components/LoadingScreen';
import VideoSplashScreen from '@/components/VideoSplashScreen';

function AppContent() {
  const { loading: authLoading } = useAuth();
  const { initialized: newsInitialized } = useNews();
  const [forceReady, setForceReady] = useState(false);

  useEffect(() => {
    console.log('[AppContent] Auth loading:', authLoading, 'News initialized:', newsInitialized);
  }, [authLoading, newsInitialized]);

  useEffect(() => {
    registerBackgroundFetch();

    const timeout = setTimeout(() => {
      console.warn('[AppContent] App initialization timeout - forcing ready state');
      setForceReady(true);
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  const isReady = forceReady || (!authLoading && newsInitialized);

  console.log('[AppContent] Render - isReady:', isReady, 'authLoading:', authLoading, 'newsInitialized:', newsInitialized, 'forceReady:', forceReady);

  if (!isReady) {
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
  const [showVideoSplash, setShowVideoSplash] = useState(true);

  useEffect(() => {
    const splashTimer = setTimeout(() => {
      console.log('[RootLayout] Hiding video splash after 5 seconds');
      setShowVideoSplash(false);
    }, 5000);

    return () => clearTimeout(splashTimer);
  }, []);

  const handleVideoComplete = () => {
    setShowVideoSplash(false);
  };

  if (showVideoSplash) {
    return <VideoSplashScreen onComplete={handleVideoComplete} />;
  }

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
