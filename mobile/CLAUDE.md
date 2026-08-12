# CLAUDE.md — mobile/

**Expo** (React Native + TypeScript) app for gamified-chores. Android first, iOS later.
Scaffolded in **PC-10 — Expo scaffold, runs on Android via EAS**.

> Expo moves fast — check the versioned docs at https://docs.expo.dev/versions/v57.0.0/ before
> writing Expo/RN code (see `AGENTS.md`).

## Stack & structure

- Expo SDK 57, React Native, TypeScript, **expo-router** (file-based routing under `src/app/`).
- `src/lib/` — shared non-UI code (e.g. `api.ts`, the backend client).
- `src/components/`, `src/constants/`, `src/hooks/` — UI building blocks from the starter;
  reuse `ThemedText` / `ThemedView` for consistency until the design system lands (Epic F).

## Backend connection

- The API base URL comes from **`EXPO_PUBLIC_API_URL`** (see `.env.example`). Expo inlines any
  `EXPO_PUBLIC_*` var at build time.
- Android emulator reaches the host machine at `10.0.2.2`, not `localhost`.
- `src/lib/api.ts` exposes `apiFetch`, `getHealth`, and `API_URL`. The home screen pings
  `/health` to show backend connectivity.

## Commands

- `npm run android` — start the dev server + open on Android (device/emulator).
- `npm run web` — quick sanity check in a browser.
- EAS builds (need an Expo login — owner action): `eas init`, then
  `eas build --platform android --profile preview` for an installable APK. Profiles live in
  `eas.json`.

## Conventions

- One binary, two modes: an **Admin** area and a **Kid** area (no kid login). Screens arrive in
  **PC-16 — mobile admin screens** and **PC-17 — mobile kid screens**.
- Keep UI crude until the Claude Design mockups (Epic F — UI Polish).

## House rules

See root `CLAUDE.md`: no AI co-author on commits; cite tickets as `PC-XX — short description`.
