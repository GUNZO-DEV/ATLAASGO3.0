# Push notifications & home-screen widget — activation

Both are **native** features. The code/config is in place; they turn on after a
native rebuild (`npx expo run:ios` or an EAS build). They cannot run on the
current dev client or in Expo Go.

---

## Push notifications

**What's wired**
- `expo-notifications` + `expo-device` installed; `expo-notifications` plugin in `app.json`.
- `mobile/lib/push.ts` — requests permission, gets the Expo push token, saves it to `push_tokens`.
- `mobile/components/PushRegistrar.tsx` — mounted in `app/_layout.tsx`; registers on sign-in and routes to the order/notifications screen when a push is tapped.
- Edge function **`send-push`** — sends an Expo push to a user's devices.
- DB trigger **`trg_notification_push`** on `notifications` insert → calls `send-push`. Reuses the existing `notify_order_participant` flow, so order updates push automatically.

**To activate**
1. Rebuild the app so the native module is included:
   ```bash
   cd mobile && npx expo run:ios     # or: eas build -p ios
   ```
2. Run on a **physical device** (push tokens aren't issued on the simulator). Sign in → accept the permission prompt → a token lands in `push_tokens`.
3. **Background delivery** needs two one-time things:
   - An **APNs key** — EAS sets this up during the first iOS build using your Apple Developer account.
   - Enable the auto-push trigger by storing your **service-role key** in Vault (Supabase → Project Settings → API → `service_role` secret):
     ```sql
     select vault.create_secret('<YOUR_SERVICE_ROLE_KEY>', 'service_role_key');
     ```
     Until you do this, in-app notifications still work; only background push is paused. (The trigger no-ops safely without it.)

**Test:** insert a row into `notifications` for your user, or call `send-push` with `Authorization: Bearer <service_role_key>` and `{ "userId": "...", "title": "Test", "body": "Hi" }`.

---

## Home-screen widget (iOS WidgetKit)

**What's wired**
- `@bacons/apple-targets` installed + added to `app.json` plugins.
- `mobile/targets/widget/` — `expo-target.config.js` (declares the widget target) and `index.swift` (the SwiftUI widget: coral gradient, "AtlaasGo", deep-links into the app via `atlaasgo://`). Small + medium sizes.

**To build**
1. You need your **Apple Team ID** (from the Apple Developer account).
2. Generate the native project + build:
   ```bash
   cd mobile && npx expo prebuild -p ios
   eas build -p ios            # or open ios/ in Xcode and run
   ```
3. Install on a device, long-press the home screen → **+** → search **AtlaasGo** → add the widget. Tapping it opens the app.

**Note:** widgets can't be previewed in Expo Go or the JS dev client — they only appear in a full native build. The current widget is a brand/quick-launch tile; live order status on the widget can be added later via an App Group.
