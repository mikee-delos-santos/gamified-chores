# PWA-first distribution (execute ADR 0002)

Date: 2026-08-23

## Goal

Turn the existing Expo core-loop app into an installable Progressive Web App and deploy it
live on Railway, pointing at the production backend. This is the code and infrastructure
follow-through for ADR 0002 (PWA-first, drop video). Scope is an MVP that a family member can
add to a phone home screen today.

Out of scope: offline data caching, push notifications (PC-5), the media epic (PC-4), and any
UI polish (PC-6). The web app looks as crude as the current native app; that is expected.

## Current state

- `mobile/` is an Expo SDK 57 app (expo-router, react-native-web already a dependency) with a
  working core loop: admin login/chores and kid profiles/detail, all wired to the Rails API
  through `src/lib/api.ts`.
- Backend is live at `https://gamified-chores-production.up.railway.app` (Railway project
  `gamified-chores`, service `gamified-chores`, production environment).
- Two things block a working web build:
  1. `src/lib/session.tsx` calls `expo-secure-store` directly, which throws on web, so the
     admin session breaks at boot.
  2. `rack-cors` is disabled on the backend, so a cross-origin PWA cannot call the API.

## Design

### 1. Web render mode

Change `app.json` `web.output` from `"static"` to `"single"` (SPA). The kid detail route
`(kid)/[id]` is data-driven, and static export would require `generateStaticParams` for ids
that are unknown at build time. SPA mode emits a single `index.html` with client-side routing,
which is the right model for an installable app and gives the service worker a clean navigation
fallback.

### 2. Token storage shim

Add `src/lib/token-store.ts` exposing `getToken`, `setToken`, `deleteToken`. On native it uses
`expo-secure-store`; on web (`Platform.OS === 'web'`) it uses `window.localStorage`. Rewrite
`session.tsx` to call the shim instead of `SecureStore` directly, keeping the existing boot,
sign-in, and sign-out behavior. Storing the JWT in `localStorage` is acceptable: the app is
device-bound and family-only, and only the admin area holds a token.

### 3. PWA shell

Add `src/app/+html.tsx` (Expo Router's web HTML customization point). In `<head>` inject:

- `<link rel="manifest" href="/manifest.webmanifest">`
- `<meta name="theme-color" content="#208AEF">`
- iOS: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`,
  `apple-mobile-web-app-title` = "Faye Coins", and `<link rel="apple-touch-icon" ...>`
- a mobile viewport meta tag
- an inline script that registers `/sw.js` on `load` when `serviceWorker` is available

Static PWA assets live in `mobile/public/`, which Expo copies to the web export root.

### 4. Manifest and icons

`public/manifest.webmanifest`: `name` "Faye Coins", `short_name` "Faye Coins",
`start_url` "/", `display` "standalone", `background_color` and `theme_color` `#208AEF`,
`icons` for 192 and 512 (with a maskable entry). Generate `icon-192.png`, `icon-512.png`, and
a 180px `apple-touch-icon.png` from the existing `assets/images/icon.png`, written into
`public/`.

### 5. Service worker (network-first)

`public/sw.js`: network-first for same-origin navigations and GET requests; fall back to the
cache only when the network fails. Use `skipWaiting` and `clients.claim` so a new deploy takes
control on the next load. It controls the app shell only (same origin); the cross-origin API is
never intercepted, so data is always fresh and code updates stay effectively instant, matching
ADR 0002's "instant updates from a URL".

### 6. Backend CORS

Enable `rack-cors` (uncomment the gem, `bundle install`). Configure
`config/initializers/cors.rb` to allow origins from a `CORS_ORIGINS` env var (comma-separated),
defaulting to `http://localhost:8081` for local dev. Allow all methods and headers on `*`.

### 7. Deploy: Railway static web service

Create a second service in the `gamified-chores` project, root directory `mobile/`:

- Build: `npm ci && npx expo export -p web` (outputs `dist/`).
- Start: `npx serve -s dist -l $PORT` (`-s` gives SPA fallback). Add `serve` to
  `mobile/package.json` dependencies so it is present at runtime.
- Build-time variable: `EXPO_PUBLIC_API_URL=https://gamified-chores-production.up.railway.app`.
- Generate a Railway domain for the new service.
- Set `CORS_ORIGINS` on the backend service to the new web domain, then redeploy the backend.

A `mobile/railway.json` pins the builder and start command so the service is reproducible.

### 8. Verification

Local: `npx expo export -p web`, serve `dist/`, load in Chrome and confirm the app boots, admin
login persists across a reload, the kid flow works, the manifest is detected as installable, the
service worker registers, and an offline reload still serves the shell.

Live: after deploy, load the web domain and smoke-test the admin login and kid flow end to end
against the production API. Confirm the app is installable to the home screen.

## Risks

- SPA mode changes routing behavior on web; verify deep links and the kid `[id]` route resolve
  client-side.
- `localStorage` is cleared if the user clears site data; the admin simply re-logs in. iOS may
  evict PWA storage after long disuse (already noted in ADR 0002).
- react-native-web may render some native-only components differently; the current UI is simple,
  so this is low risk, but it is the main thing to watch during verification.
