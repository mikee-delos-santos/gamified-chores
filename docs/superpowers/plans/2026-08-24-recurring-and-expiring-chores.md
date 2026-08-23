# Recurring and Expiring Chores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins save reusable chore templates, post a fresh chore from a template on demand, and expire a live chore that no longer applies.

**Architecture:** A new `chore_templates` table holds reusable chores with no completion state. Posting a template copies its fields and how-to photos into a normal open `Chore`. A new `expired` value on the `Chore` status enum lets admins retire a live chore without deleting or rejecting it. All new admin UI lives on the existing `(admin)/chores.tsx` screen.

**Tech Stack:** Rails 8.1 API-only + PostgreSQL (backend), Expo / React Native + TypeScript (mobile), Active Storage for photos.

## Global Constraints

- Design spec: `docs/superpowers/specs/2026-08-24-recurring-and-expiring-chores-design.md`.
- No AI co-author trailer on commits; no "Generated with Claude Code" text (repo house rule).
- Cite tickets as `PC-XX — short description`, never a bare ID.
- No em-dashes, emojis, or `---` dividers in code, comments, or commit messages.
- Backend has no test framework (`--skip-test`); verification is manual via Docker + curl. Do not add RSpec in this work.
- Coins ledger stays append-only; nothing in this work writes coin transactions except the existing complete flow (unchanged).
- Money-ish fields (`reward_coins`) are `decimal(10,2)` on the backend and arrive as JSON floats on mobile.
- Admin endpoints require a Bearer JWT (`authenticate_admin!`); kid-facing endpoints stay unauthenticated and unchanged.

## Docker verification setup (run once per session before backend tasks)

The host has no Ruby; Rails runs in a container on the compose network.

```bash
# From repo root. Starts Postgres (host 5433, container db:5432).
docker compose up -d db

# Build a local image with the app code + gems (uses the parked Dockerfile).
docker build -f backend/Dockerfile.disabled -t chore-backend backend
```

Run any Rails command against the dev DB with the source mounted so edits take effect without a rebuild:

```bash
docker run --rm -v "$(pwd)/backend:/rails" --network chore-app_default \
  -e DATABASE_URL=postgres://chore:chore@db:5432/chore_development \
  chore-backend bin/rails db:migrate
```

To exercise the HTTP API, run the server as a background container and curl it:

```bash
docker run --rm -d --name chore-api -p 3000:3000 -v "$(pwd)/backend:/rails" \
  --network chore-app_default \
  -e DATABASE_URL=postgres://chore:chore@db:5432/chore_development \
  chore-backend bin/rails server -b 0.0.0.0
# ... curl http://localhost:3000 ... then: docker rm -f chore-api
```

Get an admin token for curl (seeds or an existing admin; adjust email/password):

```bash
TOKEN=$(curl -s localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"owner@example.com","password":"password"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
```

(If the compose network name differs, find it with `docker network ls | grep chore`.)

---

### Task 1: chore_templates table and model

**Files:**
- Create: `backend/db/migrate/20260824150001_create_chore_templates.rb`
- Create: `backend/app/models/chore_template.rb`
- Modify: `backend/app/models/family.rb` (add `has_many :chore_templates`)
- Modify: `backend/app/models/user.rb` (add `has_many :created_chore_templates`)
- Regenerated: `backend/db/schema.rb` (by running the migration)

**Interfaces:**
- Produces: `ChoreTemplate` with columns `title:string`, `description:text`, `reward_coins:decimal`, `family_id`, `created_by_id`, timestamps; associations `family`, `created_by` (User), `has_many_attached :how_to_photos`; validations on `title` presence and `reward_coins >= 0`.
- Produces: `Family#chore_templates`, `User#created_chore_templates`.

- [ ] **Step 1: Write the migration**

`backend/db/migrate/20260824150001_create_chore_templates.rb`:

```ruby
class CreateChoreTemplates < ActiveRecord::Migration[8.1]
  def change
    create_table :chore_templates do |t|
      t.references :family, null: false, foreign_key: true
      t.references :created_by, null: false, foreign_key: { to_table: :users }
      t.string :title, null: false
      t.text :description
      t.decimal :reward_coins, precision: 10, scale: 2, null: false, default: 0

      t.timestamps
    end
  end
end
```

