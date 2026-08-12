# gamified-chores

A gamified chores app for our kids. Admins create chores with a **Faye Coin** reward; kids
earn coins when chores are marked done, store/withdraw them, and see a PHP-peso equivalent.

## Monorepo

- **`backend/`** — Ruby on Rails API-only + PostgreSQL (deploys to Railway).
- **`mobile/`** — Expo (React Native + TypeScript) app; Android first, iOS later.
- **`docs/`** — design specs (`docs/superpowers/specs/`) and architecture decisions
  (`docs/decisions/`).

See [`CLAUDE.md`](./CLAUDE.md) for stack, conventions, and contributor rules, and
[`docs/superpowers/specs/2026-08-12-chore-app-mvp-design.md`](./docs/superpowers/specs/2026-08-12-chore-app-mvp-design.md)
for the architecture and data model.

## Status

Early prototype. Project management lives in Jira project **PC** ("Project Chore"). Build order:
infrastructure → MVP core loop (create chore → mark done → award coins → see balance) →
coin bank → media → push → UI polish.

## Local development

Requires Docker Desktop (for Postgres + test runs). Per-subtree setup instructions live in
`backend/CLAUDE.md` and `mobile/CLAUDE.md` as each app is scaffolded.
