# Security Audit — Legacy Air Wallet

Method: manual source review of every PHP/JS file in commit `a990b88`. No live instance was tested; findings are from code paths. Severity uses a plain Critical / High / Medium / Low scale based on impact × ease.

## Summary

| # | Finding | Severity | File(s) |
|---|---|---|---|
| S1 | Password reset accepts code `0` → take over any verified account | **Critical** | `controllerUserData.php`, `reset-code.php`, `new-password.php` |
| S2 | SQL injection in OTP checks (unquoted numeric) | **Critical** | `controllerUserData.php` (`check`, `check-reset-otp`) |
| S3 | OTP verified by code alone, not bound to the user | **Critical** | `controllerUserData.php` (`check`, `check-reset-otp`) |
| S4 | Unrestricted avatar upload into web root under original filename | **Critical** | `profile.php` |
| S5 | Admin user list has no authentication | **High** | `index.php` |
| S6 | Anyone can register as admin | **High** | `adminreg.php` |
| S7 | Profile endpoint has no login check; email change unverified | **High** | `profile.php` |
| S8 | Stored XSS via name / image filename | **High** | `home.php`, `profile.php`, `index.php` |
| S9 | Reflected XSS in auth forms and `edit.php` | Medium | `login-user.php`, `signup-user.php`, `forgot-password.php`, `edit.php` |
| S10 | Bcrypt hash sent to browser in hidden field | Medium | `profile.php` |
| S11 | MD5 unsalted passwords for admins | High | `adminreg.php`, `admin-login.php` |
| S12 | Plaintext password kept in `$_SESSION` | Medium | `controllerUserData.php` |
| S13 | Redirect without `exit` → protected page body still sent | Medium | `home.php`, `Exchange.php`, `wallet.php`, `user-otp.php`, `reset-code.php`, `new-password.php` |
| S14 | No CSRF tokens on any form | Medium | all forms |
| S15 | No rate limiting / lockout on login or OTP | High | `controllerUserData.php` |
| S16 | OTP never expires; `rand()` not a CSPRNG | Medium | `controllerUserData.php` |
| S17 | User enumeration via distinct login / reset errors | Low | `controllerUserData.php` |
| S18 | No session ID regeneration on login (session fixation) | Medium | `controllerUserData.php` |
| S19 | DB as `root` with empty password | High (if deployed) | `connection.php`, `config.php` |
| S20 | Third-party API key hardcoded in client JS | Medium | `js/script.js` |
| S21 | Balance logic entirely client-side (`localStorage`) | High (by design) | `wallet.js` |
| S22 | Card data shown in UI includes CVV-like field | Low (fake data) | `home.php` |
| S23 | No security headers, no HTTPS enforcement, CDN scripts mostly without SRI | Low | all pages |
| S24 | Personal photos and personal email committed to a public repo | Medium (privacy) | `uploaded_img/`, `profile-1.jpg`, `controllerUserData.php` |

---

## Details

### S1 — Reset with code `0` (Critical)
**Trace.** After verification, a user's `code` is set to `0` (`check` branch). The reset step runs `SELECT * FROM user WHERE code = $otp_code`. Submitting `0` returns every verified user; the first row's email is placed in `$_SESSION['email']`. `change-password` then updates the password for that email.
**Impact.** Attacker sets a new password on an arbitrary (first-row) verified account. Repeating with S2 lets them pick the victim.
**Fix in rebuild.** Use Firebase Auth's own reset (single-use, expiring, link bound to the account). No custom reset codes.

### S2 — SQL injection in OTP checks (Critical)
**Trace.** `$otp_code = mysqli_real_escape_string($con, $_POST['otp'])` then `WHERE code = $otp_code` (no quotes). Escaping only affects quotes/backslashes, so `0 OR email='victim@x.com'` is injected verbatim. The HTML `type="number"` is bypassed by any HTTP client.
**Impact.** Targeted account takeover via S1; data extraction via boolean/time-based injection.
**Fix.** No SQL in the rebuild. All server input validated with Zod schemas; Firestore queries built with typed SDK calls.

