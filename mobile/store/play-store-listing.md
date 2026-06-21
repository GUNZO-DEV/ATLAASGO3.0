# AtlaasGo — Google Play Console listing (copy/paste)

Everything below maps to a field in **Play Console → your app → Grow → Store presence → Main store listing**, plus the **App content** (Policy) forms. Paste as-is.

---

## App details
- **App name** (max 30): `AtlaasGo: Ifrane Delivery`
- **Short description** (max 80): `Food, grocery & pharmacy delivered to your exact landmark in Ifrane.`
- **Package name:** `com.atlaasgo.app`
- **Default language:** English (United States) — `en-US`  (add `fr-FR` / `ar` later if you localise)
- **App / Game:** App
- **Free / Paid:** Free
- **Category:** Food & Drink
- **Tags:** Food delivery, Grocery, Shopping
- **Contact email:** support@atlaasgo.com
- **Website:** https://atlaasgo.com
- **Phone:** (optional)
- **Privacy policy:** https://atlaasgo.com/privacy.html  *(verified live — HTTP 200)*

## Full description (max 4000)
```
AtlaasGo is the fastest way to get food, groceries, and pharmacy essentials delivered across Ifrane.

Order from local restaurants and shops, drop a precise landmark so your rider finds you every time, and follow your delivery live from kitchen to doorstep.

WHY ATLAASGO
• Three ways in — Food, Pharmacy, and Groceries, all in one app
• Local-first — built for Ifrane, with the spots you actually use
• Live tracking — watch your order move through each stage in real time
• Landmark delivery — add the local landmark your rider will recognise
• Wallet — top up once and check out in a tap
• Prime — an optional membership for free delivery
• Favourites & re-order — your go-to meals, one tap away

HOW IT WORKS
1. Pick Food, Pharmacy, or Groceries
2. Build your order and set your delivery landmark
3. Pay securely and track your rider to the door

Have feedback? We're local and we're listening — support@atlaasgo.com.
```

---

## Graphic assets (REQUIRED — Play won't publish without these)
| Asset | Spec | Status |
|---|---|---|
| **App icon** | 512×512 PNG, 32-bit | Derive from `assets/icon.png` (export at 512×512) |
| **Feature graphic** | 1024×500 PNG/JPG, no alpha | **TO CREATE** (emerald/sunset brand, "AtlaasGo — Ifrane delivery") |
| **Phone screenshots** | 2–8, PNG/JPG, 16:9 or 9:16, 320–3840 px | See `store/screenshots/` (captured from device) |
| 7" + 10" tablet shots | optional | skip (phone-only app) |

---

## App content (Policy) — answers to the Console forms

### Data safety
- **Does your app collect or share user data?** Yes (collect; **no sharing** with third parties for their own use).
- **Is all data encrypted in transit?** Yes.
- **Do you provide a way to request data deletion?** Yes — in-app: **Account → Delete account** (calls the `delete-account` edge function), plus support@atlaasgo.com.

Data types collected (all: *collected*, *linked to the user*, *not shared*, *not used for tracking*; purpose = **App functionality** unless noted):
| Category → type | Purpose | Notes |
|---|---|---|
| **Location → Approximate + Precise location** | App functionality | Delivery to the user's landmark. Foreground only. |
| **Personal info → Name, Email, Phone number** | App functionality | Account + rider contact |
| **Financial info → Purchase history** | App functionality | Order history. **Card data is collected by Stripe, not stored by AtlaasGo.** |
| **Messages → Other in-app messages** | App functionality | Delivery notes / order chat |
| **App activity → App interactions** | Analytics, App functionality | |
| **App info & performance → Crash logs, Diagnostics** | App functionality | |
| **Device or other IDs** | App functionality | User ID |

### Government apps / Financial features
- Not a government app. Not a finance/lending app (wallet = prepaid credit for deliveries only).

### Ads
- **Does your app contain ads?** No.

### Content rating (IARC questionnaire)
- Category: **Utility / Productivity / Communication / Other** → "Food delivery".
- Violence / sexual / profanity / drugs / gambling: **No** to all.
- User-generated content shared publicly: **No** (delivery notes + order chat are private 1:1 with the rider/support).
- Expected result: **Everyone / PEGI 3**.

### Target audience and content
- **Target age group:** 18 and over (handles payments). *(13+ is acceptable if you prefer, but 18+ avoids the "designed for families" obligations.)*
- **Appeals to children?** No.

### App access (for the reviewer)
- The app is **browsable signed-out**, but ordering needs sign-in. Provide a working test login in **App access → All functionality → instructions**:
  - Email: `__________`   Password: `__________`  ← create a real test account.
  - Sign-in is email + password (Clerk). No social login required.

### Permissions declaration
- **Location (ACCESS_FINE_LOCATION / ACCESS_COARSE_LOCATION):** used **in foreground only**, to set the delivery point and show live rider tracking. **No background location.** Prominent disclosure is shown before the OS prompt (the checkout asks before capturing GPS).
- No other sensitive/restricted permissions (no SMS, no Call Log, no All-files access, no `QUERY_ALL_PACKAGES`).
```
```
