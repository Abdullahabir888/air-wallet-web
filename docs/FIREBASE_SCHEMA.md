# Firebase Schema — Air Wallet (rebuild)

Design rules:
- **Money is server-owned.** Clients never write `wallets`, `transactions`, `ledgerEntries`. Only Cloud Functions (Admin SDK) do, inside Firestore transactions.
- **Integers only.** All amounts are `int` minor units (`balanceMinor`, `amountMinor`). Minor-unit exponent per currency comes from ISO 4217 (USD 2, BDT 2, JPY 0, KWD 3).
- **Double-entry.** Every transaction writes ledger entries that sum to zero per currency (exchange is two currency legs through a system FX wallet).
- **Timestamps** are Firestore server timestamps.
- **IDs** are Firestore auto-IDs unless stated.

## 1. Firebase Auth

| Concern | Setting |
|---|---|
| Providers | Email/Password (legacy parity). Google/Apple optional later. |
| Email verification | Required before any money operation (`token.email_verified` checked in Functions + rules). Replaces legacy OTP. |
| Password reset | Firebase reset email. Replaces legacy reset code. |
| Email enumeration protection | **On** |
| Password policy | Min 8, upper + lower + number (Firebase password policy, enforced server-side) |
| Custom claims | `admin: true` only. Set by `scripts/set-admin.ts` (service account) — never from the client. |
| Multi-factor | TOTP optional (phase 2) |

## 2. Firestore collections

### `users/{uid}`
Profile + preferences. Doc ID = Auth `uid`. Created by the `onUserCreated` trigger.

| Field | Type | Writer | Notes |
|---|---|---|---|
| `displayName` | string 1–60 | owner | Legacy `user.name` |
| `email` | string | Function | Mirror of Auth email, for admin search. Never client-written. |
| `photoPath` | string \| null | owner | Storage path `avatars/{uid}/…`; legacy `user.image` |
| `defaultCurrency` | string (ISO 4217) | owner | Default `BDT` (legacy converter default "to") |
| `theme` | `"system" \| "light" \| "dark"` | owner | Legacy dark-mode toggle, now persisted |
| `status` | `"active" \| "suspended"` | Function (admin) | Suspended users blocked in every money Function |
| `createdAt`, `updatedAt` | timestamp | Function / owner | |

Owner may update only `displayName`, `photoPath`, `defaultCurrency`, `theme`, `updatedAt`.

### `wallets/{walletId}`
One wallet per user per currency. `walletId = "{uid}_{CURRENCY}"` (deterministic → no duplicates, cheap lookup).

| Field | Type | Notes |
|---|---|---|
| `ownerUid` | string | |
| `currency` | string (ISO 4217) | Allowed list in `packages/core/currencies.ts` |
| `balanceMinor` | int ≥ 0 | Never negative (checked in transaction) |
| `label` | string | e.g. "Main USD" |
| `status` | `"active" \| "frozen"` | |
| `version` | int | Incremented on each balance change |
| `createdAt`, `updatedAt` | timestamp | |

System wallets (`ownerUid = "system"`): `system_FX_{CUR}` (FX liquidity), `system_BILLER_{billerId}` (bill receipts), `system_FUNDING_{CUR}` (credits). Not readable by users.

### `transactions/{txId}`
Header for one user-visible operation. Immutable after `status` reaches a terminal state.

| Field | Type | Notes |
|---|---|---|
| `type` | `"TRANSFER" \| "EXCHANGE" \| "BILL_PAYMENT" \| "CREDIT" \| "REVERSAL"` | |
| `status` | `"COMPLETED" \| "FAILED" \| "REVERSED"` | Functions write it complete in one transaction; no pending state in v1 |
| `participants` | string[] (uids) | For `array-contains` queries |
| `fromWalletId`, `toWalletId` | string \| null | |
| `amountMinor`, `currency` | int, string | Debit side |
| `toAmountMinor`, `toCurrency` | int, string | Credit side (differs only for EXCHANGE) |
| `rate` | string (decimal) | EXCHANGE only; stored as string to avoid float drift |
| `quoteId` | string \| null | EXCHANGE only |
| `billerId`, `category` | string \| null | BILL_PAYMENT only (legacy Fast Payment) |
| `note` | string ≤ 140 | Optional, user text |
| `counterpartyDisplay` | map `{uid: string}` | Name shown to each side, snapshotted at write time |
| `createdBy` | uid | |
| `idempotencyKey` | string | |
| `createdAt` | timestamp | |
| `failureCode` | string \| null | |

