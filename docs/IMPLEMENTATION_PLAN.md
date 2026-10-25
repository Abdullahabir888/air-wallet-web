# Implementation Plan — Air Wallet (Expo + Firebase)

> **Status: v1.0 built (2026-10-25).** Decisions taken during the build override the plan below where they differ:
>
> | Topic | Plan said | v1.0 does | Why |
> |---|---|---|---|
> | App layout | single `apps/wallet` | ✅ same | One Expo Router app serves web, Android, iOS |
> | Workspaces | pnpm | **npm workspaces** + root `.npmrc` (`legacy-peer-deps`) | Simplest with Expo + Vercel; no hoisting config |
> | Firebase on native | React Native Firebase | **Firebase JS SDK everywhere** (AsyncStorage auth persistence) | Works in Expo Go and web with one code path. Add RNFirebase only for native App Check (DEPLOYMENT.md §6) |
> | UI library | React Native Paper | **Own small accessible kit** (`src/components/ui.tsx`) | Matches the approved bKash-style design exactly |
> | Functions packaging | — | **esbuild bundle** inlines `packages/*` | Firebase uploads only `functions/`; workspace deps can't resolve in the cloud |
> | TypeScript | template version | **~6.0.3** (Expo SDK 58 template) | npm `latest` is 7.x; not yet supported by Expo tooling |
> | Currency scope | BDT + USD/GBP/EUR, no crypto | ✅ same | Open question 2 answered: BTC/ETH dropped |
> | Funding | admin credit | ✅ same (`adminCreditWallet`) | Open question 1: no public top-up until a payment partner exists |
> | New scope added | — | Request money, recharge, agent cash-out, ATM code, virtual card (3 styles), live FX for USD/GBP/EUR, BDT-first, light/dark | From product review in chat |
>
> Exact versions: Expo SDK 58 (`expo ~58.0.19`, RN 0.88.0, React 19.3.0, expo-router ~58.0.26), firebase 13.1, firebase-functions 7.4, firebase-admin 14.5, zod 4.6, TanStack Query 5.104, zustand 5.0, react-hook-form 7.91.


## 1. Scope in one line

A real multi-currency wallet: verified sign-up, per-currency wallets, send money, simulated bill pay, currency exchange with quotes, transaction history, profile, admin console. One codebase for web, Android, iOS. Money moves only through server Functions over a double-entry ledger.

**Assumption:** this is a demo/sandbox money system (no bank rails, no real card processing). Real money would need a licensed partner and is out of scope.

## 2. Architecture

### 2.1 One change to the proposed structure

The brief proposes `apps/mobile` **and** `apps/web`. With Expo Router + React Native Web, a single Expo app already builds for web, Android and iOS from the same route files. A second web app would duplicate every screen.

**Recommendation:** one universal app at `apps/wallet`, deployed to Vercel via `expo export --platform web`. Platform differences live in `.web.tsx` / `.native.tsx` files and responsive layouts.

If you need a separate web app later (e.g. a marketing site in Next.js), add `apps/site` then — it would share `packages/*` but not screens.

### 2.2 Tree

```text
air-wallet/
├── apps/
│   └── wallet/                     # Expo app → web + Android + iOS
│       ├── app/
│       │   ├── _layout.tsx          # providers, theme, auth listener
│       │   ├── (auth)/              # sign-in, sign-up, verify-email, forgot-password
│       │   ├── (tabs)/              # index (home), activity, pay, exchange, settings
│       │   ├── wallet/              # [walletId], new
│       │   ├── transactions/        # [txId]
│       │   ├── transfer/            # index, review, done
│       │   ├── exchange/            # review
│       │   ├── pay/                 # [billerId]
│       │   ├── settings/            # profile, email, password, help
│       │   └── admin/               # users, users/[uid]   (claim-gated)
│       ├── src/{components,features,hooks,providers,styles}
│       ├── app.config.ts            # env-driven (dev/prod Firebase)
│       ├── eas.json
│       └── vercel.json
├── packages/
│   ├── core/          # money math (minor units), currencies, formatting — pure TS, no RN
│   ├── validation/    # Zod schemas shared by forms and Functions
│   ├── types/         # Firestore doc types, callable I/O types
│   ├── firebase/      # client adapter: index.web.ts (JS SDK) / index.native.ts (RNFirebase)
│   ├── api/           # TanStack Query hooks wrapping callables + listeners
│   └── ui/            # design tokens, themed Paper components
├── functions/
│   └── src/{auth,wallets,transactions,exchange,billers,admin,shared}
├── scripts/           # set-admin.ts, seed-billers.ts, import-users.ts
├── docs/
├── firebase.json · firestore.rules · firestore.indexes.json · storage.rules
├── package.json (workspaces) · tsconfig.base.json · .gitignore · README.md
```

Workspaces: **pnpm** (fast, strict). Expo SDK 58 supports monorepos out of the box with its Metro config; verify at scaffold.

### 2.3 The one real platform split: Firebase SDK

