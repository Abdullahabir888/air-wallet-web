# Air Wallet

A digital wallet for Bangladesh that runs on **web, Android and iOS from one codebase**.
BDT-first, with live USD / GBP / EUR exchange, a virtual card in three styles, glossy modern icons,
light + dark mode, and a layout that adapts to each phone (Samsung, Pixel, iPhone, tablets, foldables).

Built with Expo (React Native + React Native Web), Expo Router, TypeScript and Firebase
(Auth, Firestore, Cloud Functions, Storage). It replaces the old PHP/MySQL Air Wallet.

## Features

| Feature | What it does |
|---|---|
| Sign up / sign in | Email + password, **Google** (web, Android, iOS), **Sign in with Apple** (iPhone), email verification, password reset, mobile number linked to the account |
| Home | BDT balance (tap to hide), 8 quick actions, live BDT rates, recent activity |
| Send money | To any Air Wallet user by email or mobile. Instant, no fee |
| Request money | Ask someone to pay you. They pay or decline in the app; you can remind or cancel |
| Pay bill | Electricity, gas, water, internet, TV, education (demo billers) |
| Mobile recharge | GP, Robi, Banglalink, Airtel, Teletalk. Operator auto-detected, prepaid/postpaid |
| Cash out (agent) | Cash out at an agent number, fee shown before you confirm |
| Cash out (ATM) | One-time 6-digit code, expires in 15 min, money held then released if unused |
| Exchange | Live BDT ⇄ USD / GBP / EUR. Rate locked for 60 s before you confirm |
| Virtual card | Midnight Black, Royal Purple or Ruby Gold. Show details (with password), freeze, online / international toggles |
| Activity | All transactions, filtered by sent / received / bills, with a detail page |
| Settings | Light / dark / system theme, name, password, sign out, detected device |
| Admin panel | Admins only, on web, Android and iOS. Live stats, users, transactions, audit log. Suspend / reactivate accounts and credit wallets. See [docs/ADMIN.md](docs/ADMIN.md) |
| Live sync | Every screen reads Firestore live. A payment, credit or suspension shows up on every signed-in device at once, no refresh |
| iPhone Liquid Glass | Floating glass tab bar: real Apple glass on iOS 26+, frosted blur on older iOS |
| Phone-aware layout | Reads the phone model and screen: One UI header on Samsung, Dynamic Island / notch / punch-hole safe areas, compact and tablet/foldable grids |

> **Real money needs partners.** Transfers, requests and exchange work fully inside Air Wallet.
> Bills, recharge, agent / ATM cash-out and the card are **demo settlements** until you connect
> a licensed partner (biller aggregator, telco, MFS agent network, ATM switch, card issuer).
> Holding customer money in Bangladesh requires a Bangladesh Bank MFS licence or a licensed partner.
> See [docs/FEATURES.md](docs/FEATURES.md).

## Quick start (local, no Firebase account needed)

Requirements: Node 22, Java 21 (for the emulators), Firebase CLI (`npm i -g firebase-tools`).

```bash
npm install                 # app + shared packages (npm workspaces)
npm run functions:install   # Cloud Functions deps
cp apps/wallet/.env.example apps/wallet/.env   # keep EXPO_PUBLIC_USE_EMULATORS=true

npm run emulators           # terminal 1 — Auth, Firestore, Functions, Storage + UI on :4000
npm run seed                # terminal 2 — demo users, billers, agent, rates
npm run web                 # terminal 2 — opens the app in the browser
```

Demo logins (emulator only): `abir@demo.airwallet` / `Demo1234` (৳48,250, admin) and
`rafi@demo.airwallet` / `Demo1234` (৳20,000). Send money between them to see it live.

Phone: `npm run dev`, then press `a` (Android) or `i` (iOS), or scan the QR code with Expo Go.
Set `EXPO_PUBLIC_EMULATOR_HOST` to your computer's LAN IP when testing on a real phone.

## Project structure

