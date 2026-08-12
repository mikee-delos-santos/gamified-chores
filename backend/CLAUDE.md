# CLAUDE.md — backend/

Ruby on Rails **API-only** app for gamified-chores. PostgreSQL. Deploys to Railway.

> The Rails app itself is scaffolded in **PC-8 — Rails API-only app boots locally**. Until
> then this directory holds only this file.

## Conventions (once the app exists)

- Rails 7, `--api` mode, PostgreSQL.
- Tests: RSpec (request + model specs). Run the suite in Docker (see root `docker-compose.yml`).
- Keep controllers thin; put award/ledger logic in models or service objects.
- **Coins ledger:** never store a mutable balance; balance = `SUM(coin_transactions.amount)`.
  Awarding a chore writes the completion + the coin transaction in one DB transaction, and is
  idempotent (completing an already-completed chore must not double-award).
- Admin-only endpoints require a valid JWT; kid-facing read endpoints do not authenticate.

## Local dev / sanity checks (Docker)

- `docker compose up -d db` — start Postgres.
- Point `DATABASE_URL` at the compose Postgres for local runs and tests.
- Prefer running migrations + the test suite against the Dockerized DB.

## House rules

See root `CLAUDE.md`: no AI co-author on commits; cite tickets as `PC-XX — short description`.
