# Video Splash Screen Setup

Your app now has a **video splash screen** that plays automatically when the app launches!

## 📁 Where to Place Your Video

1. Export this project to your local machine
2. Place your video file in the **assets** folder
3. **Rename it to:** `splash.mp4`

```
your-project/
├── assets/
│   ├── splash.mp4  ← Your video goes here!
│   └── celik.fix.badge.png
├── app/
├── components/
└── ...
```

## ✅ Requirements

- **Format:** MP4 (recommended)
- **Name:** Must be exactly `splash.mp4`
- **Location:** `/assets/splash.mp4`
- **Duration:** Keep it short (3-5 seconds recommended for best UX)
- **Resolution:** Match your target device resolution (1080x1920 for mobile portrait)

## 🎬 How It Works

1. App launches
2. Video plays automatically (fullscreen, no controls)
3. When video ends, app continues to main content
4. If video fails to load, app continues immediately (graceful fallback)

## 🔧 Customization

If you need to change the video location or name, edit:

**File:** `components/VideoSplashScreen.tsx`

```typescript
source={require('../assets/splash.mp4')}
// Change to your path, e.g.:
// source={require('../assets/videos/intro.mp4')}
```

## 📱 Testing

1. Add your `splash.mp4` to the assets folder
2. Run: `npm run dev`
3. The video should play on app launch

## 🚀 Building for Production

When building with EAS:
- The video will be bundled with your app
- No internet connection needed
- Instant playback
- Consistent experience for all users

## 💡 Tips

- **Keep it short:** Users want to get to your app quickly
- **Optimize file size:** Compress your video to reduce app size
- **Test on device:** Always test on actual devices, not just simulator
- **Consider branding:** Use this for your logo animation or brand intro