```text
air-wallet/
├── apps/wallet/          Expo app (web + Android + iOS)
│   ├── app/              Screens (Expo Router): (auth), (app)/(tabs), send, request, pay-bill, …
│   ├── src/components/   UI kit, icons, wallet card, virtual card, money-flow helpers
│   ├── src/lib/          Firebase client, API calls, live data hooks, prefs store
│   └── assets/           App icon, adaptive icon, splash, favicon (logo itself is vector: src/components/Logo.tsx)
├── packages/core/        Money math (integer paisa), currencies, fees, BD operators, types
├── packages/validation/  Zod schemas shared by forms and Cloud Functions
├── functions/            Cloud Functions: ledger, transfers, bills, ATM, FX, card, admin
├── firestore.rules       Clients read their own data; only Functions write money
├── storage.rules         Avatar uploads: owner-only, images ≤ 2 MB
├── brand/                Logo, icons (SVG + PNG), app-store icons, favicons, card artwork
├── design/               Approved mockups and build screenshots
└── docs/                 Analysis, schema, security, deployment, API, testing
```

## Scripts

| Command | Does |
|---|---|
| `npm run web` / `npm run dev` | Run the app (web / Expo dev server) |
| `npm run typecheck` | TypeScript across app, packages and functions |
| `npm test` | Unit tests: core, validation, app, functions |
| `npm run test:rules` | Firestore security-rules tests on the emulator |
| `npm run emulators` | Build functions + start the Firebase Emulator Suite |
| `npm run seed` | Load demo data into the emulators |
| `npm run deploy:backend` | Deploy rules, indexes and functions |
| `npm run deploy:web` | Build the static web app into `apps/wallet/dist` |

## Settings you need to fill in

Everything runs locally with **no keys** (emulators + demo data). For a real deployment, set these:

| Where | Setting | Get it from |
|---|---|---|
| `apps/wallet/.env` (+ Vercel + EAS env) | `EXPO_PUBLIC_FIREBASE_*` (6 values) | Firebase console → Project settings → Web app |
| | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Firebase → Authentication → Google provider |
| | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `GOOGLE_IOS_URL_SCHEME` | Google Cloud → Credentials → iOS OAuth client |
| | `EXPO_PUBLIC_RECAPTCHA_ENTERPRISE_KEY` (optional) | Firebase → App Check |
| | `EXPO_PUBLIC_USE_EMULATORS=false` | — |
| Firebase Secret Manager | `EXCHANGE_API_KEY` | exchangerate-api.com (free tier) |
| `functions/.env` | `FUNCTIONS_REGION`, `APP_CHECK_ENFORCE` | Defaults in `functions/.env.example` |
| `.firebaserc` | dev / prod project IDs | Your Firebase projects |
| `apps/wallet/app.config.ts` | `bundleIdentifier` / `package` (`com.airwallet.app`) | Change if you use another ID |
| `packages/core/src/fees.ts` | Fees and limits | Your tariff |
| Firebase console | Enable Email/Password, Google, Apple; email enumeration protection; Android SHA-1 | DEPLOYMENT.md §1 |

Full walkthrough: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Deploy

Step-by-step for Firebase, Vercel (web) and EAS (Android / iOS): **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

## Docs

| Doc | For |
|---|---|
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Going live: Firebase, Vercel, EAS, App Check, secrets |
| [ADMIN.md](docs/ADMIN.md) | Admin panel: who gets it, what it does, how it stays in sync |
| [FEATURES.md](docs/FEATURES.md) | Every feature, what's real vs demo, partner checklist |
| [API.md](docs/API.md) | All Cloud Functions: inputs, outputs, errors |
| [FIREBASE_SCHEMA.md](docs/FIREBASE_SCHEMA.md) | Collections, fields, rules, indexes |
| [SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) | Legacy audit + how the rebuild fixes each issue |
| [TESTING.md](docs/TESTING.md) | Automated tests + manual QA checklist |
| [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Colors, type, icons, cards, logo usage |
| [FEATURE_MAPPING.md](docs/FEATURE_MAPPING.md) | Old PHP feature → new screen + backend |
| [LEGACY_ANALYSIS.md](docs/LEGACY_ANALYSIS.md) | What the old app actually did |
| [MIGRATION_PLAN.md](docs/MIGRATION_PLAN.md) | Moving off the old app |
| [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | Architecture and decisions |
