# Super-admin maintenance tools. Destructive and admin-only — handy for resetting the app
# during development/testing. Scoped to the signed-in admin's family.
class AdminController < ApplicationController
  before_action :authenticate_admin!

  # POST /admin/destroy_chores — delete every chore in the family.
  # coin_transactions have `dependent: :nullify`, so past earnings are kept (just detached).
  def destroy_chores
    count = current_family.chores.count
    current_family.chores.destroy_all
    render json: { ok: true, destroyed: count }
  end

  # POST /admin/reset_coins — wipe the ledger for every kid in the family, zeroing balances.
  def reset_coins
    count = CoinTransaction.where(child_profile_id: current_family.child_profiles.select(:id)).delete_all
    render json: { ok: true, removed_transactions: count }
  end
end
