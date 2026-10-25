# Feature Mapping — Legacy → Rebuild

**Legacy verdict key:** ✅ Works · ⚠️ Works but insecure/buggy · ❌ Broken · 🎭 Static/fake · 💻 Client-only

**Status key:** all rows are `Planned` at this stage (docs phase, no code yet).

**Screens.** Web and mobile share one Expo Router route file per screen (see `IMPLEMENTATION_PLAN.md` §2). Where layouts differ, the route uses a responsive layout (sidebar ≥ 1024 px, bottom tabs below), not a separate screen. The "web" and "mobile" columns therefore name the same route unless noted.

## 1. Auth

| # | Original feature | Source file | Existing behavior | Verdict | Web screen | Mobile screen | Firebase op | Status | Required tests |
|---|---|---|---|---|---|---|---|---|---|
| A1 | Sign up | `signup-user.php`, `controllerUserData.php#signup` | Name/email/pw/confirm; bcrypt; inserts `notverified`; emails 6-digit code | ⚠️ | `/(auth)/sign-up` | same | `createUserWithEmailAndPassword` → `updateProfile` → `sendEmailVerification`; `onUserCreated` trigger creates profile + wallet | Planned | Zod schema unit (weak pw, mismatch, bad email); form RTL test; emulator: trigger creates `users/{uid}` + wallet |
| A2 | Email OTP verification | `user-otp.php`, `#check` | Code lookup across all users; no expiry; no resend | ⚠️ critical (S1–S3) | `/(auth)/verify-email` | same | Firebase verification link; "Resend" (`sendEmailVerification`, 60 s cooldown); "I've verified" → `user.reload()` + `getIdToken(true)` | Planned | Unverified user blocked from `(tabs)`; resend cooldown; Functions reject `email_verified=false` |
| A3 | Login | `login-user.php`, `#login` | Email + bcrypt; unverified → OTP page | ⚠️ | `/(auth)/sign-in` | same | `signInWithEmailAndPassword`; generic error message | Planned | Wrong pw / unknown email show **same** message; redirect to verify when unverified; to `(tabs)` when verified |
| A4 | Forgot password | `forgot-password.php`, `#check-email` | Writes code to wrong table; emails code | ❌ | `/(auth)/forgot-password` | same | `sendPasswordResetEmail`; always shows "If that email exists, we sent a link" | Planned | Same UI response for existing/unknown email |
| A5 | Reset code entry | `reset-code.php`, `#check-reset-otp` | Code-only lookup; `0` matches all | ❌ critical | — (removed) | — | Replaced by Firebase reset link | Planned | Regression: no route accepts a numeric reset code |
| A6 | New password | `new-password.php`, `#change-password` | Sets pw for session email | ⚠️ | Firebase hosted action page (custom action URL later: `/(auth)/reset-password?oobCode=`) | Same via deep link | `confirmPasswordReset` | Planned | Invalid/expired `oobCode` shows error; strong-pw rule enforced |
| A7 | Password changed notice | `password-changed.php` | Success message + login button | ✅ | Toast + redirect to `/(auth)/sign-in` | same | — | Planned | RTL: toast shown |
| A8 | Logout | `logout-user.php` | Destroys session | ✅ | Settings → Sign out | same | `signOut`; clear TanStack Query cache + Zustand store | Planned | Cache cleared; protected routes redirect |
| A9 | Auth gate | top of `home.php`, `Exchange.php`, `wallet.php` | Session check; redirect without `exit` | ⚠️ (S13) | `app/(tabs)/_layout.tsx` guard | same | `onAuthStateChanged` + `email_verified` | Planned | Guard redirects; deep link to protected route while signed out returns to it after login |

## 2. Dashboard / wallet

