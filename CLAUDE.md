# CLAUDE.md — gamified-chores

AI + contributor instructions for this repo. Read this first.

## What this is

A gamified chores app for the owner's kids ("**Faye Coins**"). Admins (the owner + spouse)
create chores with a coin reward; kids earn coins when a chore is marked done, can store
and withdraw them, and see a PHP-peso equivalent controlled by the admin.

## Monorepo layout

| Path        | What lives here                                             |
|-------------|------------------------------------------------------------|
| `backend/`  | Ruby on Rails **API-only** app + PostgreSQL. Deploys to Railway. |
| `mobile/`   | **Expo** (React Native + TypeScript) app. Android first, iOS later. |
| `docs/`     | Design specs (`docs/superpowers/specs/`) and ADRs (`docs/decisions/`). |
| `docker-compose.yml` | Local Postgres for dev + tests.                   |

Each subtree has its own `CLAUDE.md` with tool/build/test specifics — read the one for the
area you're working in.

## Stack

- **Backend:** Rails 8 (API-only), PostgreSQL, deployed on Railway.
- **Mobile:** Expo / React Native + TypeScript, builds via EAS (Android APK first).
- **Project management:** Jira project **PC** ("Project Chore") on
  `markrdelossantos.atlassian.net`.

## House rules (non-negotiable)

1. **No AI attribution.** Do **not** add a `Co-Authored-By: Claude ...` trailer (or any AI
   co-author) to commits, and do **not** put a "Generated with Claude Code" snippet (or
   similar) in PR descriptions.
2. **Cite Jira tickets with a short title, never the bare ID.** Write
   `PC-XX — short description` (e.g. `PC-8 — Rails app boots locally`), so a reader always
   knows what the ticket is without opening Jira.
3. **Use Docker for local checks.** Prefer `docker compose` (Postgres, test runs) over
   installing native services on the host.

## Core design (MVP)

- **Identity:** admins have real accounts (email + password, JWT). Kids are **child profiles**
  under the family with **no login**.
- **Coins are an append-only ledger.** A child's balance is `SUM(coin_transactions.amount)`,
  never a mutable column. Awards, stores, and withdrawals are all ledger entries.
- Full architecture + data model: `docs/superpowers/specs/2026-08-12-chore-app-mvp-design.md`.

## How the app actually works (read this before exploring)

Single family for the MVP (`Family.first`). One admin account belongs to a family; kids are
`ChildProfile` rows under it. Everything hangs off the family.

**Data model** (`backend/app/models`, `backend/db/schema.rb`):

- `Family` has_many `users` (admins), `child_profiles`, `chores`, `chore_templates`.
  Holds `pin` (kid device bind) and `peso_per_coin` (admin-set exchange rate).
- `ChildProfile` - a kid. `balance` is a method = `SUM(coin_transactions.amount)`, never stored.
- `Chore` - a task with `title`, `description`, `reward_coins` (decimal, so a star grade can award
  a fraction), `status` enum (`open`/`completed`/`rejected`/`expired`), `grade` (1-5), and
  `proof_by_child` (which kid submitted proof). Media via Active Storage:
  `has_many_attached :how_to_photos` (admin guidance) and `has_many_attached :proof_photos`
  (kid's done-photos). Both are multi-image. Photo-only by ADR 0002.
- `ChoreTemplate` - a reusable chore an admin posts on demand. Carries `how_to_photos` that copy
  onto each posted chore (by blob, no re-upload).
- `CoinTransaction` - the ledger. `amount` (+/-), `reason` enum, optional `chore` link.
- `CashOutRequest` - a kid asking to convert coins to pesos; admin approves.
- `PushSubscription` - Web Push endpoints for the family (notifications via `PushNotifier`).

**Chore lifecycle:** admin creates a chore (or posts from a template) -> kid opens it, attaches
one or more proof photos, taps "I did it!" (`POST /chores/:id/proof`, unauthenticated, sets
`proof_by_child`, notifies the family) -> the chore shows up in the admin Review queue (open
chores that have proof) -> admin awards full or a 1-5 star grade (`POST /chores/:id/complete`),
which writes the completion + a `CoinTransaction` in one transaction, idempotently.

**API surface** (`backend/app/controllers`, routes in `config/routes.rb`):

- Auth: `POST /signup`, `POST /login` (JWT), `GET /me`.
- Chores (admin, JWT): `GET/POST /chores`, `PATCH/DELETE /chores/:id`,
  `POST /chores/:id/complete`, `POST /chores/:id/expire`.
- Chores (kid, no auth): `GET /open_chores`, `POST /chores/:id/proof`.
- Templates (admin): `GET/POST /chore_templates`, `PATCH /chore_templates/:id`,
  `POST /chore_templates/:id/post_chore`.
- Coin bank: child balances/transactions, `peso_per_coin`, cash-out requests.
- Health: `GET /health` (JSON), `GET /up` (Rails HTML).

Chores serialize through `chore_json` (duplicated in `ChoresController` and
`ChoreTemplatesController`). Photo fields are `how_to_photo_urls` (array), `proof_photo_urls`
(array), plus `proof_photo_url` (first proof url, kept for older PWA clients).

**Mobile structure** (`mobile/src/app`, expo-router file routes; one binary, two areas):

- `(admin)/` - JWT area. Tabs: Review (needs-review queue + badge, `use-review-queue.ts`),
  Chores (create/edit, how-to photos), Bank, Kids. `review/[cid].tsx` is the award screen.
- `(kid)/` - no login, device bound to a kid via PIN. Tabs list open chores;
  `chore/[cid].tsx` is where the kid attaches proof photos and submits.
- `src/lib/api.ts` is the whole backend client (types + fetch calls).
  `src/lib/pick-images.ts` + `components/ui/photo-source-sheet.tsx` handle gallery/camera;
  `components/ui/photo-thumbs.tsx` renders a read-only thumbnail strip.

## Roadmap

Tracked in Jira project PC. Build order: **PC-1 (Infra) → PC-2 (MVP core loop)**, then
Coin Bank, Media, Push, and UI polish epics. See the spec and the Jira board.
