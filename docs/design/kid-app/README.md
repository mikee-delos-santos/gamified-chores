# Handoff: Coin Chores — kid app (gamified chores)

## Overview

The kid-facing side of a family chore app. A child joins by invite code, sees the chores a
grown-up posted, watches an optional how-to video, attaches a photo or video as proof, marks the
chore done, gets a coin award moment, and can store or cash out coins in a Coin bank. Coins are
the currency; peso value is deliberately shown **only** in the Coin bank so the app reads as
"do the thing", not "earn money".

Backing product: `mikee-delos-santos/gamified-chores` (Rails API + Expo/React Native app,
branch `main`, mobile app under `mobile/`). See `github.md` in this bundle. At the time of design
the Expo app was still the starter shell, so nothing here replaces an existing screen — this is
the design for the kid screens.

## About the design files

`Faye Coins Kid App.dc.html` is a **design reference created in HTML** — a prototype showing the
intended look and behavior. It is not production code to lift. The task is to **recreate these
screens in the target codebase's environment** — here, the Expo / React Native app in `mobile/`,
using its existing navigation (expo-router under `mobile/src/app/`), its themed components
(`mobile/src/components/themed-text.tsx`, `themed-view.tsx`), and its API client
(`mobile/src/lib/api.ts`). Translate CSS to React Native styles; do not ship the HTML.

Open the file in a browser to interact with it. It is a multi-turn design document: the option
labelled **3a** at the top is the final design. Turns 1 and 2 below it are earlier explorations
(a Modernist black/red direction, and three font/color directions) kept for context only —
**do not implement them**.

## Fidelity

**High-fidelity** for 3a. Colors, type, spacing, radii, animation timings below are final values
taken from the prototype and should be matched. Copy is final. Placeholder-only items: the
how-to video frame, the photo/video proof previews, and the kid avatar (initial-in-a-circle
stands in for a real avatar image if the product adds one).

---

## Screens / views

Device frame in the prototype: 390 × 800 px content area (iPhone-class). All screens are a
vertical flex column: status row, then screen body, then the tab bar on the four tabbed screens.

### 1. Join (invite)

- **Purpose**: A kid joins their own coin book with the 6-digit invite code a grown-up sent, or
  by tapping the invite link (the "Paste" key stands in for link-handoff).
- **Layout**: 20px horizontal padding. Brand row (coin icon 26px + "Coin Chores", 17px/800) →
  H1 "Join with your invite" (28px/800, line-height 1.15) → hint paragraph (13px/600, 1.5,
  ink 62%) → code row → keypad → footer note pinned to the bottom (`margin-top:auto`).
- **Code row**: six equal cells in a flex row, `gap: 8px`, each 56px tall, radius 18px,
  white fill, 2px border. Border colors: filled `#2f7fd6`, next-to-fill `#9dc4ec`, empty
  `#dceafa`; `transition: border-color .18s`. Digit 24px/900 centered.
- **Keypad**: 3-column grid, `gap: 9px`. Keys 1–9, then `Paste`, `0`, `⌫`. Each key: white,
  2px `#dceafa` border, radius 18px, `padding: 15px 0`, label 20px/800 `#123a5e`.
  Hover border `#2f7fd6`; press `transform: scale(.94)` + background `#eaf3fd`, `transition .13s`.
- **Footer note**: link icon + "One invite makes one coin book. It only ever opens that kid's
  chores." (12px/700, 1.45), white card, 2px `#dceafa`, radius 20px, padding 12/14.
- **Hint copy**: default "Ask a grown-up for the 6 numbers, or tap the link they sent."; once six
  digits are entered, "Checking your code…".
- **Prototype stub**: any 6 digits are accepted. Code ending in `3` resolves to Julia, otherwise
  Cyrus. `Paste` fills `482913` and jumps straight to Invite accepted. In production the code is
  redeemed against the API and the response names the child.

### 2. Invite accepted (pairing confirm)

- **Purpose**: Name the kid the invite belongs to and get a "yes, that's me" before any chores
  are shown. This is the primary guard against a sibling using the wrong account.
- **Layout**: content pushed to the bottom (`margin-top:auto`), 20px padding, items flush left.
- **Components**: "Invite accepted" eyebrow (14px/800 `#2f7fd6`) → 96px circle avatar,
  `#dceafa` fill, initial 42px/900 `#2f7fd6`, with a 3px `#2f7fd6` ring expanding out once →
  headline "This is Julia's / coin book" (34px/900, 1.1, two lines) → explainer (13px/700, 1.5,
  ink 60%): "This tablet stays on Julia's chores. A grown-up's PIN is needed to change it, so
  nobody can finish a sibling's chores by mistake." → primary "Yes, that's me" → secondary
  "Not me — use another invite".