### S3 — OTP not bound to user (Critical)
**Trace.** Both OTP checks search all users by code. The sign-up `check` branch then sets the session email to the **matched** user, not the one who signed up.
**Impact.** A newly registered attacker who guesses or injects another user's code is logged in as that user (session password is already set from their own signup, so `home.php` lets them in).
**Fix.** Firebase email verification links. If numeric OTP is ever required: store a hash keyed by `uid`, 10-minute TTL, 5 attempts, server-side compare.

### S4 — Arbitrary file upload (Critical)
**Trace.** `move_uploaded_file($tmp, 'uploaded_img/'.$_FILES['update_image']['name'])`. Only check is size ≤ 2 MB. No extension, MIME or content check; `accept=` is client-side.
**Impact.** Upload `shell.php` → request `/uploaded_img/shell.php` → remote code execution on a typical Apache/PHP setup. Also path/overwrite issues with chosen filenames.
**Fix.** Avatars go to Cloud Storage at `avatars/{uid}/{random}.webp`. Storage rules: owner-only write, `image/(png|jpeg|webp)`, ≤ 2 MB. Optionally re-encode in a Function. Never serve user files from an executable origin.

### S5 — Unauthenticated admin list (High)
`index.php` runs `SELECT * FROM user` with no session check and prints names and emails. Anyone with the URL gets the user list.
**Fix.** Admin views gated by Firebase custom claim `admin: true`, enforced in Firestore rules **and** in every admin Function.

### S6 — Open admin registration (High)
`adminreg.php` is public and inserts `type` from the POST body.
**Fix.** No self-service admin. Claims set only by a CLI script run with service-account credentials, or by an existing admin through an audited Function.

### S7 — Profile without auth (High)
`profile.php` never checks login; it trusts `$_SESSION['id']`. Email can be changed to anything without verification or uniqueness checks, which breaks the "email = identity" assumption elsewhere.
**Fix.** Firebase `verifyBeforeUpdateEmail`; display-name updates via owner-only Firestore rule with field allow-list.

### S8 / S9 — XSS (High / Medium)
- Stored: `name` printed raw in `home.php` (3×) and in admin `index.php`; `image` printed raw as an unquoted `src=` attribute in `home.php`.
- Reflected: `value="<?php echo $email ?>"` on login/signup/forgot forms; `$_GET['error']`/`$_GET['success']` echoed in `edit.php`.
**Fix.** React escapes text by default. Never use `dangerouslySetInnerHTML`. Validate `displayName` length and characters with Zod.

### S10 — Password hash in page (Medium)
`<input type="hidden" name="old_pass" value="<bcrypt hash>">` exposes the hash for offline cracking.
**Fix.** Re-authenticate with `reauthenticateWithCredential` before `updatePassword`. Hashes never leave Firebase Auth.

### S11 — MD5 admin passwords (High)
Unsalted MD5, trivially cracked. **Fix:** admins are normal Firebase Auth users + claim.

### S12 — Password in session (Medium)
`$_SESSION['password'] = $password` (plaintext) and used as a login flag. Session store compromise = credential leak. **Fix:** Firebase ID tokens; nothing secret kept client-side beyond what the SDK manages.

### S13 — Missing `exit` after redirect (Medium)
`header('Location: …')` without `exit`. The rest of the script runs and the HTML is sent. Here the dashboard data is static, so impact is limited, but `user-otp.php`/`reset-code.php`/`new-password.php` forms are reachable without a session.
**Fix.** Route guards in Expo Router layouts **and** server-side auth on every Function (never trust the client guard).

### S14 — No CSRF (Medium)
Every state-changing form is cookie-authenticated with no token. **Fix:** Callable Functions use bearer ID tokens, not cookies, so classic CSRF does not apply. Web build sets strict CSP and `SameSite` where cookies exist.

### S15 / S16 — Brute force and weak OTP (High / Medium)
6-digit code, no expiry, no attempt counter, `rand()` (not cryptographically secure). Login has no throttling.
**Fix.** Firebase Auth built-in abuse protection; App Check on Functions; per-uid rate limits on money operations (`TRANSFER` ≤ N/min) stored in Firestore.

### S17 — User enumeration (Low)
Login says "not yet a member" vs "incorrect password"; reset says "email does not exist". **Fix:** Enable Firebase **email enumeration protection**; UI shows one generic message.

### S18 — Session fixation (Medium)
No `session_regenerate_id(true)` on login. **Fix:** N/A with token auth.

