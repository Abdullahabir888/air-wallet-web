# Admin panel

One admin panel, built into the same Expo app. It runs on **web, Android and iOS** from the same code, so all three are always identical.

## Who sees it

Accounts with the `admin` custom claim. Nobody else.

- Locally: `abir@demo.airwallet` is an admin after `npm run seed`.
- In production, grant it with the service-account script (never from the app):

  ```bash
  GOOGLE_APPLICATION_CREDENTIALS=sa.json node functions/scripts/set-role.mjs --project <id> someone@example.com admin
  ```

  The person signs in again to pick up the new role.

Admins get an **Admin** chip on Home and an **Open admin panel** button in Settings.

Hiding the screens is only convenience. The real lock is on the server: Firestore rules only let admins read other people's data, and every admin Cloud Function checks the claim again.

## What it does

| Screen | What you can do |
|---|---|
| Overview | Users, suspended accounts, transactions and Taka moved in the last 24 h. Latest transactions, newest users, recent admin actions |
| Users | Search by name, email, mobile or user ID. Filter active / suspended. Exact lookup for older accounts |
| User | Profile, wallet balances, card status, their transactions, admin history. **Suspend / reactivate**. **Add money** to any of their wallets with a reason |
| Transactions | Every transaction on the platform, filter by type, tap for details |
| Audit log | Every admin action, card reveal, ATM redemption and nightly ledger check |

Rules the server enforces:

- An admin can't suspend their own account.
- Credits come from the system funding wallet, need a reason (3+ characters), max ৳10,00,000, and are logged with the admin's name.
- Suspending signs the user out on every device and blocks all money operations.

## How it stays in sync

Every list and number is a live Firestore listener, the same way the user screens work. Nothing polls (except the user counts, which refresh every 30 s).

| Admin does this | Everywhere else, instantly |
|---|---|
| Suspends a user | That user's app switches to "Your account is suspended" on every device |
| Reactivates a user | The lock screen goes away |
| Credits a wallet | The user's balance and Activity update; the audit log and overview update for all admins |
| Any user sends / pays | It appears in the admin overview and Transactions list |

## Deploying it

The panel needs three new Firestore indexes (already in `firestore.indexes.json`):

```bash
npm run deploy:backend   # rules, indexes and functions
```

Indexes take a few minutes to build. Until then the filtered lists (by type, by status, per-user audit) show an error in the console.

## Testing

- `npm test`: admin search, audit wording, who-sent-to-whom, the live lock screen and the admin route guard.
- `npm run test:rules`: on the emulator, checks every query the panel makes is allowed for admins and denied for users, and that admins still can't write money data directly.
