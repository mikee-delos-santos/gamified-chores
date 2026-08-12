# CLAUDE.md — mobile/

**Expo** (React Native + TypeScript) app for gamified-chores. Android first, iOS later.

> The Expo app is scaffolded in **PC-10 — Expo scaffold, runs on Android via EAS**. Until
> then this directory holds only this file.

## Conventions (once the app exists)

- Expo + TypeScript. Navigation via expo-router (or React Navigation — decide in PC-10).
- One app binary, two modes: an **Admin** area (login, create chore, mark done) and a **Kid**
  area (pick profile, see chores + Faye Coin balance). No kid login.
- API base URL is env-driven (points at the Railway backend).
- Builds via **EAS Build**; produce an installable **Android APK** for the prototype.

## Local dev / sanity checks

- Run against the deployed Railway API, or a locally-running backend (see `backend/CLAUDE.md`).
- Keep UI crude until the Claude Design mockups land (Epic F — UI Polish).

## House rules

See root `CLAUDE.md`: no AI co-author on commits; cite tickets as `PC-XX — short description`.
