class Chore < ApplicationRecord
  belongs_to :family
  belongs_to :created_by, class_name: "User", inverse_of: :created_chores
  belongs_to :completed_by,
             class_name: "ChildProfile",
             inverse_of: :completed_chores,
             optional: true
  belongs_to :proof_by_child, class_name: "ChildProfile", optional: true
  has_many :coin_transactions, dependent: :nullify

  # Media (photo-only, ADR 0002): admin how-to images + the kid's proof images.
  # Both are multi-image: a chore can show several how-to shots and collect several proof shots.
  has_many_attached :how_to_photos
  has_many_attached :proof_photos

  enum :status, { open: 0, completed: 1, rejected: 2, expired: 3 }, default: :open

  validates :title, presence: true
  # Decimal so grading can award a fraction of the reward (PC-34).
  validates :reward_coins, numericality: { greater_than_or_equal_to: 0 }
  validates :grade, inclusion: { in: 1..5 }, allow_nil: true

  # Coins awarded for a 1-5 star grade (PC-34): stars/5 of the reward,
  # e.g. 4 stars on a 3-coin chore => 2.4.
  def award_for(stars)
    (reward_coins * stars / 5).round(2)
  end
end
