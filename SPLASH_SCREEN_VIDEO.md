# Video Splash Screen Implementation

## Current Limitation

Expo's built-in splash screen system only supports static images (PNG, JPG). It does not support video (MP4) files for the native splash screen.

## Solutions

### Option 1: Custom Video Splash Screen (Recommended)

Implement a custom splash screen that shows after the native splash screen:

1. Keep the current static splash screen (logo badge)
2. Add a video splash screen component that plays when app launches
3. Transition to main app after video completes

**Implementation Steps:**

1. Place your video in `assets/splash-video.mp4`

2. Install required package:
```bash
npm install expo-av
```

3. Create a custom splash screen component:
```typescript
// components/VideoSplashScreen.tsx
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

export function VideoSplashScreen({ onComplete }: { onComplete: () => void }) {
  return (
    <View style={styles.container}>
      <Video
        source={require('@/assets/splash-video.mp4')}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        isLooping={false}
        onPlaybackStatusUpdate={(status) => {
          if (status.isLoaded && status.didJustFinish) {
            onComplete();
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
```

4. Update `app/_layout.tsx` to show video splash:
```typescript
import { useState, useEffect } from 'react';
import { VideoSplashScreen } from '@/components/VideoSplashScreen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

export default function RootLayout() {
  const [showVideoSplash, setShowVideoSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useFrameworkReady();

  useEffect(() => {
    // Preload resources
    setTimeout(() => setAppReady(true), 100);
  }, []);

  if (!appReady || showVideoSplash) {
    return (
      <VideoSplashScreen
        onComplete={() => setShowVideoSplash(false)}
      />
    );
  }

  return (
    // Your normal app layout
  );
}
```

### Option 2: Animated Splash Screen

Convert the video to an animated sequence:

1. Extract key frames from video as images
2. Create an animated sequence using `react-native-reanimated`
3. Display animation on app launch

### Option 3: Lottie Animation

1. Convert video to Lottie JSON animation
2. Use `lottie-react-native` package
3. Display Lottie animation as custom splash

**Example:**
```bash
npm install lottie-react-native
```

```typescript
import LottieView from 'lottie-react-native';

<LottieView
  source={require('./splash-animation.json')}
  autoPlay
  loop={false}
  onAnimationFinish={onComplete}
/>
```

## Recommended Approach

For the best user experience, I recommend **Option 1 (Custom Video Splash Screen)** because:

- ✅ Uses your actual video file
- ✅ Simple to implement
- ✅ Good performance
- ✅ Smooth transition to app
- ✅ Works on iOS and Android

## Implementation Checklist

- [ ] Add video file to `assets/` folder
- [ ] Install `expo-av` package
- [ ] Create VideoSplashScreen component
- [ ] Update app/_layout.tsx
- [ ] Test on iOS and Android devices
- [ ] Optimize video file size (recommend < 5MB)
- [ ] Add skip button (optional)

## Video Optimization Tips

To ensure fast loading:

1. **Compress video**: Use a tool like Handbrake
   - Target size: < 5MB
   - Resolution: 1080p or 720p
   - Format: MP4 (H.264)
   - Duration: 2-4 seconds recommended

2. **Reduce framerate**: 24 or 30 fps is sufficient

3. **Consider file size**: Larger videos increase app bundle size

## Alternative: Keep Static Splash + Quick Animation

If video file is large, consider:
- Static splash screen (instant)
- Quick fade-in animation (< 1 second)
- Smooth transition to app

This provides fast perceived performance while maintaining visual appeal.

## Notes

- Video splash screens increase app bundle size
- Longer videos delay app startup
- Consider user experience - shorter is better
- Always provide a way to skip the video (optional)
- Test on slower devices to ensure good performance
