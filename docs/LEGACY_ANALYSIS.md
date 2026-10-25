# Legacy Analysis — Air Wallet (PHP)

Source: `github.com/Abdullahabir888/air-wallet` · single commit `a990b88` "first commit" (2023-03-22) · analyzed 2026-10-25.

Every claim below was traced in code. "Static" means hardcoded HTML/JS with no server logic behind it.

## 1. Bottom line

The legacy app is a **working auth flow wrapped around a static dashboard mockup**.

- **Real (server-backed):** sign-up, email OTP verification, login, logout, forgot/reset password, partial profile update, admin user list.
- **Client-only:** "Fast Payment" balance deductions (stored in `localStorage`), currency converter (calls a third-party API from the browser).
- **Fake (static HTML):** card balances, card numbers/expiry/CVV, income/expense/cashback stats, investments, recent transactions, BTC/ETH chart.
- **Not there at all:** wallets table, transactions table, transfers, deposits, withdrawals, any ledger.

So the rebuild is not a port. It is a real wallet built to the legacy app's feature intent, with the auth flows carried over and hardened.

## 2. Stack and runtime

| Item | Finding | Where |
|---|---|---|
| Language | PHP 8 (dump says PHP 8.0.3, MariaDB 10.4.18) | `user.sql` header |
| DB access | `mysqli` procedural, string-concatenated SQL | all PHP |
| DB connection | `localhost`, user `root`, **empty password**, DB `wallet` | `connection.php` (`$con`), `config.php` (`$conn`) — two separate connection files |
| Email | PHP `mail()` with hardcoded sender `shahiprem7890@gmail.com` | `controllerUserData.php` |
| Composer | `phpmailer/phpmailer ^6.6` installed in `vendor/` but **never used** | `composer.json`, no `use PHPMailer` anywhere |
| CSS | Bootstrap 4.5.2 (auth pages), Bootstrap 5.1.3 (`edit.php`), inline `<style>` blocks, `style.css`, `styl.css` | — |
| JS | Chart.js 3.9.1 (CDN), vanilla JS, jQuery (admin) | `home.php`, `wallet.js`, `index.php` |
| External API | exchangerate-api.com v6, **API key hardcoded in client JS** | `js/script.js` |
| Flags | flagcdn.com images | `Exchange.php`, `js/script.js` |
| README | One line, UTF-16 encoded: "air-wallet" | `README.md` |
| `.fleet/run.json` | Empty JetBrains Fleet config | — |

## 3. Database

### 3.1 What the code actually uses

| Table | Columns used in code | Used by |
|---|---|---|
| `user` | `id`, `name`, `email`, `password` (bcrypt), `code` (OTP int, 0 = none), `status` (`notverified`/`verified`), `image` (filename) | `controllerUserData.php`, `home.php`, `Exchange.php`, `wallet.php`, `profile.php`, `index.php` |
| `usertable` | `code` | `controllerUserData.php` forgot-password branch only (**bug**, see §6) |
| `adminn` | `name`, `email`, `password` (MD5), `type` | `admin-login.php`, `adminreg.php` |

### 3.2 What the shipped schema says

`user.sql` defines **only** `usertable` (`id`, `name`, `email`, `password`, `code mediumint`, `status text`) in a DB named `userform`.

Drift:
- Code connects to DB `wallet`, not `userform`.
- Code queries table `user`, not `usertable`.
- `image` column is used by `profile.php`/`home.php` but is in no schema.
- `adminn` table has no schema at all.

**Conclusion:** the SQL dump is stale. The real schema must be inferred from code (§3.1). No wallet, balance, card or transaction tables exist anywhere.

## 4. Feature walk-through (traced)

