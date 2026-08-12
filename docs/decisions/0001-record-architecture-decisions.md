# 1. Record architecture decisions

Date: 2026-08-12

## Status

Accepted

## Context

We want a lightweight, durable record of significant technical decisions so future
contributors (human or AI) understand *why* the code is the way it is.

## Decision

Use short Architecture Decision Records (ADRs) in `docs/decisions/`, numbered sequentially
(`0001-...`, `0002-...`). Each records context, the decision, and its consequences.

Initial decisions already made (see the MVP design spec for detail):

- **Monorepo** with `backend/` (Rails API) + `mobile/` (Expo).
- **Append-only coin ledger** — balance is derived (`SUM`), never stored mutably.
- **Admins authenticate; kids are login-less child profiles.**
- **Expo (React Native)** for cross-platform, Android first.
- **Railway** for backend hosting.

## Consequences

New significant decisions get a new ADR. The design spec at
`docs/superpowers/specs/2026-08-12-chore-app-mvp-design.md` remains the fuller narrative.
