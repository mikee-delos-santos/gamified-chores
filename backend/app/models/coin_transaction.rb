# One immutable entry in a child's coin ledger. Positive amounts are earnings,
# negative amounts are spends. A child's balance is the sum of these rows.
class CoinTransaction < ApplicationRecord
  belongs_to :child_profile
  belongs_to :chore, optional: true

  # Room to grow: store/withdraw/adjustment land here in the Coin Bank epic.
  enum :reason, { chore_reward: 0 }, default: :chore_reward

  validates :amount, numericality: { only_integer: true }
end
