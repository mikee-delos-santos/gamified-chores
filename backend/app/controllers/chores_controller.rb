# Admin chores API (create/list/complete/edit) plus the kid-facing open-list + proof upload.
class ChoresController < ApplicationController
  # open + proof are kid-facing (kids have no login); everything else is admin-only.
  before_action :authenticate_admin!, except: [:proof, :open]

  # GET /chores?status=&page=&per=&needs_review=
  # Newest first. `status` filters by lifecycle state. `needs_review=1` returns the open chores
  # that have proof attached (the Review queue) unpaginated, so its badge count stays exact.
  # Otherwise the list is paginated with page/per for infinite scroll.
  def index
    chores = current_family.chores.order(created_at: :desc)
    chores = chores.where(status: params[:status]) if valid_status?(params[:status])

    if truthy?(params[:needs_review])
      chores = chores.where(status: :open).with_attached_proof_photos.select { |c| c.proof_photos.attached? }
    else
      chores = chores.limit(per_page).offset((page_number - 1) * per_page)
    end

    render json: chores.map { |chore| chore_json(chore) }
  end

  # GET /chores/:id — one chore in the family. Lets the detail screen fetch a single chore
  # instead of scanning the paginated list.
  def show
    chore = current_family.chores.find(params[:id])
    render json: chore_json(chore)
  end

  # GET /open_chores — kid-facing list of chores still to do (unauthenticated, single-family MVP).
  # An assigned chore is only visible to that kid; pass child_profile_id so a device sees its own
  # kid's chores plus the unassigned ones. With no kid id, only unassigned chores are returned so
  # an assigned chore is never leaked to an unknown device.
  def open
    family = Family.first
    unless family
      return render json: []
    end
    chores = family.chores.where(status: :open).visible_to_kid(params[:child_profile_id]).order(created_at: :desc)
    render json: chores.map { |chore| chore_json(chore) }
  end

  def create
    chore = Chores::Creator.call(
      family: current_family,
      created_by: current_user,
      title: chore_params[:title],
      description: chore_params[:description],
      reward_coins: chore_params[:reward_coins],
      assignee: params.key?(:child_profile_id) ? assignee : nil,
      how_to_photos: params[:how_to_photos],
    )
    render json: chore_json(chore), status: :created
  end

  # PATCH /chores/:id { title, description, reward_coins, child_profile_id, how_to_photos[] }.
  # Passing child_profile_id (blank clears it) reassigns the chore; omitting it leaves it as-is.
  def update
    chore = current_family.chores.find(params[:id])
    chore.assigned_to = assignee if params.key?(:child_profile_id)
    chore.update!(chore_params)
    chore.how_to_photos.attach(params[:how_to_photos]) if params[:how_to_photos].present?
    render json: chore_json(chore)
  end

  # POST /chores/:id/proof { proof_photos[], by } — kid attaches photos showing the chore is done.
  # Requires at least one proof photo to be attached (either from the current request or already
  # on the chore from a prior submission). Photos append (a later submission adds to what's there).
  # Unauthenticated (kids have no login); the admin sees them when awarding.
  # `proof_photo` (singular) is still accepted for older clients.
  def proof
    chore = Chore.find(params[:id])
    incoming = params[:proof_photos].presence || params[:proof_photo].presence
    chore.proof_photos.attach(incoming) if incoming
    unless chore.proof_photos.attached?
      return render json: { error: "a proof photo is required" },
                    status: :unprocessable_entity
    end
    if params[:child_profile_id].present?
      chore.proof_by_child = chore.family.child_profiles.find_by(id: params[:child_profile_id])
    end
    chore.save!
    who = params[:by].presence || "A kid"
    PushNotifier.notify_chore(
      chore,
      title: "Ready to check",
      body: "#{who} finished #{chore.title}",
      url: "/?chore=#{chore.id}",
    )
    render json: chore_json(chore)
  end

  # DELETE /chores/:id — remove a chore. Its coin_transactions nullify (past earnings kept).
  def destroy
    chore = current_family.chores.find(params[:id])
    title = chore.title
    PushNotifier.notify_chore(chore, title: "Chore removed", body: title, url: "/")
    chore.destroy
    render json: { ok: true }
  end

  # POST /chores/:id/complete { child_profile_id, grade (1-5) }
  # Marks the chore completed for a child and awards grade/5 of the reward,
  # atomically and idempotently (an already-completed chore is rejected).
  def complete
    chore = current_family.chores.find(params[:id])
    child = current_family.child_profiles.find(params[:child_profile_id])
    result = Chores::Approver.call(chore: chore, child: child, grade: params[:grade].to_i)
    render json: chore_json(result.chore).merge(awarded: result.award.to_f, child_balance: child.balance.to_f)
  rescue Chores::Approver::NotOpen, Chores::Approver::BadGrade => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

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

  # POST /chores/:id/reject — a parent judges the kid's submitted proof as not done.
  # Terminal: only an open chore can be rejected, no coins are awarded, and the kid cannot
  # resubmit (an admin would re-post the chore). Distinct from expire ("no longer applies").
  def reject
    chore = current_family.chores.find(params[:id])
    render json: chore_json(Chores::Rejecter.call(chore: chore))
  rescue Chores::Rejecter::NotOpen => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  private

  def chore_params
    params.permit(:title, :description, :reward_coins)
  end

  # The kid to assign this chore to, or nil to clear it. A blank param means "unassign";
  # a non-family kid id is rejected so a chore can't be assigned outside the family.
  def assignee
    raw = params[:child_profile_id]
    return nil if raw.blank?

    current_family.child_profiles.find(raw)
  end

  def valid_status?(status)
    status.present? && Chore.statuses.key?(status)
  end

  # Pagination for the chores index (infinite scroll). chore_json now lives in
  # ApplicationController (shared with the MCP tools via ChoreSerializer).
  DEFAULT_PER = 20
  MAX_PER = 100

  def page_number
    n = params[:page].to_i
    n.positive? ? n : 1
  end

  def per_page
    n = params[:per].to_i
    return DEFAULT_PER unless n.positive?

    [n, MAX_PER].min
  end

  def truthy?(value)
    %w[1 true yes].include?(value.to_s.downcase)
  end
end
