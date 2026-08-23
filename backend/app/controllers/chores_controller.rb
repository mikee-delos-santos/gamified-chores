# Admin chores API (create/list/complete/edit) plus the kid-facing proof upload.
class ChoresController < ApplicationController
  # proof is kid-facing (kids have no login); everything else is admin-only.
  before_action :authenticate_admin!, except: [:proof]

  def index
    chores = current_family.chores.order(created_at: :desc)
    chores = chores.where(status: params[:status]) if valid_status?(params[:status])
    render json: chores.map { |chore| chore_json(chore) }
  end

  def create
    chore = current_family.chores.new(chore_params)
    chore.created_by = current_user
    chore.save!
    chore.how_to_photos.attach(params[:how_to_photos]) if params[:how_to_photos].present?
    PushNotifier.notify_family(current_family, title: "New chore", body: chore.title, url: "/")
    render json: chore_json(chore), status: :created
  end

  # PATCH /chores/:id { title, description, reward_coins, how_to_photos[] } — edit a chore.
  def update
    chore = current_family.chores.find(params[:id])
    chore.update!(chore_params)
    chore.how_to_photos.attach(params[:how_to_photos]) if params[:how_to_photos].present?
    render json: chore_json(chore)
  end

  # POST /chores/:id/proof { proof_photo } — kid attaches a photo showing the chore is done.
  # Unauthenticated (kids have no login); the admin sees it when awarding.
  def proof
    chore = Chore.find(params[:id])
    chore.proof_photo.attach(params[:proof_photo]) if params[:proof_photo].present?
    render json: chore_json(chore)
  end

  # DELETE /chores/:id — remove a chore. Its coin_transactions nullify (past earnings kept).
  def destroy
    chore = current_family.chores.find(params[:id])
    chore.destroy
    render json: { ok: true }
  end

  # POST /chores/:id/complete { child_profile_id, grade (1-5) }
  # Marks the chore completed for a child and awards grade/5 of the reward,
  # atomically and idempotently (an already-completed chore is rejected).
  def complete
    chore = current_family.chores.find(params[:id])
    unless chore.open?
      return render json: { error: "chore is not open (already #{chore.status})" },
                    status: :unprocessable_entity
    end

    child = current_family.child_profiles.find(params[:child_profile_id])
    grade = params[:grade].to_i
    unless (1..5).cover?(grade)
      return render json: { error: "grade must be an integer 1-5" },
                    status: :unprocessable_entity
    end

    award = chore.award_for(grade)
    ActiveRecord::Base.transaction do
      chore.update!(status: :completed, completed_by: child, completed_at: Time.current, grade: grade)
      CoinTransaction.create!(child_profile: child, amount: award, chore: chore, reason: :chore_reward)
    end

    PushNotifier.notify_family(
      current_family,
      title: "Nice work, #{child.name}!",
      body: "#{award.to_f} coins for #{chore.title}",
      url: "/",
    )

    render json: chore_json(chore).merge(awarded: award.to_f, child_balance: child.balance.to_f)
  end

  private

  def chore_params
    params.permit(:title, :description, :reward_coins)
  end

  def valid_status?(status)
    status.present? && Chore.statuses.key?(status)
  end

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
