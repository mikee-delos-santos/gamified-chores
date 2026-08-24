# Admin (Parent) App — Review & Award Design

_Date: 2026-08-24_

## Context

The kid app was designed to a cohesive mockup (kid-app 3a) and now ships as a polished 3-tab
app. The parent app never got the same treatment: it is one dense screen
(`mobile/src/app/(admin)/chores.tsx`) that stacks a new-chore form, recurring templates, and
"All chores" together, with plain text links to Bank and Kids in the header. The core loop
moment — a parent reviewing a kid's photo proof and awarding coins — is buried: a chore with
proof shows a small 64px thumbnail inline, and the award sheet makes the parent manually pick
_which_ kid did it even though the kid's name already rode along with the proof (used only for
the notification).

This design gives the admin app a real tab-bar information architecture and a focused
review-and-award experience, and ties proof to the submitting kid so the parent just confirms.

Jira: Epic **PC-53 — Epic G: Admin (Parent) App: Review & Award**.

## Goals

- A dedicated **Review** surface: a queue of chores awaiting review, with a tab badge count.
- A focused **review detail**: see the proof large, see who did it (pre-filled), award fast.
- Award outcomes: one-tap **Give full coins**, plus an optional **Grade instead** (1–5 stars).
- A **full-size proof view** (zoom) before deciding.
- Tie proof to the submitting kid so attribution is automatic, not a manual pick.

## Non-goals

- No reject / send-back path in this pass (the backend has a `rejected` status; leave it for
  later).
- No change to peso handling — peso value stays in the coin banks (kid + admin), untouched.
- No broader admin visual reskin beyond introducing the tab bar and the Review screens; Chores,
  Bank, and Kids are re-homed as tabs largely as-is.

## Architecture

### Admin information architecture (tab bar)

Introduce `(admin)/(tabs)/` with a `_layout.tsx` using expo-router `Tabs` and the **same custom
text-label + active-pill tab bar** the kid app uses (`(kid)/(tabs)/_layout.tsx`). Four tabs:

```
  Review (•N)     Chores     Bank     Kids
```

- **Review** — new (below).
- **Chores** — the existing chores screen (new-chore form, recurring templates, all chores).
- **Bank** — the existing bank screen (rate editor, PC-52 kids' balances, cash-out approvals).
- **Kids** — the existing kids screen; **Sign out** moves here from the old header.

The admin area stays token-gated. The role gate and login success route to a tab (Chores or
Review). The old header links to Bank/Kids are removed.

### Review tab — the needs-review queue

The queue is a **client-side filter of `listChores`**: chores whose `proof_photo_url` is set and
whose status is still `open`. No new backend endpoint.

- Ordered **oldest-first** (FIFO), so the longest-waiting kid is handled first.
- Each row: submitting kid (avatar + name from `proof_by`, falling back to the `by` name), chore
  title, reward chip, proof thumbnail. Tapping opens the Review detail.
- The **tab badge** shows the queue length; it clears when empty.
- Empty state: "All caught up".
- Respects the screen's existing pull-to-refresh and focus-refresh so the queue updates after an
  award.

### Review detail — the award moment

Opened from a queue row (or a push deep-link):

- Chore title + description + how-to photos, to compare against.
- "**&lt;Kid&gt; did this**" pre-filled from `proof_by`, changeable via the existing kid pills.
- The proof photo, large and **tappable to a full-size / zoom view**.
- Primary: **Give full coins** — one tap awards the full reward (grade 5) via `completeChore`.
- Secondary: **Grade instead** — reveals the 1–5 star picker + coin preview (the existing
  AwardSheet logic), then "Give coins".
- On success: the ledger is written, the chore leaves the queue, and the parent returns to the
  Review tab. The kid sees the coin-delight moment on next open (already built in PC-29).

### Backend — tie proof to the submitting kid

- Migration: add nullable `proof_by_child_id` (FK to `child_profiles`) on `chores`.
- `POST /chores/:id/proof`: accept an optional `child_profile_id`, store it with the proof. The
  existing `by` name param keeps working for the notification.
- Chore serializer: include `proof_by: { id, name }` (null when no proof / no child recorded).
- Awarding is unchanged (`completeChore` still takes `child_profile_id` + grade); `proof_by`
  only provides the UI default.

### Kid app — send the child id

`uploadProofPhoto` sends the bound kid's `child_profile_id`; the chore detail passes it through.
No visible change to the kid flow.

### Notifications

Push already fires to parents on a kid's "I did it!" (PC-50). Extend the existing deep-link
handling (PC-27) so tapping that push on an admin device opens the Review tab, or the specific
chore's Review detail when a chore id is present.

## Data flow

```
Kid submits proof (with child id)
  → backend stores proof photo + proof_by_child_id
  → push to parents (PC-50)
Parent opens app / taps push
  → Review tab lists open chores with proof (oldest-first)  ← client filter of listChores
  → Review detail: proof large, "<kid> did this" pre-filled
  → Give full coins / Grade instead → completeChore(child_id, grade)
  → ledger write; chore leaves queue
  → kid sees coin-delight on next open (PC-29)
```

## Testing

- **Backend (request specs):** proof with a child id persists and serializes `proof_by`; proof
  without a child id still works (`proof_by` null); awarding unchanged.
- **Web/PWA walkthrough:** kid submits proof → it appears in the admin Review queue with the
  right kid and a tab badge → open detail, proof enlarges → Give full coins awards the full
  reward and the item leaves the queue → Grade instead awards the graded amount.
- **Empty state:** Review shows "All caught up" with nothing pending.
- `tsc --noEmit` clean; verify against the running web build.

## Jira mapping

Epic **PC-53 — Epic G: Admin (Parent) App: Review & Award**, build order:

1. `PC-54 — Backend: record the proof-submitting kid on a chore (proof_by)`
2. `PC-55 — Mobile (kid): send the bound kid id when submitting proof`
3. `PC-56 — Mobile (admin): tab-bar IA (Review / Chores / Bank / Kids)`
4. `PC-57 — Mobile (admin): Review tab — needs-review queue + badge`
5. `PC-58 — Mobile (admin): Review detail — full-size proof + award (full / graded)`
6. `PC-59 — Mobile (admin): deep-link a kid "I did it!" push to the Review tab`

PC-54 and PC-55 unblock the attribution; PC-56 lands the IA; PC-57/58 are the Review experience;
PC-59 wires the push. PC-56–58 can proceed against the `by`-name fallback before PC-54/55 land.
