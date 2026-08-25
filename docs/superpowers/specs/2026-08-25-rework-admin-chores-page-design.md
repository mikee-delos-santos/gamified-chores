# Rework admin chores page

Status: approved (2026-08-25)
Jira: PC-72 — Rework admin chores page (active/archived split, pagination, auto-notifications, recurring toggle)

## Problem

The admin Chores tab has grown unwieldy now that production holds many chores. It mixes the
create form, a recurring-templates section, a Notifications opt-in card, and one flat "All chores"
list containing every status (open, completed, rejected, expired). With real data that list is
long and slow to scan.

## Design

### Chores tab (index) — segmented `Active | Recurring`

A segmented control at the top swaps the list in place.

- **Active**: the one-off "New chore" create form (the "Make recurring" checkbox is removed),
  a "Done & archived" link, then an infinite-scroll paginated list of `open` chores only.
- **Recurring**: a "New recurring chore" create form + the templates list. Template creation
  moves here (it used to be the removed checkbox). Templates stay unpaginated (there are few).

The Notifications opt-in card is removed from this page.

### Archive sub-page — new route `(admin)/archive`

Reached by the "Done & archived" link as a pushed stack screen (like `chore/[cid]`), so the
4-tab bar is untouched. Filter chips select one status at a time: **Done** (`completed`),
**Rejected** (`rejected`), **Expired** (`expired`); each is its own infinite-scroll paginated list.

### Backend — pagination + two targeted endpoints

- `GET /chores` gains `page` (1-based) and optional `per` (default 20, capped). Returns one page
  of chores for the given `status`, newest first. The response stays a bare JSON array; the client
  requests the next page until it receives fewer than `per` items.
- `GET /chores?needs_review=1` returns the open chores that have proof attached, **unpaginated**,
  so the Review badge count stays exact. `use-review-queue.ts` switches from "fetch all + filter"
  to this.
- `GET /chores/:id` — a new `show` action returning `chore_json`, or 404. `chore/[cid].tsx`
  fetches the single chore instead of scanning the whole list.

`needs_review` and pagination compose with `status`; `needs_review` ignores paging (the set is
small and drives a count).

### Automatic notifications — remove the opt-in card

Web push permission can only be requested from a user gesture, so "automatic" means:

- On admin/kid area boot: if `permissionState() === 'granted'`, call the existing subscribe path
  silently (no prompt). This re-enrolls reinstalls and re-tags kid devices every launch.
- On the first gesture of a fresh install — parent **login submit**, kid **PIN unlock** — if
  `permissionState() === 'default'`, fire the one permission request there. If `denied`, do nothing.

`NotificationsCard` is deleted (removed from `admin/(tabs)/chores.tsx` and `kid/(tabs)/me.tsx`).
The logic moves into a `usePushAutoEnroll()` hook (the silent-on-boot half) plus a one-line
`requestNotificationsOnGesture()` call wired into the login and PIN-unlock handlers. The manual
"Send test" button is dropped with the card; the `sendTestNotification` API stays available for a
future placement if a grown-up needs to fire a test.

## Components

- `mobile/src/lib/push.ts`: add `ensureSubscribedIfGranted()` (silent) and
  `requestIfDefault()` (gesture) built on the existing `enableNotifications` internals.
- `mobile/src/hooks/use-push-auto-enroll.ts`: calls `ensureSubscribedIfGranted()` on mount.
- `mobile/src/app/(admin)/(tabs)/chores.tsx`: segmented control, paginated active list,
  recurring segment, archive link; remove `NotificationsCard`.
- `mobile/src/app/(admin)/archive.tsx`: new archive screen with status chips + pagination.
- `mobile/src/app/(kid)/(tabs)/me.tsx`: remove `NotificationsCard`.
- Login + PIN-unlock screens: call `requestIfDefault()` on submit.
- `mobile/src/lib/api.ts`: `listChores` gains `{ status?, page?, per?, needsReview? }`;
  add `getChore(token, id)`.
- `backend/app/controllers/chores_controller.rb`: paginate `index`, add `needs_review`, add `show`.
- `backend/config/routes.rb`: add `:show` to the chores resource.

## Testing

- Backend request specs: `page`/`per` limit + newest-first ordering; `status` filter still works;
  `needs_review=1` returns only open-with-proof and ignores paging; `show` returns one chore and
  404s for a missing/other-family id.
- Mobile: `tsc --noEmit` clean; manual smoke — Active paginates on scroll, Recurring toggle
  creates/lists templates, Archive chips filter and paginate, and a granted device re-subscribes
  on boot with no prompt.

## Out of scope (YAGNI)

- Redesigning the create form itself (stays inline as the segment header).
- Search or per-status counts on the archive page.
- Template assignment (PC-71) or per-kid templates.
