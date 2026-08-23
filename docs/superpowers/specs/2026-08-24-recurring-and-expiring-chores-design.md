# Recurring and expiring chores - design

Covers Jira PC-31 (tag chores as recurring), PC-32 (post recurring chores from
the admin panel), and PC-33 (expire a chore that no longer applies).

## Problem

Some chores repeat: putting out the trash, sweeping the floor. Today every chore
is a one-off row that an admin creates, a kid completes once, and that carries its
own completion state (status, grade, proof photo) plus a coin transaction. There
is no way to save a chore as reusable, and no way to cancel a live chore that no
longer applies without deleting it (which loses the record) or rejecting it (which
means "the kid did it wrong").

## Goals

- An admin can save a chore as a reusable **template** (PC-31).
- An admin can **post** a template from the admin screen, creating a fresh live
  chore each time, with a full history of every posting (PC-32).
- An admin can **expire** a live chore that no longer applies, distinct from
  rejecting it (PC-33).

## Non-goals

- No scheduling or automatic posting. Posting is always a manual admin action.
- No per-template history view or link between a posted chore and its template.
- No kid-app changes for expired chores in this work. Expired chores simply drop
  out of the kid-facing lists because those filter by status. The kid-side
  treatment noted in PC-33 is tracked separately.
- No new test framework. The backend is still `--skip-test`; verification is
  manual (see Testing).

## Key decisions

**Posting clones a fresh chore.** A template is reusable; each post creates a new
open `Chore` that kids complete, grade, earn coins on, and attach proof to. This
keeps a real history (every trash day is its own row and its own ledger entry) and
fits the current model, where completion, grade, coins, and proof are all
per-instance. Re-opening a single shared row was rejected: it loses history and
tangles the ledger and proof photo already attached to that row.

**Templates live in their own table.** A template has no completion lifecycle - no
status, grade, proof, or coin transaction. It only holds title, description,
reward, and how-to photos. Putting templates in the `chores` table would force
every kid-facing read and every award path to filter them out, and leave a row
sitting in a completion-oriented table full of columns it never uses. A separate
`chore_templates` table keeps each concept doing one thing and needs zero changes
to the existing kid views and award/ledger code.

**Expire is its own status.** `expired` is added to the `Chore` status enum,
separate from `rejected`, so "no longer needed" reads differently from "the kid
did it wrong." That distinction matters for the kid-side follow-up in PC-33 and any
future history view.

## Data model

New table `chore_templates`:

| column         | type                       | notes                          |
|----------------|----------------------------|--------------------------------|
| `title`        | string, not null           |                                |
| `description`  | text                       |                                |
| `reward_coins` | decimal(10,2), default 0, not null | same shape as `chores` |
| `family_id`    | bigint, fk, not null, indexed |                             |
| `created_by_id`| bigint, fk (User), not null, indexed |                      |
| timestamps     |                            |                                |

`ChoreTemplate` model:

- `belongs_to :family`
- `belongs_to :created_by, class_name: "User"`
- `has_many_attached :how_to_photos` (reuses the existing Active Storage setup)
- `validates :title, presence: true`
- `validates :reward_coins, numericality: { greater_than_or_equal_to: 0 }`

`Chore` status enum gains one value:

```ruby
enum :status, { open: 0, completed: 1, rejected: 2, expired: 3 }, default: :open
```

No column links a posted chore back to its template. Posting copies the fields, so
deleting a template never affects chores already posted from it.

## Backend API

All routes below are admin-only (the existing kid-facing routes are unchanged).

Routes:

```ruby
resources :chore_templates, only: [:index, :create, :update, :destroy] do
  member { post :post_chore }   # POST /chore_templates/:id/post_chore
end

resources :chores, only: [:index, :create, :update, :destroy] do
  member do
    post :complete
    post :proof
    post :expire                 # POST /chores/:id/expire
  end
end
```

(The `post :post_chore` action name avoids colliding with the HTTP verb; its path
is `/chore_templates/:id/post_chore`.)

