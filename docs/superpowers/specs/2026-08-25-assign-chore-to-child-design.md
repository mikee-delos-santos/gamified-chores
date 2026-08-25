# Assign a chore to a specific child

Status: approved (2026-08-25)
Jira: PC-69 — Assign a chore to a specific child (targeted chore + push)

## Problem

Today every chore is family-wide: it shows up in every kid's open list, any kid can submit
proof, and every enrolled device (parents and all kids) gets the push notification. The owner
wants to give one chore to one kid - only that kid should see it and do it, and only the parents
plus that one kid should be notified about it. Assignment is optional; an unassigned chore keeps
today's family-wide behavior.

## Why this is not trivial

Push subscriptions are currently keyed to the **family only** (`push_subscriptions.family_id`,
unique by `endpoint`). Kid devices are unauthenticated, so there is no link from a subscription
to a specific kid. Targeting a push at "parents + this one kid" is impossible until each
subscription records whose device it is. The kid app already binds a device to one kid
(`getBoundKid()` in `mobile/src/lib/device-session.ts`), so the kid id is available at
subscribe time - we just need to persist it.

## Design

### Data model (two nullable FKs, expand-only)

- **`chores.child_profile_id`** (nullable FK -> `child_profiles`). `NULL` = unassigned (open to
  all kids, current behavior). Set = assigned to exactly that kid.
- **`push_subscriptions.child_profile_id`** (nullable FK -> `child_profiles`). `NULL` = a
  parent/admin device. Set = that kid's device. This is what makes targeted push possible.

Both columns are nullable with no backfill. Existing chores stay unassigned; existing
subscriptions stay parent-tagged. Safe on live production data (expand-only, no contract step).

### Backend

- **`Chore`** `belongs_to :assigned_to, class_name: "ChildProfile", optional: true`
  (FK column `child_profile_id`). Add `scope :visible_to_kid` returning unassigned chores plus
  chores assigned to that kid.
- **`PushSubscription`** `belongs_to :child_profile, optional: true`.
- **`PushNotifier.notify_chore(chore, title:, body:, url:)`**: if `chore.assigned_to` is set,
  deliver only to the family's subscriptions where `child_profile_id IS NULL` (parents) OR
  `child_profile_id = chore.assigned_to_id` (that kid). If unassigned, fall back to the existing
  family-wide `notify_family`. Keep the same best-effort delivery/pruning as `notify_family`.
- **`ChoresController`**:
  - `create` / `update` permit `child_profile_id` (validated to belong to the family; blank
    clears it). All chore-related push (`create`, `proof`, `complete`, `reject`, `destroy`)
    routes through `notify_chore` instead of `notify_family`.
  - `open` (kid-facing `GET /open_chores`) accepts `child_profile_id` and returns
    `visible_to_kid`. If no kid id is passed, it returns only unassigned chores (an assigned
    chore is never leaked to an unknown/other device).
  - `chore_json` adds `assigned_to` (`{ id, name, color }` or `null`), mirroring the existing
    `proof_by` shape.
- **`PushController#subscribe`** accepts an optional `child_profile_id`; when present and valid
  for the family it tags the subscription, otherwise the subscription stays parent-tagged.

### Mobile

- **`api.ts`**: `Chore` type gains `assigned_to`; `createChore`/`updateChore` accept an optional
  kid id; `listOpenChores(kidId)` passes `child_profile_id`; the push subscribe body includes the
  bound kid id on kid devices.
- **Admin chore create/edit** (`(admin)/(tabs)/chores.tsx` and `(admin)/chore/[cid].tsx`): an
  optional "Assign to" row - "Anyone" (default) plus one chip per kid, reusing the existing
  kid-color chip styling. Editing shows the current assignee.
- **Kid app**: `listOpenChores` sends the bound kid id (so a kid only ever loads their own +
  unassigned chores); `enableNotifications()` sends the bound kid id so the subscription is
  tagged to that kid.

### Migration / prod safety

Expand-only, both columns nullable, no backfill. One transitional caveat: a kid device that
already enabled notifications before this change keeps its `NULL` (parent) tag until the app
re-subscribes on next launch, so it may receive family-wide pushes in the meantime. It
self-heals the next time the kid app runs `enableNotifications`.

## Out of scope (YAGNI)

- Assigning one chore to several kids (single assignee only).
- Reassigning via a dedicated endpoint (handled by the normal chore `update`).
- Per-kid templates (`ChoreTemplate` stays family-wide).

## Testing

- Model: `Chore.visible_to_kid` returns unassigned + own, excludes other kids' assigned chores.
- `PushNotifier.notify_chore` targets parents + the assigned kid only when assigned, and the
  whole family when unassigned (assert recipient set, stub `deliver`).
- Controller: `GET /open_chores?child_profile_id=` filters correctly; `create`/`update` set and
  clear the assignee; assignee outside the family is rejected.
- Mobile: `listOpenChores` and subscribe send the bound kid id; admin picker sets the field.