### `ledgerEntries/{entryId}`
Immutable. Source of truth for balances; `wallets.balanceMinor` is a cached sum.

| Field | Type |
|---|---|
| `transactionId` | string |
| `walletId` | string |
| `ownerUid` | string |
| `currency` | string |
| `deltaMinor` | int (negative = debit) |
| `balanceAfterMinor` | int |
| `createdAt` | timestamp |

Invariant (tested + nightly check Function): for each `transactionId` and `currency`, `Σ deltaMinor = 0`; for each wallet, `Σ deltaMinor = balanceMinor`.

### `exchangeQuotes/{quoteId}`
| Field | Type | Notes |
|---|---|---|
| `uid` | string | |
| `fromCurrency`, `toCurrency` | string | |
| `amountMinor` | int | |
| `rate` | string decimal | |
| `toAmountMinor` | int | Floored to the target currency's minor unit; rate math done with a decimal library, never JS floats |
| `source` | string | Rate provider name |
| `createdAt`, `expiresAt` | timestamp | 60 s validity; TTL policy deletes after 1 day |
| `used` | bool | Single use |

### `fxRates/{baseCurrency}`
Server cache of provider rates. `rates: map<string,string>`, `fetchedAt`, `provider`. Read by authenticated users (converter screen), written by Function only. Refreshed on demand if older than 10 min (scheduled refresh optional).

### `billers/{billerId}`
Seeded catalog that replaces the legacy hardcoded Fast Payment badges.

| Field | Type | Legacy seed |
|---|---|---|
| `name` | string | Training, Internet, Gas, Movies, Education, Electricity, Food |
| `category` | string | same |
| `icon` | string | Material Symbols name |
| `suggestedAmountMinor` | int \| null | 5000, 4000, 19000, 3500, 99900, 10900, 39900 (USD cents, from legacy `$` values) |
| `currency` | string | `USD` |
| `active` | bool | |

These are **simulated billers** — money moves to a system wallet, not a real company. UI must say so.

### `idempotency/{uid}_{key}`
`op`, `requestHash`, `result` (map), `createdAt`, `expireAt` (TTL 24 h). Same key + different request hash → `failed-precondition`.

### `rateLimits/{uid}_{op}`
`windowStart`, `count`. Checked inside money Functions.

### `auditLog/{id}`
`actorUid`, `action`, `targetUid`, `details`, `createdAt`. Admin actions + failed money ops. Admin-read only.

## 3. Cloud Storage

| Path | Rule |
|---|---|
| `avatars/{uid}/{fileId}` | Read: signed-in users. Write: `request.auth.uid == uid`, `contentType` matches `image/(png|jpeg|webp)`, size ≤ 2 MB. |
| everything else | deny |

## 4. Cloud Functions (callable unless noted)

| Name | Input (Zod) | Does |
|---|---|---|
| `onUserCreated` (Auth trigger) | — | Create `users/{uid}`, create `{uid}_{defaultCurrency}` wallet at 0 |
| `createWallet` | `{currency}` | Create wallet if allowed + not existing |
| `transfer` | `{toEmail, fromWalletId, amountMinor, note?, idempotencyKey}` | Resolve recipient via Admin Auth (no user directory exposed), ensure recipient wallet in same currency, debit/credit in one transaction |
| `getExchangeQuote` | `{from, to, amountMinor}` | Fetch/cached rate, create quote |
| `executeExchange` | `{quoteId, idempotencyKey}` | Validate quote (owner, unexpired, unused), debit `from` wallet → system FX → credit `to` wallet |
| `payBill` | `{billerId, fromWalletId, amountMinor, idempotencyKey}` | Debit user → `system_BILLER_*` |
| `adminCreditWallet` | `{walletId, amountMinor, reason, idempotencyKey}` | Admin only. Funding source for demo/test. Audited |
| `adminSetUserStatus` | `{uid, status}` | Admin only. Audited |
| `adminListUsers` | `{pageToken?}` | Admin only. Paginated |
| `reconcileLedger` (scheduled, daily) | — | Verify invariants, write alert to `auditLog` |

All callables: `enforceAppCheck: true`, require `auth`, require `email_verified` for money ops, reject `status == "suspended"`, rate-limited, idempotent.

## 5. Indexes (`firestore.indexes.json`)

| Collection | Fields |
|---|---|
| `transactions` | `participants` (array-contains), `createdAt` desc |
| `transactions` | `participants` (array-contains), `type` asc, `createdAt` desc |
| `ledgerEntries` | `walletId` asc, `createdAt` desc |
| `wallets` | `ownerUid` asc, `currency` asc |

