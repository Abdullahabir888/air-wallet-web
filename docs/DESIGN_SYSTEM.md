# Design System

Source of truth in code: `apps/wallet/src/theme/tokens.ts`. Approved mockups: `design/`.

## Color

| Token | Light | Dark | Use |
|---|---|---|---|
| `primary` | `#2563EB` | `#60A5FA` | Buttons, icons, links, active tab |
| `primarySoft` | `#E6EEFF` | `#16264A` | Icon chips, avatar |
| `onPrimary` | `#FFFFFF` | `#06142E` | Text on primary |
| `bg` | `#F4F7FC` | `#0A1020` | Screen background |
| `card` | `#FFFFFF` | `#121B2E` | Panels, inputs |
| `ink` | `#0F1A33` | `#E7EEFB` | Main text |
| `muted` | `#6B7A99` | `#8A9BBA` | Secondary text |
| `line` | `#E4EAF5` | `#1D2942` | Dividers |
| `success` / `danger` / `warning` | `#16A34A` / `#DC2626` / `#C7811A` | `#4ADE80` / `#FF7A7A` / `#F2B54A` | Money in, errors, demo notices |
| Balance card gradient | `#3B82F6 → #2563EB → #1E3A8A` | `#2563EB → #1E40AF → #172554` | Home balance, ATM code |

Dark mode is not inverted light mode: primary is lighter (`#60A5FA`) so it keeps contrast on navy.

## Type

Poppins (`@expo-google-fonts/poppins`): 400 body, 500 labels, 600 buttons/titles, 700 headings and amounts.
Amounts: 30–40 px bold. Body 14 px. Captions 12 px.

## Icons

Two sets, both vector (`react-native-svg`):

| Set | File | Used for |
|---|---|---|
| **Glossy gradient** | `src/components/Icon3D.tsx` | Home quick actions, tab bar, activity rows |
| Outline (1.6 stroke) | `src/components/Icon.tsx` | Small UI glyphs: back, eye, copy, lock, chevron |

Quick-action tiles: rounded square (32% radius), soft tint of the icon colour, thin tinted border, coloured soft shadow in light mode; in dark mode the tint is the accent at 16% on the card colour with no shadow.

| Action | Accent | Tile (light) |
|---|---|---|
| Send money, ATM, Card | `#2563EB` | `#EEF4FF` |
| Request | `#10B981` | `#E9FBF4` |
| Pay bill | `#F59E0B` | `#FFF5E6` |
| Recharge | `#7C3AED` | `#F3EEFF` |
| Cash out | `#F43F5E` | `#FFEEF2` |
| Exchange | `#14B8A6` | `#E8FAF6` |

Tab bar: every icon in colour.

| Platform | Tab bar |
|---|---|
| **iPhone** | **Liquid Glass** floating capsule (`src/components/GlassTabBar.tsx`), 14 pt from the screen edges, just above the home indicator. iOS 26+: Apple's real glass material via `expo-glass-effect` (`GlassView`, interactive, follows the app theme). Older iOS: `expo-blur` system chrome material + a specular top-edge sheen. Active tab sits in a glass "lens". Screens add bottom padding so the last row scrolls clear of the bar. |
| Android / web | Classic bar sized to the device's gesture bar or 3-button nav; active tab gets a soft glow and a cyan→blue underline. |

## Logo

New vector logo (`src/components/Logo.tsx`): wallet + white "A" + air swoosh + paper plane, blue gradient with a cyan card peeking behind. Wordmark "Air**Wallet**" in Poppins (Air = ink, Wallet = primary blue), so it adapts to light and dark automatically.

| Asset | Use |
|---|---|
| `<Logo height={36} />` | Header (mark + wordmark) |
| `<LogoMark mono="#E9C46A" />` | Single-colour mark on the virtual cards (silver / lavender-white / gold) |
| `assets/icon.png` | App icon (mark on a soft white-blue tile) |
| `assets/adaptive-icon.png` | Android adaptive icon foreground (mark inside the safe zone) |
| `assets/splash-icon.png`, `favicon.png` | Splash and web favicon |

The previous raster AIR-WALLET logo is kept in `design/legacy-logo/`.

## Phone-aware layout

`src/lib/device.ts` reads the phone (`expo-device`: brand, manufacturer, model, device type), the screen width and the **real safe-area insets** from the OS, and returns a `DeviceProfile`:

| Phone | What changes |
|---|---|
| **Samsung (One UI)** | Large greeting zone at the top ("Good afternoon, / Abir"), so actions sit in thumb reach — One UI's one-handed pattern |
| **Google Pixel / other Android** | Compact greeting under the logo; tab bar sits above the gesture bar or 3-button nav |
| **iPhone** | Dynamic Island or notch detected from the top inset; tab bar leaves room for the home indicator |
| **Small phones (< 360 dp)** | 52 dp tiles, 11 pt labels |
| **Tablets / unfolded foldables (≥ 600 dp)** | All 8 actions in one row, content centred at 560 dp |

Cutouts are never hard-coded — a new phone with a different camera hole still lays out correctly because the OS reports its insets. Settings → *This device* shows what was detected (model, layout, cutout, insets).

## Virtual card styles

| Style | Background | Accents |
|---|---|---|
| Midnight Black | Matte black radial `#3A3D46 → #050506` | Silver mark and digits |
| Royal Purple | `#2E0854 → #6D28D9 → #A855F7` | Yellow glow, yellow tag and digits |
| Ruby Gold | `#3F0A0A → #991B1B → #DC2626` | Thin gold inner border, gold mark, text and chip |

No Visa/Mastercard logos — they're trademarks, and the demo number isn't on those networks.

## Components (`src/components/ui.tsx`)

`Screen`, `Header`, `Card`, `Button` (primary / secondary / danger, loading), `Field`, `AmountInput`, `Pills`, `Segmented`, `SummaryRow`, `ToggleRow`, `Notice`, `Empty`, `Loading`.
Money flows use `useMoneyFlow` → **Form → Review → Done** (`src/components/flow.tsx`).

## Accessibility

- Every touchable has `accessibilityRole` + label; segmented controls use `tab`/`radio` roles with selected state.
- Errors and results use `accessibilityLiveRegion="polite"`.
- Balance can be hidden with one tap (shoulder-surfing in public).
- Text colors meet WCAG AA on both themes for body text.
- React Native Paper from the original brief was replaced by this small kit so the UI matches the approved bKash-style design exactly; the same a11y props are applied by hand.
