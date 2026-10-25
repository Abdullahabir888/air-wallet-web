# Air Wallet brand assets

Ready-to-use files for stores, website, social and presentations. The app itself draws the logo and icons as vector code (`apps/wallet/src/components/Logo.tsx`, `Icon3D.tsx`), so these are the same artwork exported as files.

`brand-sheet.png` shows everything at a glance.

| Folder | Files | Use |
|---|---|---|
| `logo/` | `airwallet-mark.svg` | Master logo mark (vector, any size) |
| | `airwallet-mark-256/512/1024.png` | Mark only, transparent |
| | `airwallet-logo-light.png` | Mark + "AirWallet", for light backgrounds |
| | `airwallet-logo-dark.png` | For dark backgrounds |
| | `airwallet-logo-white.png` | All-white wordmark, for photos / blue backgrounds |
| `icons/svg/`, `icons/png/` | send-money, request, pay-bill, recharge, cash-out, atm, exchange, card, tab-home, tab-activity, tab-settings | Glossy action and tab icons (SVG vector, PNG 256 px) |
| `app-icons/` | `ios-app-icon-1024.png` | App Store icon (no transparency, as Apple requires) |
| | `ios-app-icon-dark-1024.png` | iOS 18+ dark-mode icon variant |
| | `google-play-icon-512.png` | Google Play listing icon |
| | `android-adaptive-foreground-1024.png` | Android adaptive icon foreground (safe-zone padded) |
| | `splash-600.png` | Splash image |
| | `favicon-48/192/512.png` | Web favicon / PWA icons |
| `cards/` | `card-black.png`, `card-purple.png`, `card-red.png` | Virtual card artwork (Midnight Black, Royal Purple, Ruby Gold) for marketing |

Colours, type and usage rules: `docs/DESIGN_SYSTEM.md`.
The previous raster AIR-WALLET logo is kept in `design/legacy-logo/`.