### 4.1 Sign-up — `signup-user.php` → `controllerUserData.php` (`signup`)
1. Inputs: name, email, password, confirm.
2. Checks confirm match; checks email not already in `user`.
3. `password_hash(PASSWORD_BCRYPT)`; `code = rand(999999, 111111)` (6-digit); `status = notverified`.
4. INSERT, then `mail()` the code.
5. On mail success: stores email, **plaintext password**, and id in session → `user-otp.php`.
6. If `mail()` fails, the row is already inserted; user sees "Failed while sending code!" and is stuck (re-signup blocked by duplicate-email check; login routes them to OTP page but no resend exists).
- No password strength rules. No name/email validation beyond HTML `required`/`type=email`.

### 4.2 Email OTP verification — `user-otp.php` (`check`)
- Looks up `SELECT * FROM user WHERE code = $otp` — **by code only, not by the session's email**.
- On match: sets that row's `code=0`, `status='verified'`, sets session email to **the matched row's email**, → `home.php`.
- No expiry, no attempt limit, no resend.

### 4.3 Login — `login-user.php` (`login`)
- Email lookup → `password_verify`.
- Verified → session (email, plaintext password, id) → `home.php`. Unverified → `user-otp.php`.
- Distinct messages for "not a member" vs "incorrect password" (user enumeration).
- No `session_regenerate_id`, no rate limit, no CSRF token.

### 4.4 Forgot / reset password — `forgot-password.php` → `reset-code.php` → `new-password.php` → `password-changed.php`
- `check-email`: confirms email exists in `user`, then writes the code to **`usertable`** (wrong table), then emails it.
- `check-reset-otp`: `SELECT * FROM user WHERE code = $otp` — again by code only.
- `change-password`: updates `user` password for `$_SESSION['email']`, sets `code=0`.
- Because the code goes to the wrong table, the emailed code normally never matches. The flow is **broken for honest users** and **exploitable** (§6).

### 4.5 Session gate — `home.php`, `Exchange.php`, `wallet.php`
- Require session email + password; then reload user; unverified → OTP page; verified with `code != 0` → reset page.
- `header('Location: …')` is never followed by `exit`, so the page body still renders and is sent.
- `wallet.php` is just this gate with no body.

### 4.6 Logout — `logout-user.php`
- `session_unset` + `session_destroy` → login. Works.

### 4.7 Dashboard — `home.php` + `wallet.js` + `style.css`
- Top nav: logo, theme toggle (light/dark via `.dark-theme` class, not persisted), avatar (`$fetch_info['image']` used as raw `src`), name, links to Profile/Logout.
- Sidebar: Dashboard, Exchange (real link), Transaction / Analytics / Help Center / Settings (all `href="#"`).
- **Cards:** 3 hardcoded cards (BTC $452,198; ETH $96,734; BTC $714,384) with the user's name, hardcoded expiry (08/23, 08/24) and a 3-digit number that reads as a CVV. Clicking a card marks it "Active" in `localStorage`.
- **Stats:** Income / Expenses / Cashback / Income — all static numbers and percentages.
- **Fast Payment:** 7 bill categories (Training $50, Internet $40, Gas $190, Movies $35, Education $999, Electricity $109, Food $399). `wallet.js` re-renders them; on click + `confirm()`, it subtracts the amount from the active card's **displayed** balance and saves it to `localStorage`. Nothing reaches the server. Balance can go negative. HTML also calls an undefined `confirmAction()`; `wallet.js` calls undefined `cardActive()` in one branch.
- **Chart:** BTC/ETH monthly line chart, hardcoded Jan–Nov data.
- **Investments:** Unilever, Tesla, Monster, McDonald's — each a static $20,033.
- **Recent transactions:** Music −$20, Shopping −$899, Restaurant −$50, Games −$64, Pharmacy −$30, Fitness −$45 — static.

