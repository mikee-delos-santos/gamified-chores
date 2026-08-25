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

## Endpoints

The full route + model + lifecycle map lives in the root `CLAUDE.md` ("How the app actually
works"). Health checks: `GET /up` (Rails HTML, for load balancers) and `GET /health` (JSON
`{ "status": "ok", ... }`, used by the mobile connectivity probe).

## MCP endpoint (AI agents)

`POST /mcp` is a JSON-RPC Model Context Protocol endpoint (`mcp` gem, Streamable HTTP, tools-only)
that authenticated AI agents connect to. `McpController` reuses the admin JWT for auth and scopes
every tool to the admin's family; the six tools live in `app/services/chore_mcp/` and call the same
`app/services/chores/` operations and `ChoreSerializer` the REST controllers use, so both surfaces
behave identically.

## Media attachments

Photos use Active Storage (photo-only, ADR 0002). `Chore` has `has_many_attached :how_to_photos`
and `has_many_attached :proof_photos`; `ChoreTemplate` has `has_many_attached :how_to_photos`.
Uploads come in as multipart arrays (`how_to_photos[]`, `proof_photos[]`) and **append**. The
proof endpoint also still accepts a singular `proof_photo` for older PWA clients. If you ever
rename an attachment, add a data migration to rename the `active_storage_attachments.name` rows
or existing blobs orphan (prod has real data - see the memory on live production data).

## Conventions (as the app grows)

- Keep controllers thin; award/ledger logic in models or service objects.
- **Coins ledger:** never store a mutable balance; balance = `SUM(coin_transactions.amount)`.
  Awarding a chore writes the completion + the coin transaction in one DB transaction, and is
  idempotent.
- Admin-only endpoints require a valid JWT; kid-facing read endpoints do not authenticate.

## House rules

See root `CLAUDE.md`: no AI co-author on commits; cite tickets as `PC-XX — short description`.
