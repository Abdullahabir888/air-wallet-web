# Cloud Functions API

All functions run in **asia-south1**. Callables are invoked from the app with `httpsCallable` (see `apps/wallet/src/lib/api.ts`).

**Every callable:**
- requires a signed-in user (`unauthenticated` otherwise)
- requires a **verified email** for anything that moves money (`failed-precondition`)
- rejects suspended accounts (`permission-denied`)
- validates input with the shared Zod schema in `packages/validation` (`invalid-argument`)
- enforces App Check when `APP_CHECK_ENFORCE=true`

**Every money call** also takes an `idempotencyKey` (16–64 chars, `[A-Za-z0-9_-]`). Retrying with the same key returns the first result; reusing a key for a different request fails with `failed-precondition`. Money calls are rate-limited to 10 per minute per user (`resource-exhausted`).

Amounts are **integers in minor units** (paisa / cents / pence). `250000` = ৳2,500.00.

## Account

| Function | Input | Returns | Notes |
|---|---|---|---|
| `onUserCreated` | *(Auth trigger)* | — | Creates `users/{uid}` (fill-only) and the `{uid}_BDT` wallet |
| `registerPhone` | `{ phone, displayName? }` | `{ phone }` | Claims a unique BD mobile (`01XXXXXXXXX`). `already-exists` if taken. Email need not be verified |
| `createWallet` | `{ currency: 'USD'\|'GBP'\|'EUR'\|'BDT' }` | `{ walletId }` | Idempotent. Exchange also auto-creates the target wallet |

## Send & request

| Function | Input | Returns | Errors |
|---|---|---|---|
| `transfer` | `{ to, amountMinor, note?, idempotencyKey }` | `{ transactionId }` | `not-found` (no active account), `invalid-argument` (self), `failed-precondition` (insufficient balance) |
| `requestMoney` | `{ from, amountMinor, note? }` | `{ requestId }` | 20 per minute |
| `respondRequest` | `{ requestId, action: 'pay'\|'decline'\|'cancel', idempotencyKey? }` | `{ transactionId }` or `{ ok }` | Payer can pay/decline; requester can cancel. `idempotencyKey` required for `pay` |

`to` / `from` accept an email or a BD mobile number. Limits: ৳10 – ৳25,000 per transfer (`POLICY` in `packages/core/src/fees.ts`).

## Payments

| Function | Input | Returns | Settles to |
|---|---|---|---|
| `payBill` | `{ billerId, accountNumber, amountMinor, idempotencyKey }` | `{ transactionId }` | `system_BILLER_{id}_BDT` (demo) |
| `recharge` | `{ msisdn, operator: 'GP'\|'ROBI'\|'BL'\|'AIRTEL'\|'TT', connection: 'prepaid'\|'postpaid', amountMinor, idempotencyKey }` | `{ transactionId }` | `system_TELCO_{op}_BDT` (demo). ৳20 – ৳1,000 |
| `cashOutAgent` | `{ agentNumber, amountMinor, idempotencyKey }` | `{ transactionId, feeMinor, totalMinor }` | Agent wallet + `system_FEES_BDT`. Fee 1.85% (demo) |

## ATM cash-out

| Function | Input | Returns | Notes |
|---|---|---|---|
| `createAtmCode` | `{ amountMinor, idempotencyKey }` | `{ transactionId, codeId, code, expiresAtMillis, feeMinor }` | Holds amount + ৳15 fee in `system_HOLD_ATM_BDT`. ৳500 – ৳20,000 in ৳500 steps. One active code per user. Valid 15 min |
| `cancelAtmCode` | `{ codeId }` | `{ transactionId }` | Returns the hold to the user |
| `redeemAtmCode` | `{ phone, code, atmId }` | `{ transactionId }` | **ATM partner only** (`atmPartner` claim). Constant-time code check; code burned after 5 wrong attempts |
| `expireAtmCodes` | *(every 5 min)* | — | Releases expired holds |

## Exchange

| Function | Input | Returns | Notes |
|---|---|---|---|
| `refreshRates` | `{}` | `{ bdtPer, previous, source, fetchedAtMillis }` | Refreshes `fxRates/BDT` if older than 60 s. `source: 'demo'` when no API key |
| `scheduledRates` | *(every 15 min)* | — | Keeps rates warm |
| `getExchangeQuote` | `{ from, to, amountMinor }` | `{ quoteId, toAmountMinor, rate, source, expiresAtMillis }` | One side must be BDT. Valid 60 s. Result floored |
| `executeExchange` | `{ quoteId, idempotencyKey }` | `{ transactionId }` | `deadline-exceeded` if expired; quote is single-use |

`bdtPer.USD = "121.80"` means 1 USD = ৳121.80. Rates are decimal strings; quote math uses `decimal.js`, never floats.

## Virtual card (demo issuer)

| Function | Input | Returns | Notes |
|---|---|---|---|
| `issueCard` | `{}` | `{ cardId, created }` | One card per user. 9-prefix demo number (not on any network) |
| `updateCard` | `{ style?: 'black'\|'purple'\|'red', frozen?, onlineEnabled?, internationalEnabled? }` | `{ ok }` | Freeze/unfreeze is audited |
| `revealCard` | `{}` | `{ pan, cvv, expMonth, expYear }` | Requires sign-in within 5 min, else `unauthenticated` with `details.reauth = true`. Audited |

## Admin (custom claim `admin: true`)

| Function | Input | Returns |
|---|---|---|
| `adminCreditWallet` | `{ walletId, amountMinor, reason, idempotencyKey }` | `{ transactionId }` — the only way money enters in this build. Audited |
| `adminSetUserStatus` | `{ uid, status: 'active'\|'suspended' }` | `{ ok }` — suspending also revokes refresh tokens |
| `adminListUsers` | `{ after? }` | `{ users[], next }` — 50 per page |
| `reconcileLedger` | *(daily 03:00)* | Writes `ledger.mismatch` to `auditLog` if any wallet ≠ sum of its ledger entries |

## Ledger model (all money functions)

Each call runs **one Firestore transaction** that:
1. checks the idempotency record,
2. reads every wallet touched,
3. checks legs sum to **zero per currency** and no user wallet goes below 0,
4. updates balances, writes immutable `ledgerEntries` and a `transactions` header,
5. stores the idempotency record.

System wallets (`system_*`, `agent_*`) model settlement accounts and may go negative (e.g. FX liquidity, funding).
