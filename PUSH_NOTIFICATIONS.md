# Push Notifications — Setup & Reference

Push notifications fire for new news posts and new polls. The app code and the
Supabase backend are wired and verified. **The one missing piece is Android
FCM (Firebase Cloud Messaging) configuration** — until that exists, devices
cannot obtain a push token, so nothing is stored and nothing is delivered.

---

## ⚠️ Current status / why push isn't working yet

- The `push_tokens` table is **empty** — no device has ever obtained a token.
- Root cause: **there is no Firebase/FCM setup** (no `google-services.json`,
  no `googleServicesFile` in `app.json`). On Expo SDK 54, Android push
  requires FCM v1. Without it, `getExpoPushTokenAsync()` throws before any
  token is produced.
- Second gotcha: **remote push does NOT work in Expo Go on SDK 54.** You must
  test on an installed EAS build (the APK), not Expo Go.

Everything below the "Android FCM setup" section already works; do that section
and rebuild, and push will start functioning.

---

## Android FCM setup (the required step)

You need a Firebase project (uses your Google account). ~15 minutes.

### 1. Create the Firebase project + Android app
1. Go to <https://console.firebase.google.com> → **Add project** (name e.g.
   "NK Celik"). Google Analytics is optional.
2. In the project, **Add app → Android**.
3. **Android package name:** `com.nkcelik.app` (must match `app.json`
   `android.package` exactly).
4. Register the app, then **download `google-services.json`**.

### 2. Add the file to the project
1. Put `google-services.json` in the project root
   (`nk-celik-mobile-app/google-services.json`).
2. Add this one line under `"android"` in `app.json`:
   ```json
   "android": {
     "googleServicesFile": "./google-services.json",
     "package": "com.nkcelik.app",
     ...
   }
   ```
   (Do NOT add this line before the file exists — EAS builds fail if it
   points at a missing file.)
3. `google-services.json` is safe to commit, but if you prefer not to, add it
   as an EAS file secret instead — ask and I'll wire that variant.

### 3. Give Expo permission to deliver to FCM (FCM v1 service account)
Expo's push service sends to your FCM project on your behalf, so it needs a
service-account key:
1. Firebase Console → ⚙ **Project settings → Service accounts**.
2. **Generate new private key** → downloads a JSON file.
3. Upload it to Expo, either:
   - `eas credentials` → **Android** → your build profile →
     **Push Notifications: Manage your FCM V1 service account key** → upload
     the JSON, **or**
   - Expo dashboard → project → **Credentials → Android → FCM V1**.

### 4. Rebuild
```bash
npm run build:android      # eas build --platform android --profile preview
```
Install the new APK on a physical device.

---

## iOS (when you build for iOS)

iOS uses APNs, not FCM. EAS can generate and manage the APNs key automatically
during `eas build --platform ios` if you sign in with an Apple Developer
account. `app.json` already declares `UIBackgroundModes: ["remote-notification"]`.
No Firebase needed for iOS.

---

## Testing checklist

1. **Physical device**, app installed from the **EAS build** (not Expo Go, not
   an emulator).
2. **Logged in as a member** (not guest) — token registration needs a member
   JWT so the server can resolve `auth.uid()`.
3. Accept the notification permission prompt.
4. Confirm a row appears:
   ```sql
   select member_id, platform, enabled, created_at from push_tokens order by created_at desc;
   ```
5. If empty, check the device logs for a `[push]` line — the code now logs the
   exact failure (FCM/token vs. Supabase save).

---

## How it works (code)

- `services/notifications.ts` → `registerForPushNotificationsAsync()`:
  checks device + permission, creates the Android channel, gets the Expo push
  token with the EAS `projectId`, then calls the `register_push_token` RPC.
- `contexts/AuthContext.tsx`: on login (and on launch for stored members) it
  ensures a valid JWT, then registers the token. Guests are not registered.
- Token identity is server-side: `register_push_token` (SECURITY DEFINER)
  stores `member_id = auth.uid()`; a device token moving between accounts is
  reassigned via `ON CONFLICT (token)`.

## Sending a notification

The `send-push-notification` function is **not** callable with the anon key
anymore. It requires the **service role** or an **admin member JWT**. Poll
creation already calls it with the admin's token automatically. To send
manually, use the service-role key:

```bash
curl -X POST https://<project>.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Nova vijest","body":"Čelik pobijedio 3-0!","type":"news","data":{"postId":123}}'
```

Per-type delivery honors each token's `news_enabled` / `polls_enabled` flags,
and dead tokens (uninstalled apps) are pruned automatically from the response.

## push_tokens schema

`id` (uuid) · `member_id` (**uuid**, FK members) · `token` (text, unique) ·
`platform` (ios/android/web) · `enabled` · `news_enabled` · `polls_enabled` ·
`created_at` · `updated_at`. RLS: a member sees/updates only their own rows;
insert/delete go through the SECURITY DEFINER RPCs.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| No token, `push_tokens` empty | FCM/google-services.json not configured (do the setup above); or testing in Expo Go |
| `[push] getExpoPushTokenAsync failed` in logs | Android FCM missing in the build |
| `[push] Failed to save push token` in logs | Not logged in as a member (no JWT), or network |
| Token saved but no delivery | FCM V1 service-account key not uploaded to Expo (step 3) |
| Works on Android, not iOS | APNs not set up — build iOS with an Apple account via EAS |
