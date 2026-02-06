import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as SplashScreen from 'expo-splash-screen';

interface VideoSplashScreenProps {
  onComplete: () => void;
}

export default function VideoSplashScreen({ onComplete }: VideoSplashScreenProps) {
  const video = useRef<Video>(null);
  const [hasError, setHasError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [debugInfo, setDebugInfo] = useState('Initializing...');

  useEffect(() => {
    SplashScreen.hideAsync();
    console.log('[VideoSplash] Component mounted - video will loop until app ready');
    setDebugInfo('Loading app...');
  }, []);

  useEffect(() => {
    if (hasError) {
      console.log('[VideoSplash] Error detected - showing fallback');
      setDebugInfo('Video error - waiting for app...');
    }
  }, [hasError]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      if (!videoLoaded) {
        console.log('[VideoSplash] Video loaded and looping');
        setVideoLoaded(true);
        setDebugInfo('Video looping - loading app...');
      }
    }
  };

  const handleError = (error: string) => {
    console.error('[VideoSplash] Video error:', error);
    setDebugInfo(`Error: ${error}`);
    setHasError(true);
  };

  const handleLoad = async () => {
    console.log('[VideoSplash] Video onLoad triggered');
    setDebugInfo('Video loaded, starting loop...');

    try {
      if (video.current) {
        await video.current.setStatusAsync({
          shouldPlay: true,
          isLooping: true,
          isMuted: false,
          volume: 1.0,
        });
        console.log('[VideoSplash] Video looping started');
      }
    } catch (error: any) {
      console.error('[VideoSplash] Play error:', error);
      setDebugInfo(`Play error: ${error.message}`);
      setHasError(true);
    }
  };

  const handleReadyForDisplay = () => {
    console.log('[VideoSplash] Video ready for display');
    setDebugInfo('Video ready for display');
  };

  return (
    <View style={styles.container}>
      <Video
        ref={video}
        style={styles.video}
        source={require('../assets/splash-video.mp4')}
        resizeMode={ResizeMode.COVER}
        shouldPlay={true}
        isLooping={true}
        isMuted={false}
        volume={1.0}
        rate={1.0}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onError={handleError}
        onLoad={handleLoad}
        onReadyForDisplay={handleReadyForDisplay}
        useNativeControls={false}
        posterSource={require('../assets/celik.fix.badge.png')}
        posterStyle={styles.poster}
        usePoster={true}
      />
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>Platform: {Platform.OS}</Text>
        <Text style={styles.debugText}>Status: {debugInfo}</Text>
        <Text style={styles.debugText}>Loaded: {videoLoaded ? 'Yes' : 'No'}</Text>
        <Text style={styles.debugText}>Error: {hasError ? 'Yes' : 'No'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  poster: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  debugContainer: {
    position: 'absolute',
    bottom: 50,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8,
    zIndex: 1000,
  },
  debugText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
    fontWeight: 'bold',
  },
});
