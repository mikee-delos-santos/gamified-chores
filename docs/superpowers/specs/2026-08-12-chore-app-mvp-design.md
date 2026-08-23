# Gamified Chores App — MVP Design

_Date: 2026-08-12_

## Purpose

A gamified chores app for the owner's kids. Admins (the owner + spouse) create chores with a
coin reward ("**Faye Coins**"). Kids earn coins when a chore is marked done, can store and
withdraw them, and see a Philippine-peso (PHP) equivalent controlled by the admin. Prototype
on **Android first**, iOS later.

## Scope

**First slice (MVP core loop):** admin creates a text chore with a coin reward → admin marks
it done for a child → coins are awarded → the child sees their updated balance and completed
chores. Android only, crude UI.

**Explicitly deferred** to later epics (schema-friendly, no rework expected): photo
attachments (kid proof + admin how-to), push notifications, store/withdraw + peso exchange
rate, polished UI. **Video is dropped entirely** (kid proof and parent how-to) so a PWA stays
viable on iOS; see ADR 0002.

## Architecture & stack

- **Backend:** Rails 8 API-only + PostgreSQL, deployed on Railway. Serves a JSON API.
- **Mobile:** Expo (React Native + TypeScript), single codebase, with **web/PWA as the
  primary target** (installable from the browser, no store or sideload friction). Native
  Android/iOS via EAS Build is kept as a later option, not the near-term path (ADR 0002). One
  codebase with two areas, an **Admin** area and a **Kid** area, chosen at login /
  profile-select.
- **Data flow:** App ↔ Rails JSON API over HTTPS. Fetch-on-demand; no realtime in the MVP
  (push arrives in a later epic).
- **Repo:** monorepo — `backend/`, `mobile/`, `docs/`.

## Identity model

- **Admins** (owner + spouse) have real accounts: email + password, authenticated with JWT.
- **Kids** are **child profiles** under the family with **no login**. The kid app picks a
  profile. This matches how young kids use a shared tablet and avoids auth friction.

## Data model (core loop)

Coins use an **append-only ledger** — a child's balance is the sum of their transaction rows,
never a mutable column. Every award/store/withdrawal is an auditable entry, and later
transaction types drop in without schema rework or risk of a drifting balance.

```
User            # admin accounts only (owner + spouse)
  email, password_digest, name, role: :admin

Family          # single row for now; scopes everything
  name

ChildProfile    # kids — NO login
  family_id, name, avatar (later)

Chore
  family_id, created_by (User), title, description,
  reward_coins (int), status: :open | :completed,
  completed_by (ChildProfile, nullable), completed_at

CoinTransaction # the ledger
  child_profile_id, amount (int, + earn / - spend),
  source_type (:chore_reward for now), source_id (Chore),
  created_at
```

## Core loop, in these terms

1. Admin `POST /chores` → `Chore(open, reward_coins)`.
2. Admin `POST /chores/:id/complete` with `child_profile_id` → in a **single DB transaction**:
   set the chore completed (`completed_by`, `completed_at`) **and** write one
   `CoinTransaction(+reward_coins)`. **Idempotent** — completing an already-completed chore is
   rejected, never double-awards.
3. Kid view `GET /child_profiles/:id` → returns `balance = SUM(amount)` plus that child's
   completed chores.

## API surface (MVP)

- `POST /auth/login` → JWT (admin).
- `POST /chores`, `GET /chores` (admin).
- `POST /chores/:id/complete` (admin) — awards coins idempotently.
- `GET /child_profiles`, `GET /child_profiles/:id` — profile picker + balance/read model.

## Error handling & edge cases

- Re-completing a completed chore: rejected (no double award).
- Withdrawals that exceed balance: rejected (introduced with the Coin Bank epic).
- Auth: admin-only endpoints reject requests without a valid JWT; kid read endpoints are
  unauthenticated for the MVP.

## Testing

- Backend: RSpec request + model specs; run against a Dockerized Postgres. Key cases: award
  happens exactly once, balance = sum of ledger, auth rejection.
- Mobile: manual end-to-end walk of the core loop on Android against the deployed API,
  captured as a checklist in `docs/`.

## Roadmap (Jira project PC)

- **PC-1 — Project & Infra Setup:** monorepo scaffold, Rails boot, Railway deploy, Expo/Android
  scaffold, Apple Developer membership (owner).
- **PC-2 — MVP Core Loop:** the slice above.
- **PC-3 — Coin Bank & Peso Exchange:** store/withdraw + admin-controlled PHP rate.
- **PC-4 — Media Attachments:** photo proof from kids; photo + text how-to on chores from
  admins. Video is out of scope (ADR 0002).
- **PC-5 — Push Notifications:** Expo push on new chore.
- **PC-6 — UI Polish:** implement the Claude Design mockups.
