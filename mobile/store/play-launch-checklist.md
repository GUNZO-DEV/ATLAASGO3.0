# AtlaasGo Android → Google Play: launch checklist

Run everything from `mobile/`. ✅ = already done in the repo. ⬜ = **you** do it.

---

## 0. Pre-flight (one-time)
- ✅ EAS configured: `eas.json` has a `production` profile (`autoIncrement`, remote versionCode).
- ✅ Package `com.atlaasgo.app`, version `3.0.0`, icon/adaptive-icon/splash present.
- ✅ Privacy policy live: https://atlaasgo.com/privacy.html
- ✅ In-app account deletion (Account → Delete account) — a Play requirement.
- ⬜ **Log in to EAS:** `eas whoami` (else `eas login`). Account/owner = `atlaasgo`.
- ✅ **`google-services.json` is committed** (`mobile/google-services.json`), so EAS prebuild has the FCM file (`app.config.ts` defaults to `./google-services.json`). Nothing to do — unless you'd rather keep it out of git, in which case upload it as a secret: `eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json`.
- ⬜ **Confirm the Android keystore exists** (EAS-managed): `eas credentials -p android` → "Keystore: Set up". If not, EAS generates one on first build — let it.

## 1. Build the production AAB  ⬜
```bash
eas build -p android --profile production
```
- Produces an **.aab** signed with the EAS upload key. Wait for the green build (~10–20 min), then download it (or use `eas submit`).
- This is the step that proves the native build compiles clean — **do this first; everything else depends on a good AAB.**

## 2. Create the app in Play Console  ⬜
- play.google.com/console → **Create app** → name `AtlaasGo: Ifrane Delivery`, App, Free, Morocco + worldwide.
- Accept the developer program policies + US export laws.

## 3. Fill the store listing + content  ⬜
- **Main store listing:** paste from `store/play-store-listing.md` (name, short + full description, contact, privacy URL).
- **Graphics:** upload the 512×512 icon, the **1024×500 feature graphic** (still to design), and the phone screenshots from `store/screenshots/`.
- **App content (left nav → Policy):** complete every card — they're all in `play-store-listing.md`:
  - Privacy policy URL · Data safety · Ads (No) · Content rating (IARC) · Target audience (18+) · Government apps (No) · Financial features (No) · App access (test login) · **Location permission declaration** (foreground-only, delivery).

## 4. Testing track FIRST  ⬜  *(do not go straight to Production)*
- Upload the AAB to **Testing → Internal testing**, add yourself + a few testers, install via the opt-in link, smoke-test a real order end-to-end (live Stripe — use a real card or Stripe test mode).
- **If your developer account is a personal account created after ~Nov 2023:** Google requires a **Closed test with ≥12 testers opted-in for 14 continuous days** before you can apply for Production. Start this clock now — it's usually the longest pole. (Organisation accounts are exempt.)

## 5. Submit / release to Production  ⬜
- Either upload the AAB to the **Production** track manually, or:
  ```bash
  eas submit -p android --profile production
  ```
  (For `eas submit` you must first add a Google **service-account JSON** with "Release manager" access — Console → Setup → API access — and reference it in `eas.json`'s `submit.production.android.serviceAccountKeyPath`.)
- Set rollout % (start at 20–100%), review the release, **Send for review**. First review typically 1–7 days.

## 6. Payments — confirm before real orders  ⬜
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` is **live** (`pk_live_…`). Confirm the Stripe account is **fully activated for payouts in Morocco** and the `create-payment-intent` / `stripe-webhook` edge functions use the matching live secret key.

---

## What's blocking, in order
1. ⬜ `eas build -p android --profile production` → a green AAB  *(nothing else can proceed without it)*
2. ⬜ Feature graphic (1024×500) + 512×512 icon export
3. ⬜ Play Console: listing + all App-content forms (copy ready)
4. ⬜ Internal/closed testing (+ the 14-day closed-test gate if personal account)
5. ⬜ Stripe live-payout confirmation
6. ⬜ Submit to Production → review

Everything in `store/play-store-listing.md` and `store/screenshots/` is prepared so steps 3 is copy-paste.
