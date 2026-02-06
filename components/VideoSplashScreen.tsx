import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

interface VideoSplashScreenProps {
  onComplete: () => void;
}

export default function VideoSplashScreen({ onComplete }: VideoSplashScreenProps) {
  const video = useRef<Video>(null);
  const [nativeSplashHidden, setNativeSplashHidden] = useState(false);

  useEffect(() => {
    const hideNativeSplash = async () => {
      try {
        await SplashScreen.hideAsync();
        setNativeSplashHidden(true);
        console.log('[VideoSplash] Native splash hidden');

        if (video.current) {
          await video.current.playAsync();
          console.log('[VideoSplash] Video started playing');
        }
      } catch (error) {
        console.error('[VideoSplash] Error:', error);
      }
    };

    const timer = setTimeout(() => {
      hideNativeSplash();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const completeTimer = setTimeout(() => {
      console.log('[VideoSplash] Auto-completing after 5 seconds');
      onComplete();
    }, 5000);

    return () => clearTimeout(completeTimer);
  }, [onComplete]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded && status.isPlaying) {
      console.log('[VideoSplash] Video is playing');
    }
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
        isMuted={true}
        volume={0}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        useNativeControls={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
});
