# CLAUDE.md — backend/

Ruby on Rails **API-only** app for gamified-chores. **Rails 8.1**, Ruby 3.3, PostgreSQL.
Deploys to Railway. Scaffolded in **PC-8 — Rails API-only app boots locally**.

## Stack notes

- Rails 8.1, `--api` mode, PostgreSQL (`pg`).
- Solid Queue / Solid Cache / Solid Cable are included (Rails 8 defaults; DB-backed, no Redis).
  Background jobs (e.g. push in Epic E) will use Solid Queue.
- Kamal was skipped — we deploy on **Railway** using the **Railpack** builder, configured in
  `railway.json` (builder + start command). The Rails-generated Dockerfile is parked as
  `Dockerfile.disabled` so Railway doesn't auto-build with it; it still works locally via
  `docker build -f Dockerfile.disabled`.
- **Tests are intentionally deferred** for now (`--skip-test`); add RSpec later before the
  logic-heavy tickets (auth, chores, ledger).

## Running locally (Docker)

No Ruby is installed on the host — everything runs in containers.

- Start Postgres: `docker compose up -d db` (from repo root; host port **5433**, container 5432).
- The app reaches Postgres over the compose network at `db:5432`. Point Rails at it with
  `DATABASE_URL=postgres://chore:chore@db:5432/chore_development` when running an app container
  on the `chore-app_default` network.
- Rails auto-merges `DATABASE_URL` over `config/database.yml`.

## Endpoints so far

- `GET /up` — Rails' built-in HTML health check (for load balancers).
- `GET /health` — JSON `{ "status": "ok", ... }` for the API + the mobile connectivity probe.

## Conventions (as the app grows)

- Keep controllers thin; award/ledger logic in models or service objects.
- **Coins ledger:** never store a mutable balance; balance = `SUM(coin_transactions.amount)`.
  Awarding a chore writes the completion + the coin transaction in one DB transaction, and is
  idempotent.
- Admin-only endpoints require a valid JWT; kid-facing read endpoints do not authenticate.

## House rules

See root `CLAUDE.md`: no AI co-author on commits; cite tickets as `PC-XX — short description`.
