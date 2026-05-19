# AtlaasGo dev backend — ⏸ PAUSED

> **Status:** Superseded by Supabase for the web prototype (see
> [`../supabase/README.md`](../supabase/README.md)). This Firebase emulator
> setup is preserved because the paused [`mobile/`](../mobile/README.md) app
> targets Firestore. If/when the mobile track resumes, either port the mobile
> app to Supabase, or revive this emulator.

Firebase Emulator Suite (Firestore) for local development. No real Firebase
project, no auth, no billing — just `localhost:8080` for Firestore and `:4000`
for the emulator UI.

## Prereqs

- **Node 18+** and **npm**
- **Java 17+** (the Firestore emulator is a Java process). `java -version` to check.
- The first `npm run emulators` downloads the emulator jar (~50 MB) into `~/.cache/firebase/emulators/` once.

## Daily workflow

`npm run emulators` / `npm run seed` are wired as proxy scripts in the
worktree root and `mobile/` package.json as well, so this works from
**any directory** in the repo:

```bash
npm run emulators          # starts Firestore on :8080, UI on http://localhost:4000
# in another terminal
npm run seed               # populates categories, partners, demo orders
```

First-time setup only requires installing the backend deps once:

```bash
cd backend && npm install && cd -
```

The mobile app picks this up automatically: in `__DEV__` it defaults to the
emulator unless `EXPO_PUBLIC_FIREBASE_PROJECT_ID` is set. No `.env` file needed
for the local-dev case.

## One-shot (CI-friendly)

```bash
npm run reset      # boots emulator, runs seed, tears down
```

## Scripts

| Script              | Purpose                                                                                       |
|---------------------|-----------------------------------------------------------------------------------------------|
| `npm run emulators` | Start Firestore on `:8080` and the UI on `:4000`                                              |
| `npm run seed`      | Idempotently populate categories, partners, and demo orders                                   |
| `npm run advance`   | Walk `orders/demo-active` through all 5 stages with read-back asserts (smoke test)            |
| `npm run rules:check` | Verify the landmark contract: empty landmark must be rejected, valid one must be accepted    |
| `npm run reset`     | One-shot: emulator + seed + tear down                                                         |

## What gets seeded

| Collection      | Count | Notes |
|-----------------|-------|-------|
| `categories`    | 3     | food / pharmacy / groceries, with gradients & partner counts |
| `partners`      | 12    | 4 per category, with rating + ETA |
| `orders`        | 2     | `demo-active` (outForDelivery), `demo-recent` (preparing) |

The demo orders include a real GeoPoint near AUI Ifrane (33.5350, -5.1106) and a
landmark mirrored into `driverPayload.headerLandmark`, so the mobile order
screen renders the driver-header strip the moment the app boots.

## Files

```
backend/
├── package.json           firebase, tsx, firebase-tools
├── seed.ts                idempotent seed (setDoc with fixed IDs — safe to re-run)
├── tsconfig.json
└── README.md

../firebase.json           emulator + rules + indexes pointers
../.firebaserc             project: demo-atlaasgo (special "demo-" prefix = no auth)
../firestore.rules         dev rules: permissive, but enforces landmark length on order creates
../firestore.indexes.json  empty placeholder
```

## Connecting from the mobile app

`mobile/firebaseConfig.ts` auto-resolves the emulator host:
- iOS simulator → `127.0.0.1`
- Android emulator → `10.0.2.2`
- Physical device → LAN IP (from `Constants.expoConfig.hostUri`)
- Override with `EXPO_PUBLIC_EMULATOR_HOST` env var if your network is unusual

## Connecting from a Node script

```ts
import { connectFirestoreEmulator, getFirestore, initializeApp } from 'firebase/firestore';
const app = initializeApp({ projectId: 'demo-atlaasgo' });
const db = getFirestore(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);
```

## Rules

`firestore.rules` enforces the landmark contract on order creation:

```
allow create: if request.resource.data.landmark is string
              && request.resource.data.landmark.size() >= 3
              && request.resource.data.coords.lat is number
              && request.resource.data.coords.lng is number
              && request.resource.data.driverPayload.headerLandmark is string
              && request.resource.data.driverPayload.headerLandmark.size() >= 3;
```

`npm run rules:check` proves this contract is actually loaded — it tries an
empty-landmark write (must fail) and a valid one (must succeed). Run this
after touching `firestore.rules` and after restarting the emulator, since rules
are read once at startup.

**Pitfall to avoid:** never add a wildcard `match /{document=**} { allow read,
write: if true; }` at the bottom of the rules file as a catch-all. Firestore
takes the UNION of all matching rules — a wildcard `allow write` would override
the specific landmark validation silently, with no warning. The earlier
revision of this file had exactly that bug; `rules:check` was added to make
sure it stays caught.

## Smoke-test result (verified)

```
✓ Emulator boots in ~12s after jar download
✓ Seed writes 3 categories, 12 partners, 2 orders
✓ GeoPoint serialises to {latitude, longitude}
✓ Landmark mirrors correctly into driverPayload.headerLandmark
✓ REST API returns documents at /v1/projects/demo-atlaasgo/databases/(default)/documents/…
✓ advance-demo.ts: every status write read-back-confirms within ~150ms
✓ onSnapshot streaming: each driver updateDoc produces a delivered snapshot
  on a concurrently-running listener — the same code path the mobile customer
  screen uses
✓ rules:check — empty landmark rejected, valid landmark accepted
```
