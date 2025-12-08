# Building NK Čelik Mobile App

This guide explains how to build APK and IPA files for testing with friends.

## Prerequisites

1. **Expo Account** (Free)
   - Create account at: https://expo.dev/signup
   - You'll need this for EAS Build

2. **For iOS builds only:**
   - Apple Developer Account ($99/year)
   - Required for IPA files

## Setup

1. **Login to EAS**
   ```bash
   npx eas-cli login
   ```

2. **Configure your project**
   ```bash
   npx eas-cli build:configure
   ```

## Building APK (Android)

### Quick Testing Build
```bash
npm run build:android
```

This will:
- Build an APK file (not AAB for Play Store)
- Can be installed directly on Android devices
- Takes about 10-15 minutes
- Build happens on Expo's servers (no local setup needed)

### What happens:
1. EAS uploads your code to their servers
2. They build the APK
3. You get a download link
4. Share the APK with friends to install

### Installing APK on Android:
1. Download the APK from the link EAS provides
2. Transfer to Android phone (AirDrop, email, etc.)
3. Enable "Install from Unknown Sources" in Android settings
4. Tap the APK file to install

## Building IPA (iOS)

**Note:** Requires Apple Developer Account ($99/year)

```bash
npm run build:ios
```

### iOS Testing Options:

#### Option 1: TestFlight (Recommended)
1. Build with production profile: `eas build --platform ios --profile production`
2. Submit to App Store Connect: `eas submit --platform ios`
3. Invite testers via TestFlight
4. They install from TestFlight app

#### Option 2: Ad Hoc Distribution
1. Collect friend's device UDIDs
2. Add UDIDs to Apple Developer Portal
3. Build with ad-hoc profile
4. Distribute IPA file

## Building Both Platforms

```bash
npm run build:all
```

This builds Android APK and iOS IPA simultaneously.

## Build Profiles

Configured in `eas.json`:

- **preview**: For testing (APK format, internal distribution)
- **production**: For App Store/Play Store submission
- **development**: For development builds with debugging

## Checking Build Status

1. Visit: https://expo.dev/accounts/YOUR_ACCOUNT/projects/nk-celik/builds
2. Or run: `npx eas-cli build:list`

## Troubleshooting

### Build Failed
- Check build logs on Expo dashboard
- Verify all dependencies are compatible
- Ensure app.json is properly configured

### Can't Install APK
- Enable "Install from Unknown Sources"
- Check Android version compatibility
- Verify APK downloaded completely

### iOS Build Issues
- Verify Apple Developer account is active
- Check bundle identifier is unique
- Ensure certificates are valid

## Quick Testing Alternative: Expo Go

For fastest testing without building:

1. Friends install "Expo Go" from App Store or Google Play
2. You run: `npm run dev`
3. Share the QR code or link
4. They scan/open in Expo Go app

**Limitations:** Some native features may not work in Expo Go

## Cost Summary

- **Android (APK)**: Free (using EAS Build free tier)
- **iOS (IPA)**: $99/year Apple Developer account
- **EAS Build**: Free tier includes limited builds/month

## Support

- EAS Build Docs: https://docs.expo.dev/build/introduction/
- Expo Forums: https://forums.expo.dev/
- Issues: Check build logs on Expo dashboard