| # | Original feature | Source file | Existing behavior | Verdict | Web screen | Mobile screen | Firebase op | Status | Required tests |
|---|---|---|---|---|---|---|---|---|---|
| W1 | Overview header + name/avatar | `home.php` nav | Name + avatar from DB, unescaped | ⚠️ (S8) | `/(tabs)/index` header | same | read `users/{uid}` (live listener) | Planned | Renders escaped name; fallback avatar initials |
| W2 | Wallet cards (BTC/ETH/BTC) | `home.php` `.cards` | 3 hardcoded balances, fake expiry/CVV | 🎭 | `/(tabs)/index` card carousel | same | read `wallets where ownerUid==uid` | Planned | Balances formatted from minor units per currency; empty state; no PAN/CVV rendered |
| W3 | Active card selection | `wallet.js#activeCard` | `localStorage` index | 💻 | Card tap → `/wallet/[walletId]` | same | — (selected wallet in Zustand, persisted per device) | Planned | Selection persists across reload |
| W4 | Add wallet (new) | — | Not in legacy; needed for multi-currency | n/a | `/wallet/new` | same | `createWallet` | Planned | Duplicate currency rejected; unsupported currency rejected |
| W5 | Income / Expenses / Cashback stats | `home.php` `.insights` | Static numbers | 🎭 | `/(tabs)/index` summary tiles | same | Derived client-side from last-30-day `transactions` (or a `stats` Function later) | Planned | Sums correct for fixture data; cashback **dropped** (no cashback concept) — documented |
| W6 | BTC/ETH chart | `wallet.js` Chart.js | Hardcoded Jan–Nov data | 🎭 | `/(tabs)/index` balance-over-time chart | same | `ledgerEntries` for selected wallet | Planned | Chart renders from fixture ledger; empty state |
| W7 | Investments list | `home.php` `.investments` | 4 brand logos, $20,033 each | 🎭 | **Dropped** | Dropped | — | Won't build | Documented as out of scope (no investment product; brand logos are trademarks) |
| W8 | Theme toggle | `home.php` `.theme-btn`, `wallet.js` | Toggles class, not persisted | ✅ | Settings → Appearance | same | `users/{uid}.theme` | Planned | Theme applied on cold start; respects system |
| W9 | Sidebar nav | `home.php` aside | Dashboard, Exchange real; others `#` | ⚠️ | Responsive sidebar (web ≥1024 px) | Bottom tabs | — | Planned | All nav items route to real screens |
| W10 | Help Center | `home.php` link `#` | Dead link | ❌ | `/settings/help` (static FAQ) | same | — | Planned | Renders |

## 3. Payments / transactions

| # | Original feature | Source file | Existing behavior | Verdict | Web screen | Mobile screen | Firebase op | Status | Required tests |
|---|---|---|---|---|---|---|---|---|---|
| P1 | Fast Payment (bills) | `home.php` `.badges`, `wallet.js#createBadges` | `confirm()` then subtracts from displayed balance in `localStorage`; can go negative | 💻 critical (S21) | `/(tabs)/pay` biller grid → `/pay/[billerId]` confirm sheet | same | read `billers`; `payBill` | Planned | Insufficient funds rejected server-side; idempotent retry returns same tx; concurrent payments can't overdraw; ledger sums to 0 |
| P2 | Recent transactions | `home.php` `.recent-transactions` | 6 static rows | 🎭 | `/(tabs)/index` "Recent" (5 rows) | same | `transactions where participants array-contains uid order by createdAt desc limit 5` | Planned | Ordering; sign/color for debit vs credit; counterparty name |
| P3 | Transaction page | sidebar "Transaction" `#` | Dead link | ❌ | `/(tabs)/activity` + `/transactions/[txId]` | same | paginated query (cursor) | Planned | Pagination; filter by type; detail shows ledger legs; user can't open others' tx (rules test) |
| P4 | Send money (new) | — | Not in legacy; core wallet feature | n/a | `/transfer` (recipient email → amount → review → done) | same | `transfer` | Planned | Self-transfer rejected; unknown/unverified recipient generic error; currency mismatch; idempotency; concurrency; rate limit |
| P5 | Analytics | sidebar "Analytics" `#` | Dead link | ❌ | Merged into W5/W6 on dashboard | same | — | Planned | — |

## 4. Exchange

| # | Original feature | Source file | Existing behavior | Verdict | Web screen | Mobile screen | Firebase op | Status | Required tests |
|---|---|---|---|---|---|---|---|---|---|
| X1 | Currency converter | `Exchange.php`, `js/script.js`, `js/country-list.js` | Browser calls exchangerate-api with public key; shows amount × rate | ⚠️ (S20) | `/(tabs)/exchange` (converter mode) | same | read `fxRates/{base}`; refresh via `getExchangeQuote`-backed cache | Planned | Swap button; defaults USD→BDT; invalid amount blocked by Zod; stale-rate indicator |
| X2 | Currency list + flags | `js/country-list.js` | 160 codes incl. retired codes, BTC/ETH; flagcdn images | ⚠️ | Currency picker (searchable) | same | Static list in `packages/core/currencies.ts` | Planned | Only active ISO 4217 codes; retired codes removed; BTC/ETH **excluded** pending decision |
| X3 | Exchange between own wallets (new) | — | Legacy converter never moved money | n/a | `/exchange/review` (quote → confirm within 60 s) | same | `getExchangeQuote` → `executeExchange` | Planned | Expired quote rejected; quote reuse rejected; rounding floors; ledger balanced per currency |

## 5. Profile / settings

