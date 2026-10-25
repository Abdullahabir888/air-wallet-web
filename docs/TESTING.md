# Testing

## Automated

| Suite | Where | Run | Count |
|---|---|---|---|
| Money math, currencies, fees, BD operators | `packages/core` | `npm test -w @air-wallet/core` | 10 |
| Shared Zod schemas (auth, every money input) | `packages/validation` | `npm test -w @air-wallet/validation` | 9 |
| Ledger balancing, merge, idempotency hash, FX quotes, demo card Luhn | `functions/test/logic.test.ts` | `npm test --prefix functions` | 10 |
| App helpers, accessible Button, device detection, sign-in method logic | `apps/wallet/src/__tests__` | `npm test -w @air-wallet/app` | 12 |
| Firestore security rules (allow + deny per rule) | `functions/test/rules.test.ts` | `npm run test:rules` (needs Java + emulator) | 11 |

`npm test` runs everything except rules; CI runs rules too.

### Verified while building v1.0
- `npm run typecheck` — clean (app, core, validation, functions)
- Unit tests — 41 passing
- Functions bundle builds; all 24 functions export
- `expo export --platform web` — builds; sign-in and the real logo, action grid, tab icons and card render in light and dark with no console errors
- **Not run in the build sandbox:** rules tests and end-to-end flows (the Firestore emulator download was blocked by the sandbox network). Run `npm run test:rules` locally or let CI run it.

## What to add next (priority order)
1. **Functions integration tests on the emulator** — transfer happy path, insufficient balance, idempotent replay, **two parallel transfers draining one wallet** (must leave balance ≥ 0), exchange with expired quote, ATM create → cancel → balance restored.
2. **E2E** — Playwright on the web build (sign up → admin credit → send → exchange → activity); Maestro flows for Android/iOS.
3. Snapshot/visual tests for the three card styles in both themes.

## Manual QA checklist

Run on **web (Chrome + Safari), Android and iOS**, in **light and dark**.

**Auth**
- [ ] Sign up with weak password → inline errors; mismatched confirm → error
- [ ] Sign up with a mobile already used → clear error
- [ ] Unverified user can't reach Home; "Resend" has 60-s cooldown; "I've verified" works after clicking the link
- [ ] Wrong password and unknown email show the **same** message
- [ ] Forgot password shows the same message for existing and unknown emails
- [ ] Session survives app restart (native) and page reload (web)
- [ ] **Google** on web, Android and iPhone: new user → "Almost there" (name prefilled, add mobile) → Home; returning user → straight to Home
- [ ] **Apple** on iPhone (shown only on iOS): with "Hide my email" and with real email; name saved on first sign-in
- [ ] Cancelling the Google/Apple sheet shows no error
- [ ] Google with an email that already has a password → clear message to sign in and link from Settings
- [ ] Settings → Sign-in methods lists linked methods; Link Google/Apple works; "Change password" hidden for social-only accounts
- [ ] Social-only account: card "Show details" asks to confirm with Google/Apple (not a password)
- [ ] Sign out then Google again → account chooser appears (not silent reuse)

**Money**
- [ ] Send to email and to mobile; both balances update live on both devices
- [ ] Send more than balance → blocked before review; send to self → error
- [ ] Double-tap "Send now" / retry after airplane mode → money moves **once**
- [ ] Request → payer sees it live → Pay → status PAID, both balances update; Decline; Cancel
- [ ] Pay bill and recharge: limits, review, receipt, appears in Activity under Bills
- [ ] Recharge: operator auto-detected from 013/017/018/019/014/016/015
- [ ] Cash out agent: fee = 1.85% rounded up, total deducted correct
- [ ] ATM: only ৳500 steps; code + countdown; Cancel returns amount + fee; second code blocked while one active; after 15 min code expires and money returns
- [ ] Exchange: rates show Live (or Demo without key); lock rate → 60-s countdown → confirm; wait 60 s → expired; new foreign wallet appears on Home

**Card**
- [ ] Get card → black by default; switch to Purple and Red; style persists after restart
- [ ] Show details asks for password if signed in > 5 min ago; hides after 30 s; copy works
- [ ] Freeze → card dims, toggles disabled; Unfreeze restores

**Phone-aware layout**
- [ ] Samsung: large greeting zone on Home; Settings → This device says "Samsung · One UI layout"
- [ ] Pixel / other Android: tab bar above gesture bar and above 3-button nav (no overlap)
- [ ] iPhone with Dynamic Island and with notch: nothing under the cutout; tab bar clears the home indicator
- [ ] iPhone on iOS 26+: tab bar is real Liquid Glass (content refracts underneath, reacts to touch); on iOS 18 it shows the frosted-blur fallback
- [ ] iPhone: last list row can scroll fully above the floating glass bar
- [ ] Small phone (≤ 360 dp): tiles shrink, labels don't wrap
- [ ] Tablet / unfolded Fold: 8 actions in one row

**General**
- [ ] Tap balance hides/shows it; preference persists
- [ ] Theme: System / Light / Dark switch instantly
- [ ] Screen reader (VoiceOver/TalkBack) announces buttons, tabs and amounts
- [ ] Layout OK on small phones (iPhone SE) and desktop web (content centered, max 560 px)
- [ ] Offline: errors are human-readable, no crashes
