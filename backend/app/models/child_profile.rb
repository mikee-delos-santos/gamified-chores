# A kid. No login — the kid app selects a profile. Coin balance is derived from
# the append-only ledger (coin_transactions), never stored.
class ChildProfile < ApplicationRecord
  belongs_to :family
  has_many :coin_transactions, dependent: :destroy
  has_many :cash_out_requests, dependent: :destroy
  has_many :completed_chores,
           class_name: "Chore",
           foreign_key: :completed_by_id,
           inverse_of: :completed_by,
           dependent: :nullify
  has_many :assigned_chores,
           class_name: "Chore",
           foreign_key: :child_profile_id,
           inverse_of: :assigned_to,
           dependent: :nullify

  # A single avatar photo shown on the kid's chore cards (seeded via chores:seed_kid_photos).
  has_one_attached :photo

  validates :name, presence: true

  # Current balance = sum of every ledger entry for this child.
  def balance
    coin_transactions.sum(:amount)
  end
end
