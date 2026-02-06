# Splash Screen Video - Fix Applied

## What Was Fixed

### 1. Video File Renamed
- **Old name**: `splash.mp4.mp4` (double extension causing potential issues)
- **New name**: `splash-video.mp4` (clean, standard naming)

### 2. Enhanced Video Component
Added comprehensive debugging and error handling:

**New Features:**
- **Timeout Protection**: 5-second timeout ensures app won't get stuck if video fails
- **Better Error Handling**: Gracefully falls back if video can't play
- **Debug Information**: Shows real-time status during development
- **Multiple Event Handlers**: Tracks loading, playing, and completion states
- **Console Logging**: Detailed logs for troubleshooting

### 3. Debug Mode (Development Only)
When running in development mode, you'll see an overlay showing:
- Platform (web/ios/android)
- Current status
- Whether video is loaded
- Whether there are errors

## Testing the Splash Screen

### Web Testing
1. Clear your browser cache
2. Refresh the page
3. You should see:
   - Black screen appears
   - Video starts playing automatically
   - After video ends, app loads normally
   - OR after 5 seconds if video doesn't load, app loads anyway

### Debug Information
If you're in development mode, check the browser console for logs:
```
[VideoSplash] Video onLoad triggered
[VideoSplash] Video loaded successfully
[VideoSplash] Video ready for display
[VideoSplash] Video finished - completing splash
```

## Common Issues & Solutions

### Issue: Video doesn't play on web
**Why**: Some browsers require user interaction before playing video
**Solution**: The timeout will automatically skip to the app after 5 seconds

### Issue: Video plays but audio doesn't work
**Why**: Web browsers often block autoplay with audio
**Solution**: Video is configured with `isMuted={false}`, but browser might override

### Issue: Video loads slowly
**Why**: 8.26 MB video file takes time to download
**Solution**: Consider compressing the video or using a shorter version

### Issue: Still seeing the old splash screen
**Why**: Browser cache or cached assets
**Solution**: 
1. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Try incognito/private window

## Video Specifications
- **Format**: MP4 (H.264)
- **Size**: 8.26 MB
- **Location**: `/assets/splash-video.mp4`
- **Playback**: Auto-start, non-looping, covers screen

## For Production Builds

### Optimizing Video Size
If the video is too large, consider:

1. **Compress the video**:
   ```bash
   ffmpeg -i splash-video.mp4 -vcodec h264 -crf 28 splash-video-compressed.mp4
   ```

2. **Reduce resolution**: If your video is 1080p, consider 720p
3. **Shorten duration**: Splash screens work best at 2-3 seconds

### Testing on Different Platforms

**Web**: 
- Test in Chrome, Firefox, Safari
- Check both desktop and mobile browsers

**iOS**: 
- Build with `npm run build:ios`
- Test on actual device via TestFlight

**Android**: 
- Build with `npm run build:android`
- Test on actual device via internal testing

## Alternative: Static Splash Screen

If video continues to cause issues, you can easily switch back to a static image splash:

1. In `app/_layout.tsx`, comment out VideoSplashScreen
2. Use the standard Expo splash configuration in `app.json`
3. The icon splash will appear instead

## Technical Details

### Video Component Configuration
```typescript
<Video
  source={require('../assets/splash-video.mp4')}
  resizeMode={ResizeMode.COVER}      // Fills screen
  shouldPlay                         // Auto-play
  isLooping={false}                  // Play once
  isMuted={false}                    // Audio enabled
  useNativeControls={false}          // No controls
/>
```

### Timeout Logic
- 5 seconds maximum wait time
- Prevents app from hanging
- Clears timeout when video completes
- Logs timeout event for debugging

---

**Last Updated**: February 6, 2026
