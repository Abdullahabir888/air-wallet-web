# Migration Plan — PHP/MySQL → Expo + Firebase

## 1. What there is to migrate

| Data | Exists? | Decision |
|---|---|---|
| Users (`user` table) | Only in whatever local MariaDB ran the app. Nothing in the repo. | **Default: fresh start.** Optional import below. |
| Admins (`adminn`) | Local only. MD5 hashes. | **Do not import.** Recreate admins with `set-admin.ts`. |
| Wallets / balances | **None.** Balances were hardcoded HTML or browser `localStorage`. | Nothing to migrate. |
| Transactions | **None.** Static HTML. | Nothing to migrate. |
| Avatars (`uploaded_img/`) | 3 photos in the public repo. | **Do not migrate.** Remove from repo (privacy). |
| Exchange API key | Hardcoded in `js/script.js`. | **Revoke now**, issue a new key into Secret Manager. |

## 2. Optional: import existing users

Only if real users exist in a local DB and you want them to keep their accounts.

1. Export: `SELECT id, name, email, password, status FROM user WHERE status = 'verified';`
2. Firebase Auth supports importing bcrypt hashes directly:
   ```bash
   firebase auth:import users.json --hash-algo=BCRYPT --project <id>
   ```
   Map `email → email`, `password (bcrypt) → passwordHash` (base64), `name → displayName`, `emailVerified: true`.
3. Because S1–S3 allowed takeover, **treat every legacy credential as possibly compromised**: after import, send each user a password reset and revoke refresh tokens.
4. Run `onUserCreated` equivalent as a one-off script to create `users/{uid}` and a zero-balance default wallet (the trigger does not fire on import).
5. Skip `notverified` rows — they re-register.

## 3. Repository plan

1. Tag the current state: `git tag legacy-php-v1 a990b88` and push the tag (keeps the old app recoverable).
2. **Purge personal data from history** (public repo): `uploaded_img/`, `profile-1.jpg`, `images/Redu.jpg`, the API key, the personal sender email. Use `git filter-repo`, then force-push. Coordinate if anyone else has clones.
3. Rebuild on a branch `rebuild/expo-firebase`; merge to `main` once Phase 3 (auth + wallet) is green.
4. Keep the legacy code out of the new tree. If reference is needed, it lives under the `legacy-php-v1` tag only.

## 4. Cut-over

There is no production traffic to protect (no hosting config, no real balances), so this is a **replace**, not a parallel run.

| Step | Gate |
|---|---|
| 1. Firebase projects `air-wallet-dev` and `air-wallet-prod` created (Blaze plan needed for Functions + Secret Manager) | You confirm billing |
| 2. Rules, indexes, Functions deployed to dev | Rules + Functions tests pass in CI against emulators |
| 3. Web preview on Vercel (dev project) | Smoke tests pass |
| 4. Internal Android/iOS builds via EAS (`preview` profile) | Manual QA checklist signed off |
| 5. Prod deploy | Security checklist in `SECURITY_AUDIT.md` baseline all ✅ |
| 6. Old host (if any) taken down; repo README points to new app | — |

## 5. Rollback

- Web: Vercel instant rollback to previous deployment.
- Functions: redeploy previous tagged build (`git checkout <tag> && firebase deploy --only functions`).
- Rules: rules are versioned in git; redeploy previous file.
- Data: ledger is append-only; a bad money Function is fixed forward with `REVERSAL` transactions, never by editing balances.
