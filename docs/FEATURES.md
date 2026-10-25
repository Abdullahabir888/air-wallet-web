# Features — what's real, what's demo

**Real** = complete inside Air Wallet: money moves between Air Wallet accounts with a balanced ledger.
**Demo settlement** = the app flow, validation, ledger and history are complete, but money settles to an internal account instead of an outside company. Swap the settlement step for a partner API to go live.

| Feature | Status | What a user can do | To make it real |
|---|---|---|---|
| Sign up / sign in / verify / reset | ✅ Real | Email + password, email link verification, reset link, mobile linked | — |
| Google sign-in | ✅ Real | Web (popup), Android and iPhone (native picker); one-step mobile number after first sign-in | Google OAuth client IDs + Android SHA-1 (DEPLOYMENT.md §1.1) |
| Sign in with Apple | ✅ Real (iPhone) | Native Apple sheet with Face ID, Hide-my-email supported | Enable in Apple Developer + Firebase |
| Link sign-in methods | ✅ Real | Settings → link Google / Apple to an email account | — |
| Balance + home | ✅ Real | Live BDT balance (tap to hide), other-currency wallets, quick actions | — |
| Send money | ✅ Real | Email or mobile, instant, no fee, review step, receipt | — |
| Request money | ✅ Real | Request, pay, decline, cancel, live list | Push notifications (FCM) for new requests |
| Exchange BDT ⇄ USD/GBP/EUR | ✅ Real (rates live with API key) | Live rates, 60-s locked quote, wallet auto-created | Real FX liquidity provider / bank to back `system_FX_*` |
| Activity + receipts | ✅ Real | Filters, day groups, detail with transaction ID | PDF statements |
| Light / dark / system theme | ✅ Real | Saved per device and on the profile | — |
| Pay bill | 🟡 Demo settlement | 7 demo billers, account number, review, receipt | Biller aggregator API (e.g. a licensed bill-pay provider) |
| Mobile recharge | 🟡 Demo settlement | 5 BD operators, auto-detect, prepaid/postpaid | Telco top-up API / aggregator |
| Cash out (agent) | 🟡 Demo settlement | Agent number, 1.85% fee, review | Agent network with agent onboarding + KYC |
| Cash out (ATM) | 🟡 Demo settlement | 6-digit code, 15-min expiry, hold + auto-release | ATM switch partner calling `redeemAtmCode` |
| Virtual card (3 styles) | 🟡 Demo issuer | Black / Purple / Red, reveal with password, freeze, toggles | Card issuer / BIN sponsor; PCI DSS scope for card data |
| Add money (top-up) | ⛔ Not built | Admin credit only | Bank / card acquiring or MFS cash-in |
| KYC (NID) | ⛔ Not built | — | Required by Bangladesh Bank for MFS; NID verification partner |
| Push notifications | ⛔ Not built | — | `expo-notifications` + FCM trigger on transactions |

## Regulatory note (Bangladesh)

Holding and moving customer money as a wallet is Mobile Financial Services under Bangladesh Bank rules. Launching with real money needs either an MFS licence or partnership with a licensed bank/MFS, plus KYC (NID), transaction limits per tier, AML monitoring and reporting. This codebase gives you the product, ledger and security base; it does not replace those approvals.

## Fees and limits (demo values)

Edit in `packages/core/src/fees.ts` — the app and the server both read this file.

| Operation | Min | Max | Fee |
|---|---|---|---|
| Send | ৳10 | ৳25,000 | Free |
| Request | ৳10 | ৳25,000 | — |
| Bill | ৳10 | ৳50,000 | Free |
| Recharge | ৳20 | ৳1,000 | Free |
| Cash out (agent) | ৳50 | ৳25,000 | 1.85% (rounded up) |
| Cash out (ATM) | ৳500 | ৳20,000 (৳500 steps) | ৳15 flat |
| Exchange | ৳100 equivalent | — | 0 spread (add one in `quote.ts` if needed) |
