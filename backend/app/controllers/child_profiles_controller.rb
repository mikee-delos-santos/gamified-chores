# Kid-facing read model: profile picker + a child's balance and completed chores.
# Intentionally unauthenticated — kids have no login (MVP single-family).
class ChildProfilesController < ApplicationController
  def index
    profiles = ChildProfile.order(:id).map do |child|
      { id: child.id, name: child.name, balance: child.balance.to_f }
    end
    render json: profiles
  end

  def show
    child = ChildProfile.find(params[:id])
    render json: {
      id: child.id,
      name: child.name,
      balance: child.balance.to_f,
      completed_chores: completed_chores_json(child)
    }
  end

  private

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