### S19 — Root DB, empty password (High if deployed)
**Fix:** N/A in Firebase; Functions use least-privilege service account.

### S20 — Exposed API key (Medium)
exchangerate-api key is in `js/script.js` and the public repo. **Action now:** rotate/revoke that key. **Fix:** key stored in Secret Manager via `defineSecret`, used only in the `exchange` Function.

### S21 — Client-side balances (High)
`wallet.js` stores balances in `localStorage`; any user can set any value from DevTools. Negative balances allowed.
**Fix.** Balances live in `wallets/{id}`, writable **only** by Functions via Firestore transactions; integer minor units; ledger entries immutable; rules deny all client writes.

### S22 — Card fields (Low)
Hardcoded 3-digit "CVV" and expiry beside the user's name. Fake, but teaches a bad pattern.
**Fix.** The rebuild stores no card PAN/CVV. Wallet "cards" are visual representations of currency wallets only.

### S23 — Headers / SRI (Low)
**Fix.** Vercel `vercel.json` headers: CSP, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`.

### S24 — Personal data in repo (Medium)
`uploaded_img/` holds what look like real personal photos; a personal Gmail is hardcoded as sender.
**Action now:** remove from the public repo and purge history (`git filter-repo`), since the repo is public.

---

## Rebuild security baseline (applies to every feature)

1. **Server owns money.** Every balance change goes through a Cloud Function → Firestore transaction → double-entry ledger. Clients read only.
2. **Integers only.** Amounts in minor units (`int`), currency per wallet. No floats anywhere in money paths.
3. **Idempotency.** Every money call carries a client-generated `idempotencyKey`; the Function stores it and returns the original result on retry.
4. **Validation twice.** Shared Zod schemas in `packages/validation`, run in the form and again in the Function.
5. **Least privilege rules.** Firestore/Storage rules default-deny; owner-read on own docs; no client writes to `wallets`, `ledger`, `transactions`, `idempotency`, `rateLimits`, `auditLog`.
6. **App Check enforced** on callable Functions (web: reCAPTCHA Enterprise; Android: Play Integrity; iOS: App Attest). Debug tokens only in dev.
7. **Re-auth for sensitive actions** (password, email change, large transfers).
8. **Audit log** for admin actions and failed money operations.
9. **Secrets** only in Secret Manager. `.env` files hold public Firebase web config only.
10. **Tests** for every rule (`@firebase/rules-unit-testing`) and every money Function (emulator), including concurrency (two simultaneous transfers draining one wallet).


## Rebuild status (v1.0)

| # | Legacy issue | How v1.0 handles it |
|---|---|---|
| S1–S3 | Reset/OTP takeover, SQLi | Firebase Auth links (no custom codes); no SQL; Zod on every input |
| S4 | File upload RCE | Storage rules: owner path, image types, ≤ 2 MB, safe filename; served from Storage, never executed |
| S5–S6, S11 | Open admin, MD5 | Admin = custom claim set only by `set-role.mjs`; checked in every admin Function + rules |
| S7, S10, S12 | Profile, hash leak, password in session | Rules allow-list for profile fields; re-auth for password change and card reveal; tokens only |
| S8–S9 | XSS | React escaping; no `dangerouslySetInnerHTML`; CSP header on web |
| S13–S14, S18 | Redirect without exit, CSRF, fixation | Server checks auth on every call; bearer tokens, not cookies |
| S15–S17 | Brute force, weak OTP, enumeration | Firebase abuse protection + email enumeration protection; same message for unknown email; per-user rate limits on money ops; ATM code uses `crypto.randomInt`, constant-time compare, 5-attempt burn |
| S19–S20 | Root DB, exposed key | No DB credentials; FX key in Secret Manager, server-side only |
| S21 | Client-side balances | Double-entry ledger in Firestore transactions; clients cannot write money collections; idempotency keys |
| S22 | CVV on screen | Card secrets in a collection no client can read; reveal needs recent login, auto-hides after 30 s, audited |
| S23 | Headers | `vercel.json` sets CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy |
| S24 | Personal data in repo | Not migrated; purge steps in MIGRATION_PLAN.md |

**Still to do before real money:** native App Check (then `APP_CHECK_ENFORCE=true`), KYC, AML monitoring, MFS licensing/partner, penetration test, rules tests green in CI.