| Need | Web | Android / iOS |
|---|---|---|
| SDK | `firebase` (JS) | `@react-native-firebase/*` |
| App Check | reCAPTCHA Enterprise | Play Integrity / App Attest (native only) |
| Auth persistence | IndexedDB (default) | Native keychain/keystore (RNFirebase default) |
| Dev runtime | browser | **Expo dev build** (RNFirebase doesn't run in Expo Go) |

Why not the JS SDK everywhere: it can't use native attestation, so App Check would be unenforceable on mobile. `packages/firebase` exposes one interface (`auth`, `db`, `callFunction`, `storage`) with two implementations; nothing above it knows which SDK runs.

### 2.4 State

| Kind | Tool |
|---|---|
| Server state (wallets, tx, profile) | Firestore listeners pushed into TanStack Query cache; callables via `useMutation` |
| Auth session | Context from `onAuthStateChanged` |
| UI state (selected wallet, draft transfer) | Zustand, persisted where useful |
| Forms | React Hook Form + `zodResolver` with schemas from `packages/validation` |

## 3. Versions (checked against npm on 2026-10-25)

Install native-tied packages with `npx expo install` so they match SDK 58.

| Package | Version | Note |
|---|---|---|
| expo | 58.0.x | SDK 58 |
| react / react-dom | 19.3.0 | pinned by SDK 58 |
| react-native | 0.88.0 | pinned by SDK 58 |
| react-native-web | ~0.21.4 | pinned by SDK 58 |
| expo-router | ~58.0.26 | |
| react-native-paper | 5.15.x | peer: `react-native-safe-area-context` (~5.10.1 for SDK 58) |
| firebase (web) | 13.1.x | |
| @react-native-firebase/app (+ auth, firestore, functions, app-check, storage) | 27.1.x | needs `expo-build-properties` + config plugins; verify SDK 58 support at scaffold |
| firebase-functions | 7.4.x | Node ≥ 18; target Node 22 runtime |
| firebase-admin | 14.5.x | |
| firebase-tools | 15.34.x | Node ≥ 20 |
| react-hook-form | 7.91.x | |
| @hookform/resolvers | 6.0.x | supports zod ^4 |
| zod | 4.6.x | |
| @tanstack/react-query | 5.104.x | |
| zustand | 5.0.x | |
| jest-expo | ~58.0.12 | jest ^29 or ^30 |
| @testing-library/react-native | 14.1.x | |
| typescript | use what the SDK 58 template pins | npm `latest` is 7.0.2 (native compiler); Expo tooling compatibility with TS 7 **not verified** — don't force it |
| decimal.js (Functions only) | latest | FX rate math |

## 4. Phases

Each phase ends green: lint, typecheck, unit, rules tests, Functions emulator tests.

| Phase | Deliverable | Exit criteria |
|---|---|---|
| **0. Foundation** | Monorepo, Expo app boots on web/Android/iOS (dev build), Firebase dev project, emulators, CI (GitHub Actions) | `pnpm test` + `pnpm typecheck` pass in CI; web preview on Vercel |
| **1. Design system** | Tokens from legacy palette (`#675AFE` primary, Poppins), light/dark, Paper theme, core components (Button, TextField, AmountInput, WalletCard, TxRow, EmptyState) | Components have RTL tests + a11y labels; contrast AA |
| **2. Auth** | A1–A9 | Rules tests; unverified user can't reach tabs; generic errors |
| **3. Wallets + ledger core** | `onUserCreated`, `createWallet`, ledger helpers, `adminCreditWallet`, dashboard W1–W6 | Ledger invariant tests incl. concurrency |
| **4. Transfers** | P4, P2, P3 | Idempotency, overdraft, self-send, rate limit tests |
| **5. Bill pay** | P1 (seeded billers) | Same money tests as P4 |
| **6. Exchange** | X1–X3, FX secret, rate cache | Quote expiry/reuse, rounding, per-currency ledger balance |
| **7. Profile + settings** | U1–U4, U6, W8, W10 | Storage rules tests; re-auth flows |
| **8. Admin** | D1–D4 | Non-admin denied at all three layers |
| **9. Hardening + release** | App Check enforced, CSP/headers, `reconcileLedger`, EAS production builds, store metadata | Security baseline checklist complete |

## 5. Testing

| Layer | Tool | Must cover |
|---|---|---|
| `packages/core` money math | Jest | Minor-unit conversion per exponent (0/2/3), formatting, no float paths |
| `packages/validation` | Jest | Valid + invalid cases for every schema |
| Components / screens | jest-expo + RTL | Forms, errors, loading/empty states, a11y roles |
| Firestore + Storage rules | `@firebase/rules-unit-testing` on emulator | Allow **and** deny for every match block |
| Functions | Jest on emulator | Happy path, auth missing, unverified, suspended, insufficient funds, idempotent replay, **parallel calls on one wallet**, ledger sums |
| E2E (later) | Playwright (web), Maestro (mobile) | Sign up → credit → transfer → exchange → history |

## 6. Delivery

- **Web:** Vercel project rooted at `apps/wallet`, build `npx expo export -p web`, output `dist`, SPA rewrites + security headers in `vercel.json`. Env: public Firebase web config + reCAPTCHA site key only.
- **Mobile:** EAS profiles `development` (dev client), `preview` (internal APK / TestFlight), `production`. `google-services.json` / `GoogleService-Info.plist` per environment via EAS file secrets.
- **Backend:** `firebase deploy --only firestore,storage,functions` from CI on tag; dev on merge to `main`.

## 7. Open questions (need your call)

1. **How does money enter a wallet?** Legacy had no deposit. Plan assumes admin credit (audited) for demo/testing. Want a sign-up bonus or a fake "top up" screen too?
2. **BTC / ETH.** Legacy shows them, but crypto wallets are a different product. Drop (plan default), or keep as display-only rates?
3. **Single universal app vs separate `apps/web`.** Plan recommends single (§2.1). OK?
4. **Firebase projects + Blaze billing.** Functions and Secret Manager need the Blaze plan. Do you have projects, or should I write the setup steps?
5. **The rest of your brief.** It cut off mid-sentence in section 3 ("Use platform-specific implementations only when…"). Any later sections (design, testing, CI, deliverables) may change this plan.
