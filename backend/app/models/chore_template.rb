# A reusable chore the admin can post again and again (trash day, sweeping).
# Templates carry no completion state; posting one copies its fields into a
# fresh open Chore. See ChoreTemplatesController#post_chore.
class ChoreTemplate < ApplicationRecord
  belongs_to :family
  belongs_to :created_by, class_name: "User", inverse_of: :created_chore_templates

  # Admin how-to images that travel onto each posted chore.
  has_many_attached :how_to_photos

  validates :title, presence: true
  validates :reward_coins, numericality: { greater_than_or_equal_to: 0 }
end
