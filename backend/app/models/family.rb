class Family < ApplicationRecord
  has_many :users, dependent: :destroy
  has_many :child_profiles, dependent: :destroy
  has_many :chores, dependent: :destroy
  has_many :push_subscriptions, dependent: :destroy

  validates :name, presence: true
end
