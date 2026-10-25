# Deployment Guide

Three parts go live separately:

| Part | Where | Command |
|---|---|---|
| Backend (rules, indexes, Cloud Functions) | Firebase | `npm run deploy:backend` |
| Web app | Vercel | Git push (auto) or `vercel --prod` |
| Android / iOS apps | EAS Build → Play Store / App Store | `eas build` + `eas submit` |

Do them in that order. Use two Firebase projects: **dev** (`air-wallet-dev`) and **prod** (`air-wallet-prod`).

---

## 0. Before you start

- Node 22, Java 21, Git
- `npm i -g firebase-tools eas-cli vercel`
- A Google account with billing (Firebase **Blaze** plan is required for Cloud Functions and Secret Manager; small apps usually stay inside the free quota)
- An Expo account (for EAS) and a Vercel account
- Google Play Console ($25 once) and Apple Developer Program ($99/year) for store releases

```bash
npm install
npm run functions:install
npm run typecheck && npm test      # must pass before any deploy
```

---

## 1. Firebase project (do this for dev, then prod)

1. **Create project** at console.firebase.google.com → name `air-wallet-dev` → upgrade to **Blaze**.
2. **Firestore** → Create database → *Production mode* → location **asia-south1 (Mumbai)** (closest to Bangladesh; cannot be changed later).
3. **Authentication** → Get started → enable **Email/Password**.
   - Settings → **User actions** → turn on **Email enumeration protection**.
   - Settings → **Password policy** → require upper, lower, number, min 8 (matches the app).
   - Templates → set sender name "Air Wallet" for verification and reset emails.
   - Settings → Authorized domains → add your web domain (e.g. `airwallet.app`, `*.vercel.app` preview domain).
4. **Storage** → Get started → same region.
5. **Register apps** (Project settings → Your apps):
   - **Web app** → copy the config into `apps/wallet/.env` (see §3).
   - Android (`com.airwallet.app`) and iOS (`com.airwallet.app`) are only needed when you add native App Check (§6).
6. Point the CLI at it:
   ```bash
   firebase login
   firebase use dev            # aliases are in .firebaserc — edit the project IDs there
   ```


### 1.1 Google & Apple sign-in

**Firebase:** Authentication → Sign-in method → enable **Google** and **Apple**.
Keep *"One account per email address"* (the default) — the app tells users with an existing password account to link Google/Apple from Settings.

**Google**
1. Firebase → Google provider → copy the **Web client ID** → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
2. Google Cloud console → APIs & Services → Credentials → **Create OAuth client ID → iOS** with bundle ID `com.airwallet.app` →
   - client ID → `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
   - "iOS URL scheme" (reversed client ID, `com.googleusercontent.apps.…`) → `GOOGLE_IOS_URL_SCHEME` (EAS env var, build-time)
3. **Android:** add the app's **SHA-1** fingerprints to the Firebase Android app (Project settings → Your apps → Android → Add fingerprint):
   - EAS signing key: `eas credentials -p android` → copy SHA-1
   - Play App Signing key (after first Play upload): Play Console → Setup → App integrity
   Without the right SHA-1, Google sign-in on Android fails with `DEVELOPER_ERROR`.
4. Web: add your Vercel/custom domain to Firebase Auth → Authorized domains (popup sign-in).

**Apple (iPhone)**
1. Apple Developer → Identifiers → `com.airwallet.app` → enable **Sign in with Apple**. (EAS does this automatically on the next build because `usesAppleSignIn: true` is set.)
2. Firebase → Apple provider → enable. For native iOS only, the bundle ID is enough. (Services ID, Team ID and a key are needed only if you later add Apple sign-in on web/Android.)
3. If you email users with Apple "Hide my email" addresses, register your sending domain under *Sign in with Apple for Email Communication*.

**Builds:** native Google and Apple sign-in need a development or production build (`eas build --profile development`); they are not available inside Expo Go. Web Google sign-in works everywhere, including `npm run web`.

**App Store rule 4.8:** because the iOS app offers Google sign-in, it also offers Sign in with Apple — already done.

## 2. Backend deploy

### 2.1 Secrets and config

```bash
# Live FX rates (free key at exchangerate-api.com). Without it the app shows "Demo rates".
firebase functions:secrets:set EXCHANGE_API_KEY