- [ ] **Step 2: Write the model**

`backend/app/models/chore_template.rb`:

```ruby
# A reusable chore the admin can post again and again (trash day, sweeping).
# Templates carry no completion state; posting one copies its fields into a
# fresh open Chore. See ChoreTemplatesController#post_chore.
class ChoreTemplate < ApplicationRecord
  belongs_to :family
  belongs_to :created_by, class_name: "User", inverse_of: :created_chore_templates

  # Admin how-to images that travel onto each posted chore.
  has_many_attached :how_to_photos

  validates :title, presence: true
  validates :reward_coins, numericality: { greater_than_or_equal_to: 0 }
end
```

- [ ] **Step 3: Add the family association**

In `backend/app/models/family.rb`, add alongside the other `has_many` lines:

```ruby
  has_many :chore_templates, dependent: :destroy
```

- [ ] **Step 4: Add the user association**

In `backend/app/models/user.rb`, add after the `created_chores` association:

```ruby
  has_many :created_chore_templates,
           class_name: "ChoreTemplate",
           foreign_key: :created_by_id,
           inverse_of: :created_by,
           dependent: :nullify
```

- [ ] **Step 5: Run the migration**

Run (see Docker setup above):

```bash
docker run --rm -v "$(pwd)/backend:/rails" --network chore-app_default \
  -e DATABASE_URL=postgres://chore:chore@db:5432/chore_development \
  chore-backend bin/rails db:migrate
```

Expected: migration runs, `db/schema.rb` now contains `create_table "chore_templates"`.

- [ ] **Step 6: Sanity-check the model in the Rails console**

```bash
docker run --rm -i -v "$(pwd)/backend:/rails" --network chore-app_default \
  -e DATABASE_URL=postgres://chore:chore@db:5432/chore_development \
  chore-backend bin/rails runner 'f = Family.first; t = f.chore_templates.create!(title: "Trash", reward_coins: 2, created_by: f.users.first); puts t.persisted?; t.destroy'
```

Expected: prints `true` (created and rolled back cleanly).

- [ ] **Step 7: Commit**

```bash
git add backend/db/migrate/20260824150001_create_chore_templates.rb backend/app/models/chore_template.rb backend/app/models/family.rb backend/app/models/user.rb backend/db/schema.rb
git commit -m "feat: chore_templates table + model (PC-31)"
```

---

### Task 2: ChoreTemplates API (CRUD + post)

**Files:**
- Create: `backend/app/controllers/chore_templates_controller.rb`
- Modify: `backend/config/routes.rb` (add the `chore_templates` resource with a `post_chore` member route)

**Interfaces:**
- Consumes: `ChoreTemplate` and its associations from Task 1; `current_family`, `current_user`, `authenticate_admin!` from `ApplicationController`; the existing `PushNotifier.notify_family(family, title:, body:, url:)`.
- Produces HTTP:
  - `GET /chore_templates` -> `[chore_template_json, ...]`
  - `POST /chore_templates` (`title`, `description`, `reward_coins`, optional `how_to_photos[]`) -> `chore_template_json`, 201
  - `PATCH /chore_templates/:id` (same params) -> `chore_template_json`
  - `DELETE /chore_templates/:id` -> `{ ok: true }`
  - `POST /chore_templates/:id/post_chore` -> the created chore as `chore_json` (same shape `ChoresController` returns), 201
- Produces JSON: `chore_template_json` = `{ id, title, description, reward_coins (float), how_to_photo_urls: [] }`.

- [ ] **Step 1: Add the routes**

In `backend/config/routes.rb`, add after the `resources :chores ... end` block:

```ruby
  # Recurring chore templates (admin-only). post_chore spawns a fresh open chore.
  resources :chore_templates, only: [:index, :create, :update, :destroy] do
    member { post :post_chore }
  end
```

- [ ] **Step 2: Write the controller**

`backend/app/controllers/chore_templates_controller.rb`:

