import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as SplashScreen from 'expo-splash-screen';

interface VideoSplashScreenProps {
  onComplete: () => void;
}

export default function VideoSplashScreen({ onComplete }: VideoSplashScreenProps) {
  const video = useRef<Video>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (hasError) {
      onComplete();
    }
  }, [hasError, onComplete]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded && status.didJustFinish) {
      onComplete();
    }
  };

  const handleError = () => {
    setHasError(true);
  };

  const handleLoad = () => {
    video.current?.playAsync();
  };

  return (
    <View style={styles.container}>
      <Video
        ref={video}
        style={styles.video}
        source={require('../assets/splash.mp4.mp4')}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping={false}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onError={handleError}
        onLoad={handleLoad}
      />
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
});