| # | Original feature | Source file | Existing behavior | Verdict | Web screen | Mobile screen | Firebase op | Status | Required tests |
|---|---|---|---|---|---|---|---|---|---|
| U1 | Edit name | `profile.php` | Updates without auth check | ⚠️ (S7) | `/settings/profile` | same | `updateDoc users/{uid}` (rules allow-list) | Planned | Rules: owner OK, other user denied, extra fields denied; Zod length |
| U2 | Change email | `profile.php` | Direct update, unverified | ⚠️ | `/settings/email` | same | re-auth → `verifyBeforeUpdateEmail`; Function syncs `users.email` on change | Planned | Requires re-auth; email unchanged until link clicked |
| U3 | Change password | `profile.php` | MD5 vs bcrypt → always fails | ❌ | `/settings/password` | same | `reauthenticateWithCredential` → `updatePassword` | Planned | Wrong current pw rejected; strength rules |
| U4 | Avatar upload | `profile.php` | Any file to web root (RCE) | ⚠️ critical (S4) | `/settings/profile` (file input) | same (`expo-image-picker`) | Storage `avatars/{uid}/…` → set `photoPath` | Planned | Storage rules: type/size/owner; picker permissions denied path |
| U5 | Edit profile (alt) | `edit.php` | Includes missing files | ❌ dead | — | — | — | Won't build | — |
| U6 | Settings page | sidebar "Settings" `#` | Dead link | ❌ | `/(tabs)/settings` | same | — | Planned | All items navigate |

## 6. Admin

| # | Original feature | Source file | Existing behavior | Verdict | Web screen | Mobile screen | Firebase op | Status | Required tests |
|---|---|---|---|---|---|---|---|---|---|
| D1 | Admin registration | `adminreg.php` | Public, MD5, type from POST | ⚠️ critical (S6) | — (removed) | — | `scripts/set-admin.ts` (CLI, service account) | Planned | Script sets claim; no client path can |
| D2 | Admin login | `admin-login.php` | MD5 match | ⚠️ | Normal sign-in; admin area shown if claim | same | `token.admin` | Planned | Non-admin can't reach `/admin` (guard + rules + Function) |
| D3 | User list | `index.php` | Unauthenticated `SELECT *` | ⚠️ (S5) | `/admin/users` (**web-first**; hidden on mobile tabs) | Reachable via deep link only | `adminListUsers` | Planned | Non-admin gets `permission-denied` |
| D4 | Add / edit / delete user modals | `index.php` modals | UI only, no handlers | 🎭 | `/admin/users/[uid]`: suspend/unsuspend, credit wallet | same | `adminSetUserStatus`, `adminCreditWallet` | Planned | Audit log written; idempotent credit |
| D5 | `admin/home.html` | — | Static template + bundled libs | 🎭 | Dropped | — | — | Won't build | — |

## 7. Dropped on purpose

| Item | Reason |
|---|---|
| Investments (W7) | Fake data with third-party logos; no product behind it |
| Cashback stat | No cashback concept exists |
| Card PAN / expiry / CVV display | Never store or show card data |
| `edit.php`, `Untitled-1.php`, `cry.php`, `gh.js`, `styl.css`, `admin/home.html` | Dead or empty |
| BTC/ETH as wallet currencies | Crypto custody is a different product and regulatory scope. Kept out until you decide (open question in `IMPLEMENTATION_PLAN.md`) |


## 8. v1.0 build status

Every **Planned** row above is **Implemented** in v1.0 except: `W4` (add wallet is automatic on first exchange; `createWallet` callable exists, no dedicated screen), `W5` cashback (dropped), `U2` change email and `U4` avatar upload (callable/rules ready, screens not built), `D3/D4` admin screens (callables ready; use the Functions shell or a script).

### New features added after the legacy review

| # | Feature | Screen (web + mobile) | Backend | Tests | Status |
|---|---|---|---|---|---|
| N1 | Request money | `/request` | `requestMoney`, `respondRequest` | validation | ✅ |
| N2 | Mobile recharge (GP, Robi, Banglalink, Airtel, Teletalk) | `/recharge` | `recharge` | operator detection, range | 🟡 demo settlement |
| N3 | Cash out via agent | `/cash-out` (Agent) | `cashOutAgent` | fee rounding | 🟡 demo settlement |
| N4 | Cash out from ATM (one-time code) | `/cash-out?mode=atm` | `createAtmCode`, `cancelAtmCode`, `expireAtmCodes`, `redeemAtmCode` | ৳500 steps | 🟡 demo settlement |
| N5 | Live BDT → USD / GBP / EUR | Home rates strip, `/exchange` | `refreshRates`, `scheduledRates`, `getExchangeQuote`, `executeExchange` | quote math | ✅ (live with API key) |
| N6 | Virtual card — Black, Purple/yellow, Red/gold | `/card` | `issueCard`, `updateCard`, `revealCard` | Luhn, rules | 🟡 demo issuer |
| N7 | BDT as home currency | everywhere | wallet `{uid}_BDT` at sign-up | formatting (lakh grouping) | ✅ |
| N8 | Light / dark / system theme | Settings | `users.theme` | — | ✅ |
| N9 | Google sign-in (web, Android, iOS) | `/(auth)/sign-in`, `/(auth)/sign-up`, `/complete-profile` | Firebase Auth Google provider + `registerPhone` | providers logic | ✅ |
| N10 | Sign in with Apple (iOS) | same | Firebase Auth Apple provider (nonce) | providers logic | ✅ |
| N11 | Link / re-auth with Google or Apple | Settings, Card reveal | `linkWithCredential`, `reauthenticateWithCredential` | — | ✅ |
