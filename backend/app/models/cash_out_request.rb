# A kid's request to turn coins into real pesos. Cash out is never instant: the kid creates a
# pending request, and a grown-up approves it (which writes the ledger withdrawal) or denies it.
# peso_amount is snapshotted at the rate when the request was made.
class CashOutRequest < ApplicationRecord
  belongs_to :child_profile
  belongs_to :decided_by, class_name: "User", optional: true

  enum :status, { pending: 0, approved: 1, denied: 2 }, default: :pending

  validates :coins, numericality: { greater_than: 0 }
  validates :peso_amount, numericality: { greater_than_or_equal_to: 0 }
end
