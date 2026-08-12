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

1. **No AI co-author on commits.** Do **not** add a `Co-Authored-By: Claude ...` trailer
   (or any AI co-author) to commits in this repo.
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

## Roadmap

Tracked in Jira project PC. Build order: **PC-1 (Infra) → PC-2 (MVP core loop)**, then
Coin Bank, Media, Push, and UI polish epics. See the spec and the Jira board.