```ruby
# Admin API for reusable chore templates: list, create, edit, delete, and
# "post" (spawn a fresh open Chore from the template). Admin-only.
class ChoreTemplatesController < ApplicationController
  before_action :authenticate_admin!

  def index
    templates = current_family.chore_templates.order(created_at: :desc)
    render json: templates.map { |t| chore_template_json(t) }
  end

  def create
    template = current_family.chore_templates.new(template_params)
    template.created_by = current_user
    template.save!
    template.how_to_photos.attach(params[:how_to_photos]) if params[:how_to_photos].present?
    render json: chore_template_json(template), status: :created
  end

  def update
    template = current_family.chore_templates.find(params[:id])
    template.update!(template_params)
    template.how_to_photos.attach(params[:how_to_photos]) if params[:how_to_photos].present?
    render json: chore_template_json(template)
  end

  def destroy
    current_family.chore_templates.find(params[:id]).destroy
    render json: { ok: true }
  end

  # POST /chore_templates/:id/post_chore
  # Spawn a fresh open chore from the template, copying its how-to photos, and
  # fire the same "new chore" push that ChoresController#create sends.
  def post_chore
    template = current_family.chore_templates.find(params[:id])
    chore = current_family.chores.new(
      title: template.title,
      description: template.description,
      reward_coins: template.reward_coins,
      created_by: current_user,
    )
    chore.save!
    copy_how_to_photos(template, chore)
    PushNotifier.notify_family(current_family, title: "New chore", body: chore.title, url: "/")
    render json: chore_json(chore), status: :created
  end

  private

  def template_params
    params.permit(:title, :description, :reward_coins)
  end

  # Re-attach the template's how-to blobs to the new chore (no re-upload).
  def copy_how_to_photos(template, chore)
    return unless template.how_to_photos.attached?

    template.how_to_photos.each do |photo|
      chore.how_to_photos.attach(photo.blob)
    end
  end

  def chore_template_json(template)
    {
      id: template.id,
      title: template.title,
      description: template.description,
      reward_coins: template.reward_coins.to_f,
      how_to_photo_urls: template.how_to_photos.attached? ? template.how_to_photos.map { |p| url_for(p) } : []
    }
  end

  # The posted chore is serialized exactly like ChoresController does.
  def chore_json(chore)
    {
      id: chore.id,
      title: chore.title,
      description: chore.description,
      reward_coins: chore.reward_coins.to_f,
      status: chore.status,
      grade: chore.grade,
      created_by: chore.created_by_id,
      completed_by: chore.completed_by_id,
      completed_at: chore.completed_at,
      how_to_photo_urls: chore.how_to_photos.attached? ? chore.how_to_photos.map { |p| url_for(p) } : [],
      proof_photo_url: chore.proof_photo.attached? ? url_for(chore.proof_photo) : nil
    }
  end
end
```

- [ ] **Step 3: Boot the API server (background container)**

```bash
docker run --rm -d --name chore-api -p 3000:3000 -v "$(pwd)/backend:/rails" \
  --network chore-app_default \
  -e DATABASE_URL=postgres://chore:chore@db:5432/chore_development \
  chore-backend bin/rails server -b 0.0.0.0
```

Get a token (see Docker setup for the login curl) and export it as `$TOKEN`.

- [ ] **Step 4: Verify create + list**

```bash
curl -s localhost:3000/chore_templates -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"title":"Take out trash","reward_coins":2}'
curl -s localhost:3000/chore_templates -H "Authorization: Bearer $TOKEN"
```

Expected: first returns the new template JSON with an `id`; second lists it.

- [ ] **Step 5: Verify post_chore spawns an open chore**

```bash
# Replace 1 with the template id from Step 4.
curl -s localhost:3000/chore_templates/1/post_chore -X POST -H "Authorization: Bearer $TOKEN"
curl -s "localhost:3000/chores?status=open" -H "Authorization: Bearer $TOKEN"
```

Expected: post_chore returns a chore with `"status":"open"` and the template's title/reward; the chores list includes it.

- [ ] **Step 6: Verify delete leaves posted chores alone**

```bash
curl -s localhost:3000/chore_templates/1 -X DELETE -H "Authorization: Bearer $TOKEN"
curl -s "localhost:3000/chores?status=open" -H "Authorization: Bearer $TOKEN"
```

Expected: delete returns `{"ok":true}`; the previously posted chore is still present. Stop the server with `docker rm -f chore-api`.

- [ ] **Step 7: Commit**

