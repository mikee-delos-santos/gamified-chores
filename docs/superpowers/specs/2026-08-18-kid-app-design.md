# Kid App — Design Derivation

_Date: 2026-08-18_

Derived from the Claude design handoff in `docs/design/kid-app/` (open
`Faye Coins Kid App.dc.html` in a browser). That prototype is a multi-turn document; the
**final direction is option 3a** (the top of the file). Turns 1 and 2 (Modernist black/red,
and the font/color explorations) are superseded and must not be implemented. Full screen
specs, tokens, and animations live in `docs/design/kid-app/README.md`; this file records the
final direction, the fonts, the new product decisions, and how they map to the Jira board.

## Final direction (3a)

- **Font:** Nunito throughout (Google Fonts, weights 400–900). Numbers always tabular-nums.
- **Palette:** primary blue `#2f7fd6`, depth `#1f5fa6`, deep navy headings `#123a5e`, soft
  blue fills/borders `#dceafa`/`#c3dcf7`, app background `#f2f8fd`, coin gold `#ffc12b`.
- **Shape language:** everything rounded (99px pills, 30px sheet, 26px balance card, 22/20/18/16
  cards and controls, 50% avatars/pips). Depth buttons use a hard bottom shadow that collapses
  on press.
- **Motion:** short and physical — `rowIn`, `pipIn`, `coinDrop`, `popIn`, `ringOut`, card sheen,
  hover lift, press scale, depth-button translate. Exact timings in the handoff README.
- **Icons:** Lucide style; use `lucide-react-native` in the app, not the prototype's inline SVGs.

## New product decisions made during design

These are additions to the MVP model (`docs/superpowers/specs/2026-08-12-chore-app-mvp-design.md`),
which had kids as no-login profiles picked from a list. The design replaces that with a paired,
identity-aware kid app:

1. **Invite codes + invite links.** A grown-up hands off a 6-digit code (or a link). The kid
   redeems it for their own "coin book" — a child identity plus a device-scoped token. One invite
   maps to exactly one child.
2. **Pairing confirm.** After redeeming, the kid confirms "This is <name>'s coin book" before any
   chores show. First guard against a sibling on the wrong account.
3. **Device-bound kid session.** The device stays locked to one kid; the child's name is shown
   wherever an action commits (Chores header pill, "Sent as <name>" by the CTA, award greeting).
4. **Grown-up PIN.** Switching kid requires a parent PIN sheet, never a free profile swap.
5. **Photo _or_ video proof** on a chore (the earlier PC-4 scope was video only), plus an
   admin-attached how-to video on the chore detail.
6. **Award moment ("coin delight").** A full-screen celebration after "I did it!" — praise and the
   chore first, the number second, no peso value.
7. **Coin bank as the only place money appears.** Ready-to-spend vs Saved tiles, store, and
   **cash-out as a request** ("Asked for ₱37.50. Waiting for approval.") against an admin-set peso
   rate. Peso value never appears on Home, chore rows, detail, or the award.

## Behavior rules that must survive the port

- Balance is always the sum of the append-only ledger, never a stored counter.
- A done chore can never be completed again — guard in the handler and the UI (no double-award).
- Peso value only in the Coin bank.
- Cash-out is a request, not a transfer.
- Keypads accumulate from the latest state (functional `setState`), never drop fast taps.

## Screen inventory (final 3a)

Join → Invite accepted → Home. Tab bar (Chores / Coin bank / Me) on the four tabbed screens.
Home/Chores row → Chore detail. "I did it!" → Award → Chores. Me → Switch kid → PIN sheet → Join.

1. Join (invite code + keypad)
2. Invite accepted (pairing confirm)
3. Home (balance card, coin pips, chores today)
4. Chores (list with status markers + name pill)
5. Chore detail (how-to video, photo/video proof, "I did it!", already-done state)
6. Award (celebration)
7. Coin bank (Ready/Saved, store, cash-out request, peso rate, history)
8. Me (stats, notify toggle, switch kid)
9. Grown-up PIN sheet

## Jira mapping

The design is the mockup several existing epics were waiting for, plus one new pillar.

**New epic — Kid Onboarding & Identity (invite, pairing, PIN):** invite code generate + redeem,
grown-up PIN, invite-link deep-linking, Join, Invite accepted, device-bound session, PIN sheet.

**Maps onto existing epics:**
- PC-6 UI Polish: kid design system (Nunito/tokens/Lucide), Home, Chores, Chore detail, Award.
- PC-3 Coin Bank: coin bank screen, admin-set peso rate, cash-out request + admin approval.
- PC-4 Media: photo/video proof capture, admin how-to video.
- PC-5 Push: "Tell me about new chores" toggle + token registration.

Still to design: the admin (parent) app — chore creation, awarding, cash-out approval, peso rate.
