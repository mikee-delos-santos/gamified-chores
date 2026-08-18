# Mobile Core Loop — Design

_Date: 2026-08-13_

Covers the Expo app screens for the MVP core loop: admin creates a chore, marks it
done for a child with a grade, and the child sees an updated balance and completed
chores. Tickets: PC-16 (admin screens) and PC-17 (kid screens). Builds on the PC-10
Expo scaffold and the backend endpoints shipped in PC-13/14/15.

## Goal

One Android binary with two areas, chosen on launch:

- **Admin** — email/password login, create chores, mark a chore done for a child with a
  1–5 grade.
- **Kid** — no login. Pick a profile, see a coin balance and completed chores.

UI stays crude until the design-system epic (PC-6). Peso conversion is deferred to the
Coin Bank epic (PC-3); this slice shows Faye Coins only.

## Backend contract (already shipped)

The app consumes these endpoints. All money-ish fields come back as JSON floats.

- `POST /auth/login` `{ email, password }` → `{ token, user: { id, name, email, role } }`,
  or `401 { error }`.
- `GET /me` (Bearer) → the current admin. Used to validate a stored token on boot.
- `GET /chores` (Bearer) → array of `{ id, title, description, reward_coins, status,
  grade, created_by, completed_by, completed_at }`, newest first. Optional `?status=`.
- `POST /chores` (Bearer) `{ title, description, reward_coins }` → the created chore.
- `POST /chores/:id/complete` (Bearer) `{ child_profile_id, grade }` →
  chore JSON plus `{ awarded, child_balance }`. Grade must be an integer 1–5; the award
  is `grade/5 × reward_coins`. Completing an already-completed chore returns `422`.
- `GET /child_profiles` → `[{ id, name, balance }]`. No auth.
- `GET /child_profiles/:id` → `{ id, name, balance, completed_chores: [{ id, title,
  reward_coins, grade, awarded, completed_at }] }`. No auth.

There is no endpoint to create an admin or a child profile, so both come from seed data
(see Seed data below).

## Navigation

Replace the scaffold's `AppTabs` (Home/Explore) with file-based routes under `src/app/`:

```
src/app/
  _layout.tsx            SessionProvider + theme; runs the boot-time token check
  index.tsx              role gate: "I'm a Parent" / "I'm a Kid"
  (admin)/
    _layout.tsx          redirects to ./login when there is no valid token
    login.tsx            email + password
    chores.tsx           chore list + new-chore form + mark-done flow
  (kid)/
    profiles.tsx         profile picker
    [id].tsx             a child's balance + completed chores
```

The role gate at `index` is the home both areas return to. The admin group is
auth-guarded; the kid group is open. The scaffold's health-check `index.tsx` is replaced
by the role gate; `explore.tsx` and `AppTabs` are removed.

## Session and API layer

State lives in a React context, no external data library. This is a four-screen loop; a
cache/query dependency would be more machinery than it earns.

**`SessionProvider`** holds `{ status, token, user }` where `status` is
`loading | signedOut | signedIn`.

- On boot, read the token from `expo-secure-store`. If one exists, call `GET /me` to
  check it. A valid response moves to `signedIn`; a missing token or a `401` moves to
  `signedOut` and clears the stored value. `status` stays `loading` until this resolves,
  so the admin group never flashes the login screen for an already-signed-in user.
- `signIn(email, password)` calls `POST /auth/login`, writes the token to secure-store,
  and sets the context.
- `signOut()` deletes the stored token, clears the context, and routes back to the role
  gate.

**`src/lib/api.ts`** stays the single client. It keeps `apiFetch`/`getHealth`/`API_URL`
and gains typed functions and entity types:

- Types `Admin`, `Chore`, `ChildProfile`, `CompletedChore`, mirroring the JSON above.
- `login(email, password)`, `getMe(token)`.
- `listChores(token)`, `createChore(token, input)`, `completeChore(token, id, input)`.
- `listChildProfiles()`, `getChildProfile(id)` — no token.

Non-2xx responses raise the existing `ApiError`. Screens catch it and show an inline
message with a retry control.

## Screens

**Role gate (`index`).** Two large buttons. "I'm a Parent" routes into the admin group,
which bounces to `login` when there is no token. "I'm a Kid" routes to the kid profiles
screen.

**Admin login (`(admin)/login`).** Email and password fields; submit calls `signIn`. A
`401` shows "invalid email or password" inline. Success redirects to the chores screen.

**Admin chores (`(admin)/chores`).** The admin hub.

- Lists chores newest-first: title, reward, and status (open, or completed with its
  grade).
- A "New chore" form collects title, description, and reward coins, posts it, and
  refetches.
- Each open chore has "Mark done", which opens a modal: pick a child from
  `listChildProfiles`, then set a grade with a 1–5 star row that shows the resulting
  coins live (for example "4★ → 8 of 10 coins"). Confirming calls `completeChore` and
  refetches. Completed chores show who completed them and the grade, with no action.
- A header offers "Log out" and a link back to the role gate.

**Kid profiles (`(kid)/profiles`).** Lists profiles from `listChildProfiles` as tappable
cards showing name and current balance. Tapping opens that child's screen.

**Kid balance (`(kid)/[id]`).** Shows the balance prominently as Faye Coins, then the
completed chores (title, grade as stars, coins awarded, date). A refresh control reloads.
A link returns to the role gate.

**Cross-cutting.** Screens refetch on focus with `useFocusEffect`, so a chore completed
in the admin area appears when the kid screen is opened. Loading shows a spinner; errors
show an inline message and a retry.

## Seed data

`backend/db/seeds.rb` makes the loop runnable end-to-end, since admins and children can
only exist through seeds. It creates (idempotently):

- one `Family`,
- one admin `User` with a known email and password,
- two `ChildProfile` rows under that family.

The seed prints the admin email so the developer knows the login. If a `seeds.rb` already
exists, extend it rather than replace it.

## Environment and config

`EXPO_PUBLIC_API_URL` already drives the base URL, defaulting to `http://10.0.2.2:3000`
for the Android emulator. No change beyond confirming `.env.example` documents it.

New dependency: `expo-secure-store` (installed with `npx expo install` so the version
matches SDK 57).

## Testing

Manual end-to-end walk on Android against a locally running backend, recorded as a
checklist in `docs/`:

1. Seed the backend; start Rails and the Expo dev server.
2. Role gate → Parent → log in with the seeded admin.
3. Create a chore with a reward; confirm it appears as open.
4. Mark it done for a child at a chosen grade; confirm the awarded coins match
   `grade/5 × reward` and the chore shows completed.
5. Role gate → Kid → open that child; confirm the balance and the completed chore match.
6. Restart the app; confirm the admin is still signed in (secure-store) and the kid view
   still reads.

Automated mobile tests are out of scope here, consistent with the scaffold's deferral.

## Out of scope

- Peso conversion and the coin bank (PC-3).
- Creating admins or child profiles from the app.
- Media, push, and the design-system polish (PC-4, PC-5, PC-6).
- Multi-family support; the backend is single-family for the MVP.