### 4.8 Currency converter — `Exchange.php` + `js/country-list.js` + `js/script.js`
- Amount input, From (default USD) / To (default BDT) selects populated from a 160-code map, swap button, flag images.
- Browser calls `https://v6.exchangerate-api.com/v6/<KEY>/latest/<FROM>` and shows `amount × rate`, 2 decimals.
- Display only: **does not touch any balance**. No amount validation (`"abc"` → `NaN`).
- List includes `BTC`/`ETH` and several retired codes (`EEK`, `LTL`, `LVL`, `CYP`, `MTL`, `SKK`, `ZWD`, `VEF`, `BYR`, `MRO`, `STD`, `ZMK`); whether the API returns rates for these is **unverified** — the UI falls back to "Something went wrong" on error.

### 4.9 Profile — `profile.php`
- Loads with `@include 'config.php'` and `$_SESSION['id']` — **no login check**.
- Updates name and email directly (no re-verification of new email, no uniqueness check).
- Password change: compares `md5(old)` to the stored **bcrypt** hash (which is sent to the browser in a hidden field). They never match, so password change **always fails**. If it ever passed, it would store MD5 and break login.
- Avatar: accepts any file ≤ 2 MB, saved to `uploaded_img/` under the **original filename**; only the HTML `accept` attribute restricts type.
- Falls back to `images/default-avatar.png`, which does not exist.

### 4.10 Dead / broken files
| File | State |
|---|---|
| `edit.php` | Includes `db_conn.php`, `php/User.php` — both missing. Uses `fname`/`username`/`pp` fields that exist nowhere. Dead. |
| `Untitled-1.php` | Scratch sidebar markup. Dead. |
| `cry.php`, `gh.js` | Empty (0 bytes). |
| `styl.css` | Unreferenced. |

### 4.11 Admin
- `adminreg.php`: **public** form, creates rows in `adminn` with MD5 passwords and `type` from the POST body. Redirects to missing `login_form.php`.
- `admin-login.php`: MD5 email+password match; `type == 'admin'` → `index.php`. Reads undefined `$_POST['name']`.
- `index.php`: **no auth check**. Lists every `user` row's name and email. Add/Edit/Delete buttons open modals that do nothing (no handlers, no backend). Also shows 5 static demo rows.
- `admin/home.html`: static template ("Manage Users") plus bundled third-party libs (`baguetteBox`, `news-ticker`), PSDs, zip files and OneNote files.

## 5. Assets worth keeping

| Asset | Path | Use in rebuild |
|---|---|---|
| Logo | `logo.png` (34 KB), `images/logo.png` (6 KB) | Brand mark — needs SVG redraw for crisp scaling |
| Card brand marks | `visa.png`, `master card.png`, `american-express.png` | **Do not reuse** — third-party trademarks; use neutral card art |
| Currency icons | `BTC.png`, `ETH.png`, `EURO.png`, `sterling.png` | Replace with an icon set or a currency code chip |
| Card chip | `card chip.png` (66 KB) | Redraw as SVG |
| Company logos | `images/tesla.png`, `monster.png`, `mcdonalds.png`, `uniliver.png` | **Do not reuse** — trademarks; investments feature is fake anyway |
| Photos | `profile-1.jpg`, `images/Redu.jpg`, `uploaded_img/*` | **Do not reuse** — appear to be real people's uploaded photos |
| Palette | Primary `#6665ee` / `#675AFE`, gradient `#6190E8 → #65C7F7`, Poppins font, Material Symbols | Seed for the new design system |

## 6. Security headline (full detail in `SECURITY_AUDIT.md`)

Two critical paths give **full account takeover without any credentials**:

1. **Reset with code `0`.** Verified users have `code = 0`. On `reset-code.php`, entering `0` matches every verified user; the first row's email goes into the session; `new-password.php` then sets that user's password.
2. **SQL injection in OTP fields.** `$otp` is escaped but used unquoted (`WHERE code = $otp`), so `0 OR 1=1` passes `mysqli_real_escape_string` untouched. The `type=number` input is client-side only.

Plus: unauthenticated admin user list, open admin registration, arbitrary file upload into a web-served folder (likely remote code execution), stored/reflected XSS, hardcoded API key, root DB with no password.

**The legacy data should not be migrated as-is** — see `MIGRATION_PLAN.md`.