# Non-secret config
cp functions/.env.example functions/.env       # FUNCTIONS_REGION=asia-south1, APP_CHECK_ENFORCE=false
```

> The old PHP app exposed an exchangerate-api key in `js/script.js`. **Revoke that key** and create a new one for Secret Manager.

### 2.2 Deploy

```bash
npm run deploy:backend          # = firebase deploy --only firestore,storage,functions
```

This deploys `firestore.rules`, `firestore.indexes.json` (indexes take a few minutes to build), `storage.rules` and 24 functions to `asia-south1`.

### 2.3 TTL policies (one-time, console)

Firestore → **TTL** → add policies:
- Collection `idempotency`, field `expireAt`
- Collection `exchangeQuotes`, field `expireAt`

### 2.4 Reference data + roles

Use a service account key **only on your own machine** (never commit it):

```bash
# Firebase console → Project settings → Service accounts → Generate new private key → save as sa.json (outside the repo)
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json

# Billers, demo agent, starting rates. --no-demo-users skips the demo accounts in real projects.
node functions/scripts/seed.mjs --project air-wallet-prod --no-demo-users

# Make yourself admin (needed to credit wallets — the only way money enters in this build)
node functions/scripts/set-role.mjs --project air-wallet-prod you@example.com admin

# ATM partner service user (only when an ATM switch integrates)
node functions/scripts/set-role.mjs --project air-wallet-prod atm-switch@partner.com atmPartner
```

### 2.5 Smoke test

1. Sign up in the app, verify email.
2. As admin, credit the new wallet (callable `adminCreditWallet` — e.g. from a small admin script or the Functions shell: `firebase functions:shell`).
3. Send ৳100 to a second account → both balances update live.
4. Firestore console → `ledgerEntries` → two entries for that transaction that sum to 0.

---

## 3. App environment variables

`apps/wallet/.env` (local) — and the same keys in Vercel and EAS:

| Key | Value |
|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` … `EXPO_PUBLIC_FIREBASE_APP_ID` | From the Firebase web app config |
| `EXPO_PUBLIC_FUNCTIONS_REGION` | `asia-south1` |
| `EXPO_PUBLIC_RECAPTCHA_ENTERPRISE_KEY` | Web App Check site key (optional, §6) |
| `EXPO_PUBLIC_USE_EMULATORS` | `false` for real projects |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google sign-in (all platforms) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google sign-in on iPhone |
| `GOOGLE_IOS_URL_SCHEME` | Build-time only (EAS), reversed iOS client ID |

These values are public by design (they ship inside the app). Security comes from Auth, rules and server-side checks.

---

## 4. Web → Vercel

`apps/wallet/vercel.json` already sets the install/build commands, SPA routing and security headers (CSP, HSTS, no framing).

**Option A — Git (recommended)**
1. Push the repo to GitHub.
2. Vercel → Add New Project → import the repo.
3. **Root Directory:** `apps/wallet`. Framework preset: *Other* (vercel.json handles the rest).
4. Environment Variables → add the §3 keys (Production + Preview).
5. Deploy. Every push to `main` deploys production; every PR gets a preview URL.

**Option B — CLI**
```bash
cd apps/wallet
vercel link
vercel env pull                 # or add env vars in the dashboard
vercel --prod
```

Web branding lives in `apps/wallet/public/` (copied as-is into the site): tab and home-screen icons, `manifest.json`, the link-preview image and the logo loading screen in `index.html`. They're generated from `brand/`; after a logo change run `python3 scripts/make-web-assets.py .`.

After the first deploy:
- In `apps/wallet/public/index.html`, change `/og-image.png` in the two `og:image` / `twitter:image` tags to your full URL (e.g. `https://airwallet.app/og-image.png`). WhatsApp and Facebook skip relative image links.
- Add the Vercel domain (and your custom domain) to Firebase Auth → Authorized domains.
- Custom domain: Vercel → Settings → Domains → add `airwallet.app` → follow the DNS steps.

---

## 5. Android & iOS → EAS

```bash
cd apps/wallet
eas login
eas init                        # creates the EAS project; put its ID in EAS_PROJECT_ID (app.config.ts reads it)
```

Add env vars to EAS (once per environment):
```bash
eas env:create --environment production --name EXPO_PUBLIC_FIREBASE_API_KEY --value "..." --visibility plaintext
# …repeat for every §3 key
```

| Goal | Command |
|---|---|
| Test build on your phone (Android APK) | `eas build -p android --profile preview` |
| Internal iOS build (TestFlight) | `eas build -p ios --profile preview` |
| Store builds | `eas build -p all --profile production` |
| Upload to stores | `eas submit -p android --profile production` / `eas submit -p ios` |
| JS-only hotfix without a store review | `eas update --channel production -m "fix"` (needs `expo-updates`; add with `npx expo install expo-updates`) |