```bash
git add backend/app/controllers/chore_templates_controller.rb backend/config/routes.rb
git commit -m "feat: chore template API (list/create/edit/delete/post) (PC-32)"
```

---

### Task 3: Expire a live chore

**Files:**
- Modify: `backend/app/models/chore.rb` (add `expired` to the status enum)
- Modify: `backend/app/controllers/chores_controller.rb` (add `expire` action)
- Modify: `backend/config/routes.rb` (add `post :expire` member route)

**Interfaces:**
- Consumes: existing `ChoresController` helpers (`current_family`, `chore_json`).
- Produces HTTP: `POST /chores/:id/expire` -> `chore_json` with `"status":"expired"`, or 422 `{ error }` if the chore is not open.
- Produces: `Chore` status enum value `expired: 3`.

- [ ] **Step 1: Add the enum value**

In `backend/app/models/chore.rb`, change the enum line to:

```ruby
  enum :status, { open: 0, completed: 1, rejected: 2, expired: 3 }, default: :open
```

- [ ] **Step 2: Add the route**

In `backend/config/routes.rb`, inside the `resources :chores ... member do ... end` block, add:

```ruby
      post :expire
```

so the member block reads:

```ruby
    member do
      post :complete
      post :proof # kid-facing photo proof upload
      post :expire
    end
```

- [ ] **Step 3: Add the controller action**

In `backend/app/controllers/chores_controller.rb`, add after the `complete` action (before `private`):

```ruby
  # POST /chores/:id/expire — retire a live chore that no longer applies.
  # Distinct from reject ("kid did it wrong"); only open chores can expire.
  def expire
    chore = current_family.chores.find(params[:id])
    unless chore.open?
      return render json: { error: "chore is not open (already #{chore.status})" },
                    status: :unprocessable_entity
    end

    chore.update!(status: :expired)
    render json: chore_json(chore)
  end
```

- [ ] **Step 4: Verify expire on an open chore**

Boot the server (Task 2 Step 3) and get `$TOKEN`. Post a template or create a chore to get an open chore id, then:

```bash
# Replace 5 with an open chore id.
curl -s localhost:3000/chores/5/expire -X POST -H "Authorization: Bearer $TOKEN"
```

Expected: returns the chore with `"status":"expired"`.

- [ ] **Step 5: Verify expire is rejected on a non-open chore**

```bash
# Same id, now already expired.
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/chores/5/expire -X POST -H "Authorization: Bearer $TOKEN"
```

Expected: `422`.

- [ ] **Step 6: Verify expired chores drop out of kid views**

```bash
curl -s localhost:3000/open_chores
```

Expected: the expired chore is absent from the kid-facing open list. Stop the server (`docker rm -f chore-api`).

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/chore.rb backend/app/controllers/chores_controller.rb backend/config/routes.rb
git commit -m "feat: expire a live chore (new expired status) (PC-33)"
```

---

### Task 4: Mobile API client

**Files:**
- Modify: `mobile/src/lib/api.ts`

**Interfaces:**
- Consumes: existing `apiFetch`, `authHeaders`, `json`, `ApiError`, `API_URL`, `imageFormData`, `Chore`, `ChoreStatus`.
- Produces:
  - Type `ChoreTemplate = { id: number; title: string; description: string | null; reward_coins: number; how_to_photo_urls: string[] }`.
  - `ChoreStatus` extended to include `'expired'`.
  - `listChoreTemplates(token): Promise<ChoreTemplate[]>`
  - `createChoreTemplate(token, input: CreateChoreInput): Promise<ChoreTemplate>`
  - `updateChoreTemplate(token, id, input: CreateChoreInput): Promise<ChoreTemplate>`
  - `deleteChoreTemplate(token, id): Promise<void>`
  - `postChoreTemplate(token, id): Promise<Chore>`
  - `uploadTemplateHowToPhotos(token, id, uris): Promise<ChoreTemplate>`
  - `expireChore(token, id): Promise<Chore>`

- [ ] **Step 1: Extend ChoreStatus**

In `mobile/src/lib/api.ts`, change:

```ts
export type ChoreStatus = 'open' | 'completed' | 'rejected';
```

to:

```ts
export type ChoreStatus = 'open' | 'completed' | 'rejected' | 'expired';
```

- [ ] **Step 2: Add the ChoreTemplate type**

Immediately after the `Chore` interface (around line 70), add:

```ts
/** A reusable chore an admin posts on demand. No completion state. */
export interface ChoreTemplate {
  id: number;
  title: string;
  description: string | null;
  reward_coins: number;
  how_to_photo_urls: string[];
}
```

- [ ] **Step 3: Add the template CRUD + post + expire functions**

After `deleteChore` (around line 165), add. Note `CreateChoreInput` already exists and is reused:

```ts
// --- Chore templates (recurring chores; admin, Bearer token) ---

