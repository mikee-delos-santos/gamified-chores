# PC-79 — Done & archived: kid color-coding, kid photos, filter by kid

## Problem

When completed chores moved to the new Done & archived screen (PC-72), the per-kid color-coding
of DONE cards was lost. The active chores list still colors its cards by the kid who submitted
proof (`proof_by`), but the archive screen shows a flat, neutral card. We want the color-coding
back and more obvious, plus a photo of the kid who did each chore, and a way to filter the
screen by kid.

## Scope

Three changes, backend + mobile.

### 1. Kid photos (backend, Active Storage)

- `ChildProfile has_one_attached :photo`.
- A new rake task `chores:seed_kid_photos` attaches each kid's avatar from
  `backend/db/seed_assets/kids/<name>.<ext>` (jpg/jpeg/png/webp), matched by name
  case-insensitively. Idempotent: re-attaches only when the file name or size changes, so it is
  safe to re-run against production after dropping in new photos.
- `photo_url` (nullable) is serialized everywhere a kid appears:
  - `ChoreSerializer#child_ref` (so `proof_by` and `assigned_to` carry it),
  - the `child_profiles` index/show/create/update payloads.
- Mobile mirrors this: a shared `KidRef` type (`{ id, name, color, photo_url }`) on the chore,
  and `photo_url` on `ChildProfile`.

### 2. Card color-coding + circular kid badge (mobile, archive screen)

- Each Done card is color-coded to `proof_by`: a bold 6px left accent bar in the kid's color plus
  a light (~8% alpha) tint of that color as the card background. Cards with no `proof_by` keep the
  neutral look.
- A circular kid badge sits at the lower-right of the card: the seeded photo when present,
  otherwise the initials `Avatar`, both inside a pronounced ring in the kid's color. Extracted to
  a reusable `KidBadge` component (`mobile/src/components/ui/kid-badge.tsx`), also used in the
  filter chips.

### 3. Filter by kid (mobile + backend)

- A single-select chip row above the list: "All kids" plus one chip per kid (photo + name,
  colored when active). Matches the existing status-pill pattern.
- Filtering is server-side: the `/chores` index accepts `child_profile_id`, filtering on
  `proof_by_child_id`. It combines with the existing `status` filter and resets pagination on
  change. `listChores()` gains a `childProfileId` option.

## Testing

- Backend request specs: kid filter on `/chores` (alone and combined with status); `proof_by`
  carries `color` + `photo_url`; `child_profiles` returns `photo_url` (null and present). Existing
  exact-match `child_ref` assertions updated for the new `photo_url` key.
- Rake task smoke-tested end to end against the real seed files.
- Mobile: `tsc --noEmit` clean.

## Out of scope

- Admin UI to upload/change a kid's photo in-app (photos are seeded for now).
- Photo variants/resizing on the backend (seed images are pre-cropped to square).
