# Building NK Čelik Mobile App

This guide explains how to build APK and IPA files for testing with friends.

## Version History

### VERSION 1.0.0 (Initial Release)
- News feed from WordPress
- Voting/polls system with admin panel
- Member authentication
- Shop tab with external link to WooCommerce store
- Settings and profile management

### VERSION 2.0.0
**Major Update: Embedded Store**
- Store now loads directly inside the app (WebView)
- No external browser needed
- Loading indicator for better UX
- Full shopping experience within the app
- All features from v1.0.0 maintained

### VERSION 2.1.0 (Current)
**Production hardening + notifications**
- Realtime chat publication + admin policy fix
- Per-category push notifications (news / polls) with master toggle
- Authenticated WordPress webhook (shared secret) + idempotent dedupe log
- Supabase cron-driven news poller as a redundant delivery path
- Bumped Android `versionCode` for Play Store updates
- Removed `eas-cli` from devDependencies; added `/android` and `/ios` to .gitignore
- Documented local production build (prebuild → gradlew bundleRelease)

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

3. **Configure Environment Variables (CRITICAL)**

   The app requires environment variables to work on real devices. You MUST set these before building. Values are kept in `eas.json` (and only there — never paste real secrets into docs).

   ```bash
   # Set Supabase credentials
   npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "<from eas.json>" --type string
   npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<from eas.json>" --type string

   # Set WooCommerce credentials (rotate the key/secret in WooCommerce → Settings → Advanced → REST API if they were ever leaked)
   npx eas-cli secret:create --scope project --name EXPO_PUBLIC_WC_CONSUMER_KEY --value "<from eas.json>" --type string
   npx eas-cli secret:create --scope project --name EXPO_PUBLIC_WC_CONSUMER_SECRET --value "<from eas.json>" --type string
   npx eas-cli secret:create --scope project --name EXPO_PUBLIC_WC_SITE_URL --value "https://nkcelik.ba" --type string
   ```

   **To verify secrets are set:**
   ```bash
   npx eas-cli secret:list
   ```

   **To update a secret:**
   ```bash
   npx eas-cli secret:delete --name EXPO_PUBLIC_WC_CONSUMER_KEY
   npx eas-cli secret:create --scope project --name EXPO_PUBLIC_WC_CONSUMER_KEY --value "new-value" --type string
   ```

## Local Production Build

You can produce a Play Store–ready Android Bundle (`.aab`) or an installable
APK directly on your machine without using EAS. The native `android/`
directory is generated on demand and is gitignored.

### Prerequisites

- Node.js + npm
- Java 17 (Android Gradle Plugin 8 requirement)
- Android SDK + platform-tools (Android Studio is the easiest install)
- Environment variables placed in `.env` (the same `EXPO_PUBLIC_*` keys used by
  EAS, listed above) so the app picks them up at build time

### Steps

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Generate the native Android project** (recreates `android/` cleanly)

   ```bash
   npx expo prebuild --platform android --clean
   ```

3. **Build a release Android App Bundle for the Play Store**

   ```bash
   cd android
   ./gradlew bundleRelease
   ```

   The bundle is written to:

   ```
   android/app/build/outputs/bundle/release/app-release.aab
   ```

   Upload that `.aab` file to the Google Play Console.

4. **(Optional) Build a sideloadable release APK**

   ```bash
   cd android
   ./gradlew assembleRelease
   ```

   The APK is written to:

   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

### Signing for the Play Store

Play Store uploads MUST be signed with a release keystore — the debug keystore
will be rejected. To sign:

1. Generate a keystore once (keep the `.jks` and passwords somewhere safe; if
   you lose them you cannot push updates to the same Play Store listing):

   ```bash
   keytool -genkeypair -v -keystore nk-celik-release.jks \
     -alias nk-celik -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Place the keystore at `android/app/nk-celik-release.jks` (gitignored — never
   commit it) and create `android/gradle.properties` (or `~/.gradle/gradle.properties`)
   with:

   ```
   NK_CELIK_UPLOAD_STORE_FILE=nk-celik-release.jks
   NK_CELIK_UPLOAD_KEY_ALIAS=nk-celik
   NK_CELIK_UPLOAD_STORE_PASSWORD=...
   NK_CELIK_UPLOAD_KEY_PASSWORD=...
   ```

3. Wire the `signingConfigs.release` block in `android/app/build.gradle` to
   read those properties, then re-run `./gradlew bundleRelease`.

4. Enrolling in **Play App Signing** is recommended — Google holds the final
   signing key and you only manage the upload key.

## Building APK (Android) via EAS

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

### Shop Not Working on Real Devices

If the shop shows "Prodavnica nije pravilno konfigurirana" or products don't load:

1. **Check if environment variables are set:**
   ```bash
   npx eas-cli secret:list
   ```
   You should see all 5 environment variables listed.

2. **Set missing variables:**
   Follow the environment variable setup instructions above.

3. **Rebuild the app:**
   After setting/updating environment variables, you MUST rebuild:
   ```bash
   npm run build:android
   ```

4. **Test in development:**
   Environment variables from `.env` work automatically in development:
   ```bash
   npm run dev
   ```

### Build Failed
- Check build logs on Expo dashboard
- Verify all dependencies are compatible
- Ensure app.json is properly configured
- Verify environment variables are set correctly

### Can't Install APK
- Enable "Install from Unknown Sources"
- Check Android version compatibility
- Verify APK downloaded completely

### iOS Build Issues
- Verify Apple Developer account is active
- Check bundle identifier is unique
- Ensure certificates are valid

### Authentication Issues
- Verify Supabase URL and anon key are correct
- Check database migrations have been applied
- Ensure RLS policies are properly configured

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
