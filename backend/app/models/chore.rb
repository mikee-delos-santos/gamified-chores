class Chore < ApplicationRecord
  belongs_to :family
  belongs_to :created_by, class_name: "User", inverse_of: :created_chores
  belongs_to :completed_by,
             class_name: "ChildProfile",
             inverse_of: :completed_chores,
             optional: true
  has_many :coin_transactions, dependent: :nullify

  enum :status, { open: 0, completed: 1, rejected: 2 }, default: :open

  validates :title, presence: true
  # Decimal so grading can award a fraction of the reward (PC-34).
  validates :reward_coins, numericality: { greater_than_or_equal_to: 0 }
end
