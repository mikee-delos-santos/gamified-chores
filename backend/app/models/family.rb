class Family < ApplicationRecord
  # Grown-up PIN used to switch which kid a device is bound to. Optional (validations: false)
  # so a family without a PIN set can still switch freely until one is configured.
  has_secure_password :pin, validations: false

  has_many :users, dependent: :destroy
  has_many :child_profiles, dependent: :destroy
  has_many :chores, dependent: :destroy
  has_many :chore_templates, dependent: :destroy
  has_many :push_subscriptions, dependent: :destroy
  has_many :cash_out_requests, through: :child_profiles

  validates :name, presence: true
  validates :peso_per_coin, numericality: { greater_than: 0 }

  def pin_set?
    pin_digest.present?
  end

  # PHP peso value of a coin amount at the family's current rate, rounded to centavos.
  def peso_for(coins)
    (coins.to_d * peso_per_coin).round(2)
  end
end