### 3. Home

- **Purpose**: Show the balance warmly and the chores left today.
- **Header**: "Hi, Julia" (20px/800 `#123a5e`) left; 34px circle avatar with initial right.
- **Balance card**: `#2f7fd6` fill, radius 26px, padding 20px, white text, 16px side margins.
  Contains: "Your coins" (14px/700, 85% opacity) → gold coin icon 42px + balance 50px/900
  tabular-nums → a row of nine 16px coin pips (`gap: 5px`; filled `#ffc12b`, empty `#dceafa`;
  one pip per 6 coins, capped at 9) → "Saved for later: 60.00 coins" (12px/700, 80%).
  A diagonal white sheen sweeps across the card on a 2.6s loop.
- **Chore rows**: "3 chores left today" (18px/800) with total coins right (13px/700 `#2f7fd6`);
  then white rows, 2px `#dceafa`, radius 20px, padding 14/16, `gap: 10px`. Each row: title
  16px/800 `#123a5e`, description 12px/600 ink 55%, and a coin chip on the right
  (`#fff6e0`, radius 14px, padding 6/10, 16px coin icon + amount 15px/800 tabular-nums).
- **No peso value anywhere on this screen** — by design.

### 4. Chores (list)

- **Header**: "Chores" 24px/800 + a name pill on the right (white, 2px `#dceafa`, radius 99px,
  24px avatar + name 12px/800) — the second wrong-kid guard.
- **Rows**: same card as Home plus a status marker on the left: done = 30px `#2f7fd6` circle with
  a white check; open = 30px circle, 2px dashed `#9dc4ec`. Coin amount on the right.
- Tapping any row opens the detail; done rows open the already-done state (below).

### 5. Chore detail

- **Back**: chevron + "Chores", 15px/800 `#2f7fd6`, press `scale(.94)`.
- **Head**: title 27px/800, 1.15, `text-wrap: pretty`; description 14px/600, 1.5, ink 62%.
- **Video frame**: 150px tall, radius 22px, gradient `#dceafa → #c3dcf7`, centered 56px white
  play button (shadow `0 6px 16px rgba(18,58,94,.2)`) with a 64px ring pulsing outward on a
  2.2s loop; caption "How-to video · 0:24" bottom-left, 12px/700.
- **Proof, empty**: label "Show it's done" (15px/800) and two equal buttons — "Take photo" and
  "Record video" — white, 2px `#dceafa`, radius 20px, padding 14px, icon above label
  (14px/800), stacked flush left; hover border `#2f7fd6`, press `scale(.96)`.
- **Proof, attached**: white row with a 2px `#2f7fd6` border, radius 20px: 52px gradient
  thumbnail, "Attached" (15px/800) + kind ("Photo · IMG_2214" / "Video · 0:08", 12px/700),
  and a "Remove" chip (`#f2f8fd`, radius 14px, 12px/800 `#2f7fd6`).
- **Primary CTA**: "I did it!" — full width, `#2f7fd6`, radius 22px, 19px/900 white, padding
  17/20, label left with a check icon right, depth shadow `0 6px 0 #1f5fa6`; press
  `translateY(4px)` and shadow to `0 2px 0`.
- **Under the CTA**: 22px avatar + "Sent as Julia. 12.00 coins land when a grown-up says nice
  work." (12px/700, ink 55%) — the third wrong-kid guard, and it sets the expectation that a
  grown-up awards.
- **Already-done state** (chore status `done`): the proof block and CTA are replaced by a
  `#dceafa` card (2px `#c3dcf7`, radius 22px) with a 38px blue check circle and
  "Already done — 5.00 coins earned" (17px/800), plus a secondary "Find another chore".
  **Completing a done chore must be impossible** — the handler also refuses non-open chores.
  This matches the append-only `coin_transactions` ledger: no double-award.

### 6. Award (celebration)

- Full-bleed `#2f7fd6`, white text, content bottom-aligned, flush left.
- "Nice work, Julia!" eyebrow (15px/800, 85%) at the top; a 180px white ring expands from the
  upper middle once.
- Gold coin icon 76px pops in, then "+12.00" at 74px/900 tabular-nums, then "coins added"
  (20px/800).
- Summary card `rgba(255,255,255,.16)`, radius 22px, padding 16px: chore title (17px/800) and
  "New total" with the new balance (28px/900).
