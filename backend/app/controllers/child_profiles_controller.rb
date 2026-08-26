# Kid-facing read model (index/show, unauthenticated — kids have no login) plus admin-only
# management (create/update/destroy), scoped to the signed-in admin's family.
class ChildProfilesController < ApplicationController
  before_action :authenticate_admin!, only: [:create, :update, :destroy]

  def index
    profiles = ChildProfile.order(:id).map { |child| child_json(child) }
    render json: profiles
  end

  def show
    child = ChildProfile.find(params[:id])
    render json: child_json(child).merge(completed_chores: completed_chores_json(child))
  end

  # POST /child_profiles { name } — admin adds a kid to their family.
  def create
    child = current_family.child_profiles.create!(name: params.require(:name))
    render json: child_json(child), status: :created
  end

  # PATCH /child_profiles/:id { name } — admin renames a kid.
  def update
    child = current_family.child_profiles.find(params[:id])
    child.update!(name: params.require(:name))
    render json: child_json(child)
  end

  # DELETE /child_profiles/:id — admin removes a kid (and their ledger).
  def destroy
    child = current_family.child_profiles.find(params[:id])
    child.destroy
    render json: { ok: true }
  end

  private

  # The kid summary shape shared by index/show/create/update. photo_url is the seeded avatar
  # (chores:seed_kid_photos), nil until one is attached.
  def child_json(child)
    {
      id: child.id,
      name: child.name,
      balance: child.balance.to_f,
      color: child.color,
      photo_url: child.photo.attached? ? url_for(child.photo) : nil
    }
  end

  def completed_chores_json(child)
    child.completed_chores.completed.order(completed_at: :desc).map do |chore|
      awarded = chore.coin_transactions.find_by(child_profile_id: child.id)&.amount
      {
        id: chore.id,
        title: chore.title,
        reward_coins: chore.reward_coins.to_f,
        grade: chore.grade,
        awarded: awarded.to_f,
        completed_at: chore.completed_at
      }
    end
  end
end