EAS manages signing keys for you (Android keystore, iOS certificates) on the first build — accept the prompts.

**Store checklist**
- App name "Air Wallet", icon from `apps/wallet/assets/icon.png` (1024×1024)
- Privacy policy URL (required by both stores for finance apps)
- Play Console → *Financial features* declaration; Apple → App Privacy answers (email, phone, financial info)
- Screenshots: use the mockups in `design/` as a guide, but take real screenshots from a preview build

---

## 6. App Check (turn on last)

App Check proves requests come from your real app, not a script.

| Platform | Provider | Status in this repo |
|---|---|---|
| Web | reCAPTCHA Enterprise | Wired up — set `EXPO_PUBLIC_RECAPTCHA_ENTERPRISE_KEY` |
| Android | Play Integrity | Needs `@react-native-firebase/app` + `app-check` in a dev build |
| iOS | App Attest | Same as Android |

Steps:
1. Firebase console → App Check → register the web app with a reCAPTCHA Enterprise key → put the key in env → redeploy web.
2. For native: `npx expo install @react-native-firebase/app @react-native-firebase/app-check expo-build-properties`, add the config plugins, implement `src/lib/appCheck.native.ts` (it is a stub today), rebuild with EAS.
3. Watch App Check → *Metrics* until ~100% of requests are verified.
4. Then set `APP_CHECK_ENFORCE=true` in `functions/.env` and `npm run deploy:backend`.

Turning enforcement on before step 2 will block the mobile apps.

---

## 7. CI/CD (GitHub Actions)

`.github/workflows/ci.yml` runs on every push / PR: typecheck → unit tests → rules tests on the emulator → functions bundle → web build.

Optional backend auto-deploy on `main`:
1. Set up Workload Identity Federation for a deploy service account (roles: Firebase Admin, Cloud Functions Admin, Service Account User, Secret Manager Secret Accessor).
2. Repo secrets: `GCP_WIF_PROVIDER`, `GCP_DEPLOY_SA`. Repo variables: `FIREBASE_PROJECT_ID`, `DEPLOY_BACKEND=true`.

Web deploys come from Vercel's Git integration; mobile from EAS (optionally EAS Workflows).

---

## 8. Go-live checklist

- [ ] Prod Firebase project in asia-south1, Blaze, email enumeration protection on
- [ ] Google + Apple providers enabled; Android SHA-1 (EAS + Play signing) added; iOS client ID + URL scheme set
- [ ] `EXCHANGE_API_KEY` secret set; old exposed key revoked
- [ ] Rules + indexes + functions deployed; TTL policies added
- [ ] Billers seeded **without** demo users; your admin claim set
- [ ] Vercel prod env vars set, `EXPO_PUBLIC_USE_EMULATORS=false`; domain added to Auth authorized domains
- [ ] Fees and limits reviewed in `packages/core/src/fees.ts`
- [ ] Demo labels kept (or partners integrated) for bills, recharge, cash-out, ATM, card
- [ ] Privacy policy + terms published
- [ ] Legacy repo history purged of personal photos and the old key (see MIGRATION_PLAN.md)
- [ ] Manual QA checklist in TESTING.md passed on web, Android and iOS
- [ ] App Check enforced (after native App Check is added)

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| `FAILED_PRECONDITION: The query requires an index` | Indexes still building, or run `firebase deploy --only firestore:indexes` |
| `functions/failed-precondition: Verify your email first` | Open the verification link, then tap "I've verified" (refreshes the token) |
| Phone can't reach emulators | Set `EXPO_PUBLIC_EMULATOR_HOST` to the computer's LAN IP; same Wi-Fi |
| Exchange shows "Demo rates" | `EXCHANGE_API_KEY` missing or invalid — check `firebase functions:secrets:access EXCHANGE_API_KEY` and function logs |
| Vercel build: peer dependency error | Keep the root `.npmrc` (`legacy-peer-deps=true`) |
| Callable returns `unauthenticated` on card details | Expected after 5 min: the app asks for the password again |
| Google sign-in on Android: `DEVELOPER_ERROR` | SHA-1 of the signing key missing in Firebase, or wrong `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` |
| Google/Apple button does nothing in Expo Go | Expected — native sign-in needs a dev build (`eas build --profile development`) |
| "already has an Air Wallet password" | Sign in with email, then Settings → Sign-in methods → Link Google / Apple |
| `permission-denied` on every call after enabling App Check | Native App Check not set up — set `APP_CHECK_ENFORCE=false` and redeploy |