TTL policies: `exchangeQuotes.expireAt` (set `expireAt = expiresAt + 1 day`), `idempotency.expireAt`.

## 6. Security rules (draft — `firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function signedIn() { return request.auth != null; }
    function isAdmin()  { return signedIn() && request.auth.token.admin == true; }
    function isOwner(uid) { return signedIn() && request.auth.uid == uid; }

    match /users/{uid} {
      allow read: if isOwner(uid) || isAdmin();
      allow update: if isOwner(uid)
        && request.resource.data.diff(resource.data).affectedKeys()
             .hasOnly(['displayName','photoPath','defaultCurrency','theme','updatedAt'])
        && request.resource.data.displayName is string
        && request.resource.data.displayName.size() >= 1
        && request.resource.data.displayName.size() <= 60
        && request.resource.data.theme in ['system','light','dark'];
      allow create, delete: if false;
    }

    match /wallets/{walletId} {
      allow read: if isOwner(resource.data.ownerUid) || isAdmin();
      allow write: if false;
    }

    match /transactions/{txId} {
      allow read: if (signedIn() && request.auth.uid in resource.data.participants) || isAdmin();
      allow write: if false;
    }

    match /ledgerEntries/{id} {
      allow read: if isOwner(resource.data.ownerUid) || isAdmin();
      allow write: if false;
    }

    match /exchangeQuotes/{id} {
      allow read: if isOwner(resource.data.uid);
      allow write: if false;
    }

    match /fxRates/{base}   { allow read: if signedIn(); allow write: if false; }
    match /billers/{id}     { allow read: if signedIn(); allow write: if false; }
    match /auditLog/{id}    { allow read: if isAdmin();  allow write: if false; }

    match /{document=**} { allow read, write: if false; }
  }
}
```

Every rule above gets a passing **and** failing test in `firestore.rules.test.ts`.


## 7. v1.0 implementation — additions and changes

The deployed schema is this document **plus** the following (see `packages/core/src/types.ts` for exact TypeScript shapes):

| Collection | Key | Purpose | Client access |
|---|---|---|---|
| `users/{uid}` | + `phone` | Mobile number linked at sign-up | read own; phone is server-managed |
| `phoneIndex/{01XXXXXXXXX}` | `{ uid }` | Unique phone → user lookup for send/request/ATM | none |
| `moneyRequests/{id}` | requester, payer, `participants[]`, amount, note, status `PENDING/PAID/DECLINED/CANCELLED`, `transactionId` | Request money | read if participant |
| `atmCodes/{id}` | uid, `code`, amount, fee, status `ACTIVE/REDEEMED/CANCELLED/EXPIRED`, attempts, `holdTransactionId`, `expiresAt` | Cardless ATM | read own |
| `cards/{uid}` | style `black/purple/red`, last4, exp, holderName, status `ACTIVE/FROZEN`, online/international flags, linked wallet | Virtual card | read own |
| `cardSecrets/{uid}` | pan, cvv | Card secrets (demo) | **none, ever** |
| `agents/{phone}` | name, area, active | Cash-out agents | none |
| `rateLimits/{uid}_{op}` | windowStart, count | Per-user rate limiting | none |
| `seedMarks/{uid}` | — | Seed script idempotency | none |

**Changed from the draft above**
- `fxRates/BDT`: `{ bdtPer: { USD, GBP, EUR }, previous, source, fetchedAt }` — BDT per 1 unit of foreign currency, decimal strings.
- `transactions.type` adds `REQUEST_PAYMENT, RECHARGE, CASH_OUT_AGENT, CASH_OUT_ATM, ATM_RELEASE`; headers carry `title`, `subtitle`, `meta`, `feeMinor`.
- `billers`: `{ name, category, accountLabel, active, demo }`; 7 demo billers seeded.
- System wallets: `system_FX_{CUR}`, `system_FUNDING_{CUR}`, `system_FEES_BDT`, `system_HOLD_ATM_BDT`, `system_ATM_SETTLEMENT_BDT`, `system_BILLER_{id}_BDT`, `system_TELCO_{op}_BDT`, `agent_{phone}_BDT`.
- Unnecessary `wallets(ownerUid, currency)` composite index removed (equality-only queries don't need it); `moneyRequests` and `atmCodes(status, expiresAt)` indexes added.
- Deployed rules: `/firestore.rules` (this draft + the collections above). Storage: `/storage.rules`.