export async function listChoreTemplates(token: string): Promise<ChoreTemplate[]> {
  const res = await apiFetch('/chore_templates', { headers: authHeaders(token) });
  return json<ChoreTemplate[]>(res);
}

export async function createChoreTemplate(
  token: string,
  input: CreateChoreInput,
): Promise<ChoreTemplate> {
  const res = await apiFetch('/chore_templates', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  return json<ChoreTemplate>(res);
}

export async function updateChoreTemplate(
  token: string,
  id: number,
  input: CreateChoreInput,
): Promise<ChoreTemplate> {
  const res = await apiFetch(`/chore_templates/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  return json<ChoreTemplate>(res);
}

export async function deleteChoreTemplate(token: string, id: number): Promise<void> {
  await apiFetch(`/chore_templates/${id}`, { method: 'DELETE', headers: authHeaders(token) });
}

/** Spawn a fresh open chore from a template. Returns the new chore. */
export async function postChoreTemplate(token: string, id: number): Promise<Chore> {
  const res = await apiFetch(`/chore_templates/${id}/post_chore`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  return json<Chore>(res);
}

/** Retire a live open chore that no longer applies. Returns the expired chore. */
export async function expireChore(token: string, id: number): Promise<Chore> {
  const res = await apiFetch(`/chores/${id}/expire`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  return json<Chore>(res);
}
```

- [ ] **Step 4: Add the template photo upload (multipart)**

After `uploadHowToPhotos` (around line 193), add a template variant reusing `imageFormData`:

```ts
/** Attach how-to photos to a template (multipart PATCH). */
export async function uploadTemplateHowToPhotos(
  token: string,
  id: number,
  uris: string[],
): Promise<ChoreTemplate> {
  const res = await fetch(`${API_URL}/chore_templates/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token), // no Content-Type: runtime sets the multipart boundary
    body: await imageFormData('how_to_photos[]', uris),
  });
  if (!res.ok) throw new ApiError(res.status, await res.text().catch(() => ''));
  return json<ChoreTemplate>(res);
}
```

- [ ] **Step 5: Typecheck**

Run:

```bash
cd mobile && npx tsc --noEmit
```

Expected: no output (clean). The `ChoreStatus` change may surface a non-exhaustive `switch`/comparison elsewhere; if `tsc` flags one, handle the `'expired'` case there.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/lib/api.ts
git commit -m "feat: mobile API for chore templates + expire (PC-31/32/33)"
```

---

### Task 5: Admin chores screen — recurring toggle, Recurring section, expire action

**Files:**
- Modify: `mobile/src/app/(admin)/chores.tsx`

**Interfaces:**
- Consumes from Task 4: `ChoreTemplate`, `listChoreTemplates`, `createChoreTemplate`, `deleteChoreTemplate`, `postChoreTemplate`, `uploadTemplateHowToPhotos`, `expireChore`.
- Consumes existing screen components: `Card`, `CoinChip`, `PrimaryButton`, `SecondaryButton`, `AppText`, `PhotoThumbs`, `Pop`, `Pressable`, `usePhotoSource`.
- Produces: no new exports; all changes are within the `AdminChores` component and its `ChoreRow`.

- [ ] **Step 1: Import the new API + an expire icon**

Update the lucide import (line 2) to add an expire icon:

```ts
import { Ban, Check, Pencil, Star, Trash2, Users } from 'lucide-react-native';
```

Extend the `@/lib/api` import block (lines 17-27) to add:

```ts
  ChoreTemplate,
  createChoreTemplate,
  deleteChoreTemplate,
  expireChore,
  listChoreTemplates,
  postChoreTemplate,
  uploadTemplateHowToPhotos,
```