- "What's next" button: white fill, `#2f7fd6` label 18px/900, radius 22px, shadow
  `0 6px 0 rgba(18,58,94,.25)`.
- Note the order: praise and the chore first, the number second. No peso value.

### 7. Coin bank — the only place money appears

- **Header**: "Coin bank" 24px/800 + rate "1 coin = ₱2.50" (12px/700, ink 55%).
- **Two tiles**, equal width, `gap: 10px`, radius 22px, padding 14px:
  "Ready to spend" (white, 2px `#dceafa`) and "Saved" (`#dceafa` fill, 2px `#c3dcf7`). Each:
  label 12px/700 ink 55%, amount 28px/900 tabular-nums, peso value 13px/800 `#2f7fd6`.
- **Amount card**: white, radius 22px. Label "How many coins?", then an input — `#f8fbff`,
  2px `#dceafa`, radius 16px, padding 11/13, 20px/900; focus border `#2f7fd6`. Two buttons:
  "Save it" (outline `#2f7fd6`) and "Cash out" (solid `#2f7fd6`, depth `0 5px 0 #1f5fa6`).
  A hint line under them (12px/700, ink 55%) reports the result.
- **Coin history**: rows, white, 2px `#eaf3fd`, radius 18px, padding 11/14, `gap: 8px`:
  label 14px/800, when 11px/700 ink 50%, amount 16px/900 tabular-nums — positive `#2f7fd6`,
  negative `#1b2b3a`.

### 8. Me

- 60px avatar + name (28px/900) and "3 chores left today" (13px/700, ink 55%).
- Two stat tiles: "Chores done" and "Coins all time", white, 2px `#dceafa`, radius 22px,
  numbers 30px/900 tabular-nums.
- A settings row: "Tell me about new chores" (15px/800) with "Joined by invite 482 913"
  (12px/700, ink 50%) beneath, and a 50×28 pill toggle (`#2f7fd6` on, 22px white knob).
- "Switch kid" at the bottom — outline button. **Opens the grown-up PIN sheet, never a free
  profile swap.**

### 9. Grown-up PIN sheet

- Overlay `rgba(18,58,94,.45)`, sheet bottom-anchored, `#f2f8fd`, radius 30px top corners,
  padding 22/20/24, slides up (`.3s`).
- Title "Grown-up PIN" (22px/900) + "Switching coin books needs a grown-up, so chores never get
  done on the wrong account." (13px/700, 1.45).
- Four 44px dot boxes (radius 16px; filled `#2f7fd6`, empty `#dceafa`, 2px `#c3dcf7`).
- Same keypad geometry as Join, with `Close` in place of `Paste`.
- Prototype: any 4 digits unpair and return to Join. Production must verify against the parent
  account.

---

## Interactions & behavior

Navigation: Join → Invite accepted → Home. Tab bar (Chores / Coin bank / Me) on Home, Chores,
Coin bank, Me. Home chore row and Chores row → Chore detail. "I did it!" → Award → Chores.
Me → "Switch kid" → PIN sheet → Join.

Animations (all easings as written; keep them short and physical):

| Where | Motion |
|---|---|
| Rows, cards, tiles, sheet | `rowIn`: translateY(10px) + scale(.99) + fade → rest, 0.36–0.42s, staggered 0.05–0.09s per item |
| Coin pips | `pipIn`: scale(.2) → 1, 0.32s, `cubic-bezier(.2,1.4,.4,1)`, 0.05s stagger |
| Balance coin | `coinDrop`: from −26px and scale(.7), overshoot to 1.06, 0.55s |
| Brand coin, idle | `bob`: ±5px, 2.6s ease-in-out loop |
| Award amount, avatar, check | `popIn`: scale(.5) rotate(−12°) → 1.12 → 1, 0.5s, `cubic-bezier(.2,1.3,.3,1)` |
| Rings (video play, pairing, award) | `ringOut`: scale(.7) → 2.1 with fade; loop on the video, once elsewhere |
| Balance card sheen | `sheen`: diagonal highlight sweeps, 2.6s loop |
| Row / button hover | lift `translateY(-2px)`, border → `#2f7fd6`, shadow `0 8px 16px rgba(47,127,214,.16)`, 0.16s |
| Row / small button press | `scale(.94–.97)`, 0.13–0.16s |
| Depth buttons press | `translateY(4px)` and shadow `0 6px 0` → `0 2px 0` |
| Keypad press | `scale(.94)` + background `#eaf3fd` |

Behavior rules that must survive the port:

1. **Balance is always the sum of the ledger**, never a stored counter (mirrors
   `coin_transactions` being append-only).