`ChoreTemplatesController` (mirrors the thin style of `ChoresController`):

- `index` - `current_family.chore_templates.order(created_at: :desc)`, serialized.
- `create` - permit `title, description, reward_coins`; set `created_by`; attach
  `how_to_photos` if present.
- `update` - same permitted params; attach any new `how_to_photos`.
- `destroy` - remove the template. Posted chores are unaffected.
- `post_chore` - build a new `Chore` from the template: copy `title`,
  `description`, `reward_coins`; set `created_by = current_user`, `status = open`.
  Copy the template's `how_to_photos` onto the new chore. Fire the same
  `PushNotifier.notify_family` "New chore" push that `ChoresController#create`
  sends. Return the created chore via the existing `chore_json`.

`ChoresController#expire`:

- Find the chore in `current_family`.
- If it is not `open`, return 422 with an error (only live chores can expire).
- Set `status: :expired`, return `chore_json`.

Serialization: add a small `chore_template_json` helper (id, title, description,
reward_coins, how_to_photo_urls). The existing `chore_json` already carries
`status`, so `expired` needs no serializer change.

### How-to photo copy

When posting, copy each blob from the template's `how_to_photos` to the new
chore's `how_to_photos` so the instructions travel with the posted chore. Copy the
existing blobs (do not require re-upload). If this proves awkward with Active
Storage, an acceptable fallback is attaching the same blobs by reference; the
observable result (the posted chore shows the template's how-to photos) is what
matters.

## Mobile - admin chores screen

Everything lives on the existing `(admin)/chores.tsx` screen; no new screen or
navigation.

- **Create a template (PC-31):** add a "Make this recurring" toggle to the
  new-chore form. Off (default) posts to `createChore` as today. On posts to
  `createChoreTemplate` instead, and the new template appears in the Recurring
  section rather than the live list.
- **Post and manage templates (PC-32):** a "Recurring" section in the list header,
  below the form and notifications card and above the live chores list. Each
  template renders as a compact card: title, a reward coin chip, a prominent
  **Post** button (calls `postChoreTemplate`, then refreshes the live list), and
  edit and delete icon actions consistent with the live chore cards. The section
  is hidden when there are no templates.
- **Expire a chore (PC-33):** add an expire icon action to each live *open* chore
  card, alongside the existing edit, delete, and award actions. It calls
  `expireChore` and refreshes. Only open chores show the action.

`lib/api.ts` additions:

- Types: `ChoreTemplate` (id, title, description, reward_coins, how_to_photo_urls).
- Functions: `listChoreTemplates`, `createChoreTemplate`, `updateChoreTemplate`,
  `deleteChoreTemplate`, `postChoreTemplate(id)`, `expireChore(id)`.

## Edge cases

- Expire is rejected server-side for any non-open chore (already completed,
  rejected, or expired). The UI only offers it on open cards.
- Posting a template with no how-to photos works (nothing to copy).
- Deleting a template does not touch chores already posted from it (no link).
- Templates are family-scoped and admin-only, like chores.
- The kid views (`chores#index` filtered by status, kid detail's completed list)
  need no change: templates are a different table, and expired chores are excluded
  by status filtering.

## Testing

The backend has no test framework yet (`--skip-test`, per `backend/CLAUDE.md`).
Verification for this work is manual, run against local Docker Postgres:

1. Create a template (with and without how-to photos).
2. Post the template; confirm a new open chore appears with the copied fields and
   photos, and that the "New chore" push fires.
3. Complete the posted chore; confirm coins are awarded as normal.
4. Post the same template again; confirm a second independent chore is created.
5. Expire an open chore; confirm it leaves the kid list and cannot be completed.
6. Attempt to expire a completed chore; confirm a 422.
7. Delete a template; confirm previously posted chores are unaffected.

Standing up RSpec and backfilling request specs is out of scope here and should be
its own ticket before the next logic-heavy backend work.