- [ ] **Step 2: Add template state + a recurring toggle flag**

Inside `AdminChores`, after the `chores`/`loading`/`error` state (line 43), add:

```ts
  const [templates, setTemplates] = useState<ChoreTemplate[]>([]);
```

After the new-chore form state (`creating`, line 50), add:

```ts
  const [recurring, setRecurring] = useState(false);
```

- [ ] **Step 3: Load templates alongside chores**

Change `load` (lines 58-68) to also fetch templates:

```ts
  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const [choreList, templateList] = await Promise.all([listChores(token), listChoreTemplates(token)]);
      setChores(choreList);
      setTemplates(templateList);
    } catch {
      setError('Could not load chores.');
    } finally {
      setLoading(false);
    }
  }, [token]);
```

- [ ] **Step 4: Branch create on the recurring flag**

Replace the body of `onCreate` (lines 76-104) so a recurring chore creates a template instead:

```ts
  async function onCreate() {
    if (!token) return;
    const coins = Number(reward);
    if (!title.trim() || Number.isNaN(coins) || coins <= 0) {
      setError('Enter a title and a reward above 0.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const input = {
        title: title.trim(),
        description: description.trim() || undefined,
        reward_coins: coins,
      };
      if (recurring) {
        const template = await createChoreTemplate(token, input);
        if (newPhotos.length) {
          await uploadTemplateHowToPhotos(token, template.id, newPhotos);
        }
      } else {
        const chore = await createChore(token, input);
        if (newPhotos.length) {
          await uploadHowToPhotos(token, chore.id, newPhotos);
        }
      }
      setTitle('');
      setDescription('');
      setReward('');
      setNewPhotos([]);
      setRecurring(false);
      await load();
    } catch {
      setError(recurring ? 'Could not create the template.' : 'Could not create the chore.');
    } finally {
      setCreating(false);
    }
  }
```

- [ ] **Step 5: Add the recurring toggle to the form**

In the "New chore" `Card`, add a toggle row right before the create button block (after the how-to photos `SecondaryButton`, around line 174). Uses a plain `Pressable` checkbox to avoid a new dependency:

```tsx
              <Pressable
                onPress={() => setRecurring((v) => !v)}
                hitSlop={6}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: recurring ? Color.primary : Color.dashed,
                    backgroundColor: recurring ? Color.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {recurring ? <Check size={14} color={Color.white} strokeWidth={3} /> : null}
                </View>
                <AppText size={14} weight={700} color={Color.navy}>
                  Make this recurring
                </AppText>
              </Pressable>
```

Then change the create button label so it reads right for a template. Replace the `PrimaryButton label="Add chore"` (line 188) with:

```tsx
                <PrimaryButton label={recurring ? 'Save recurring chore' : 'Add chore'} onPress={onCreate} />
```

- [ ] **Step 6: Render the Recurring section in the list header**

In the `ListHeaderComponent`, add a Recurring block after the `NotificationsCard` wrapper `View` (after line 194) and before the `error` block. It is hidden when there are no templates:

```tsx
            {templates.length > 0 ? (
              <View style={{ marginBottom: 18 }}>
                <AppText size={18} weight={800} color={Color.navy} style={{ marginBottom: 10 }}>
                  Recurring
                </AppText>
                <View style={{ gap: 10 }}>
                  {templates.map((t) => (
                    <TemplateRow key={t.id} template={t} token={token} onChanged={load} />
                  ))}
                </View>
              </View>
            ) : null}
```

- [ ] **Step 7: Add the TemplateRow component**

Add this component after `ChoreRow` (after line 374):