2. **A done chore can never be completed again.** Guard in the handler *and* in the UI.
3. **Peso value appears only in the Coin bank** (both tiles, the rate line, and the cash-out
   confirmation). Never on Home, chore rows, the detail screen, or the award moment.
4. **Cash out is a request**, not a transfer: "Asked for ₱37.50. Waiting for approval."
5. **Store/cash out validate against spendable coins** and report in kid language:
   "Not enough coins to store yet."
6. **Keypads must not drop fast taps** — accumulate from the latest state, not a captured
   snapshot (in React, the functional `setState` form).
7. **Identity is visible wherever an action commits**: name pill in the Chores header, avatar +
   "Sent as <name>" beside the CTA, name in the award greeting.

## State

Per kid session: `screen`, `tab`, `code` (invite digits), `pin`, `showPin`, `kid`, `choreId`,
`amount`, `spendable`, `stored`, `done` (count), `earned` (all-time), `awarded` (last award),
`proof` (`null | 'photo' | 'video'`), `hint`, `chores[]` (`id, title, desc, reward, status`),
`ledger[]` (`label, when, amount`).

Real data needs: redeem invite code → child identity + token; list chores for the child; upload
proof media; create a completion (server writes the coin transaction); read ledger + balance;
create store / cash-out requests; read the admin-set peso rate. Deferred epics mocked here as
real UI: coin bank, video/photo proof, push notification toggle.

## Design tokens (final direction)

Colors: `#2f7fd6` primary blue · `#1f5fa6` primary press/depth · `#2a72c1` primary hover ·
`#123a5e` deep navy (headings) · `#1b2b3a` ink (body) · `#dceafa` soft blue (fills, borders) ·
`#c3dcf7` soft blue border/gradient end · `#eaf3fd` key press tint · `#f8fbff` input fill ·
`#eaf3fd`/`#dceafa` empty pip · `#f2f8fd` app background · `#ffffff` cards ·
`#ffc12b` coin gold · `#fff6e0` coin chip fill · `#9dc4ec` dashed/next-cell border.
Ink tints used: `rgba(27,43,58,.5/.55/.6/.62)`, `rgba(18,58,94,.5/.55)`.

Type: **Nunito** throughout (Google Fonts, weights 400–900). Sizes/weights: 74/900, 50/900,
42/900, 34/900, 30/900, 28/900–800, 27/800, 24/800, 22/900, 20/900–800, 19/900, 18/800, 17/800,
16/800, 15/800, 14/800–700, 13/700, 12/700, 11/700. Numbers always
`font-variant-numeric: tabular-nums`. Body line-height 1.45–1.5; headline 1.1–1.25.

Spacing: 20px screen padding (16px where cards bleed wider), gaps 5 / 8 / 9 / 10 / 12 / 14px,
card padding 11–20px.

Radii: 99px pills · 30px phone/sheet · 26px balance card · 22px cards, primary buttons ·
20px rows, secondary buttons · 18px keys, ledger rows, small controls · 16px inputs, PIN dots ·
14px chips · 50% avatars and pips. Nothing square.

Shadows: `0 2px 0 rgba(18,58,94,.06)` resting row · `0 8px 16–18px rgba(47,127,214,.16–.18)`
hover lift · `0 6px 0 #1f5fa6` primary depth (`0 2px 0` pressed) ·
`0 6px 0 rgba(18,58,94,.25)` white button depth · `0 6px 16px rgba(18,58,94,.2)` play button.

Tap targets: every row and button is ≥ 44px tall.

## Assets

None to ship. Icons are inline stroke SVGs in the prototype, drawn in the Lucide style
(coin = two concentric circles, check, chevron, camera, video, link, play) — use the target
codebase's icon library (`lucide-react-native` or equivalent) rather than copying the paths.
The how-to video frame and the proof thumbnails are gradient placeholders and need real media.
Avatars are an initial in a circle; swap for a real avatar image if the product adds one.

## Files in this bundle

- `Faye Coins Kid App.dc.html` — the design document. **Option 3a (top) is the final design**;
  turns 1–2 below are superseded explorations.
- `support.js` — the runtime the HTML prototype needs to render. Not part of the design.
- `_ds/modernist-…/styles.css`, `_ds_bundle.js` — the design system the earlier turns used.
  The final direction (3a) does not depend on it; included only so turns 1–2 still render.
- `github.md` — the source repository, branch, and which repo files each screen was designed
  against.

Still to design: the admin (parent) app — chore creation, awarding, cash-out approval, peso rate.
