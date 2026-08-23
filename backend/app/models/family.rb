class Family < ApplicationRecord
  # Grown-up PIN used to switch which kid a device is bound to. Optional (validations: false)
  # so a family without a PIN set can still switch freely until one is configured.
  has_secure_password :pin, validations: false

  has_many :users, dependent: :destroy
  has_many :child_profiles, dependent: :destroy
  has_many :chores, dependent: :destroy
  has_many :push_subscriptions, dependent: :destroy

  validates :name, presence: true

  def pin_set?
    pin_digest.present?
  end
end
