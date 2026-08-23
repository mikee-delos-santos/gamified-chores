# One immutable entry in a child's coin ledger. Positive amounts are earnings,
# negative amounts are spends. A child's balance is the sum of these rows.
class CoinTransaction < ApplicationRecord
  belongs_to :child_profile
  belongs_to :chore, optional: true

  # chore_reward: earned by finishing a chore. cash_out: spent via an approved cash-out request
  # (negative amount). adjustment: a manual grown-up correction.
  enum :reason, { chore_reward: 0, cash_out: 1, adjustment: 2 }, default: :chore_reward

  # Decimal amounts so graded awards (e.g. 0.8 of the reward) are exact (PC-34).
  validates :amount, numericality: true
end
