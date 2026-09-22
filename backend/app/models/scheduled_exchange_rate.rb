# One predetermined coin -> peso rate for a single day. Seven of these form a week's forecast.
# The live applied rate stays on Family#peso_per_coin; ApplyDailyRateJob copies the day's value
# into it at midnight Manila time.
class ScheduledExchangeRate < ApplicationRecord
  belongs_to :family

  validates :on_date, presence: true, uniqueness: { scope: :family_id }
  validates :peso_per_coin, numericality: { greater_than: 0 }
end