```tsx
function TemplateRow({
  template,
  token,
  onChanged,
}: {
  template: ChoreTemplate;
  token: string | null;
  onChanged: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onPost() {
    if (!token) return;
    setBusy(true);
    try {
      await postChoreTemplate(token, template.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!token) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    try {
      await deleteChoreTemplate(token, template.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ padding: 14, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <AppText size={16} weight={800} color={Color.navy}>
            {template.title}
          </AppText>
          {template.description ? (
            <AppText size={12} weight={600} color={Ink.t55}>
              {template.description}
            </AppText>
          ) : null}
        </View>
        <CoinChip amount={template.reward_coins} />
      </View>

      {template.how_to_photo_urls.length > 0 ? (
        <PhotoThumbs urls={template.how_to_photo_urls} size={48} />
      ) : null}

      {busy ? (
        <View
          style={{
            backgroundColor: Color.primary,
            borderRadius: Radius.card,
            paddingVertical: 17,
            alignItems: 'center',
            borderBottomWidth: 6,
            borderBottomColor: Color.primaryPress,
          }}>
          <ActivityIndicator color={Color.white} />
        </View>
      ) : (
        <PrimaryButton label="Post this chore" onPress={onPost} />
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Pressable
          onPress={onDelete}
          disabled={busy}
          hitSlop={6}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Trash2 size={14} color="#c8452f" strokeWidth={2.4} />
          <AppText size={13} weight={800} color="#c8452f">
            {confirmDelete ? 'Tap to confirm' : 'Delete'}
          </AppText>
        </Pressable>
      </View>
    </Card>
  );
}
```

- [ ] **Step 8: Add the expire action to ChoreRow**

`ChoreRow` (lines 265-374) needs an expire action on open chores. First widen its props to accept an `onChanged`-based expire. It already has `token` and `onChanged`. Add an `onExpire` handler inside `ChoreRow` after `onDelete` (around line 295):

```ts
  async function onExpire() {
    if (!token) return;
    setBusy(true);
    try {
      await expireChore(token, chore.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  }
```

Then, in the action row (the `View` at lines 354-371 holding Edit/Delete), add an Expire action, shown only when the chore is open (`!done`). Insert before the Delete `Pressable`:

```tsx
        {!done ? (
          <Pressable
            onPress={onExpire}
            disabled={busy}
            hitSlop={6}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ban size={14} color={Ink.t55} strokeWidth={2.4} />
            <AppText size={13} weight={800} color={Ink.t55}>
              Expire
            </AppText>
          </Pressable>
        ) : null}
```

- [ ] **Step 9: Typecheck and lint**

Run:

```bash
cd mobile && npx tsc --noEmit && npm run lint
```

Expected: `tsc` clean. `npm run lint` shows no new errors for `chores.tsx` (pre-existing warnings elsewhere are unrelated).

- [ ] **Step 10: Manual check in the app**

Run `npm run web` (or `npm run android`), sign in as admin, and confirm:
1. Toggling "Make this recurring" and saving adds a card to the Recurring section (not the live list).
2. "Post this chore" on a template adds a fresh open chore to the live list below.
3. A recurring chore's how-to photos appear on the posted chore.
4. "Expire" on an open chore removes it from the list (it becomes `expired`).
5. Expire does not appear on already-awarded chores.

- [ ] **Step 11: Commit**

```bash
git add mobile/src/app/(admin)/chores.tsx
git commit -m "feat: recurring templates + expire on admin chores screen (PC-31/32/33)"
```

---

## Self-Review

**Spec coverage:**
- PC-31 (tag chores recurring): Task 1 (table/model), Task 2 (create API), Task 5 Steps 4-5 (recurring toggle). Covered.
- PC-32 (post recurring as cards): Task 2 (`post_chore`), Task 4 (`postChoreTemplate`), Task 5 Steps 6-7 (Recurring section + Post button). Covered.
- PC-33 (expire): Task 3 (status + endpoint), Task 4 (`expireChore`), Task 5 Step 8 (Expire action). Covered.
- Copy how-to photos on post: Task 2 `copy_how_to_photos`. Covered.
- Expired chores excluded from kid views: Task 3 Step 6 verifies; relies on existing status filtering. Covered.

**Placeholder scan:** No TBD/TODO; every code step shows full code; every verify step shows the command and expected result.

**Type consistency:** `ChoreTemplate` shape matches `chore_template_json` (id, title, description, reward_coins, how_to_photo_urls). `postChoreTemplate` returns `Chore` matching the `chore_json` the backend returns. `CreateChoreInput` reused for template create/update. `ChoreStatus` gains `'expired'` in Task 4, consumed by Task 5's `!done` checks (which use `status !== 'open'`, so `expired` is treated as done and hides the Expire action). Route action `post_chore` matches the mobile path `/chore_templates/:id/post_chore`.
