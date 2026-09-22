# Rolls and applies the weekly coin -> peso rate forecast (PC-82).
#
# A "week" is the seven ScheduledExchangeRate rows for Monday..Sunday. Rates are drawn
# independently per day, from 0.1 to 5.0 in 0.1 steps. The live applied rate lives on
# Family#peso_per_coin; apply_for copies a day's scheduled value into it.
#
# All day math is done in Manila time (GMT+8, no DST), so a rate is keyed to the local
# calendar day the kids actually experience.
class WeeklyRateScheduler
  TIME_ZONE = "Asia/Manila".freeze

  # 0.1 .. 5.0 in tenths, stored as the number of tenths so the draw is exact.
  MIN_TENTHS = 1
  MAX_TENTHS = 50

  # Today's date in Manila time.
  def self.today
    Time.current.in_time_zone(TIME_ZONE).to_date
  end

  # The Monday of the week that contains `date`.
  def self.monday_of(date)
    date.beginning_of_week(:monday)
  end

  # Ensure the seven rows for the week starting on `monday` exist, creating any missing
  # days with a fresh random rate. Never re-rolls a day that already exists (idempotent).
  # Returns the week's rows ordered by date.
  def self.ensure_week(family, monday)
    monday = monday_of(monday)
    dates = (0..6).map { |i| monday + i }
    existing = family.scheduled_exchange_rates.where(on_date: dates).index_by(&:on_date)

    (dates - existing.keys).each do |date|
      family.scheduled_exchange_rates.create!(on_date: date, peso_per_coin: random_rate)
    end

    family.scheduled_exchange_rates.where(on_date: dates).order(:on_date)
  end

  # Set the family's live rate to the scheduled value for `date`. Fires the existing
  # "Coin rate updated" push only when the rate actually changes. Returns the applied
  # entry, or nil if there is no scheduled row for that day.
  def self.apply_for(family, date)
    entry = family.scheduled_exchange_rates.find_by(on_date: date)
    return nil if entry.nil?

    old_rate = family.peso_per_coin
    family.update!(peso_per_coin: entry.peso_per_coin)

    if family.peso_per_coin != old_rate
      PushNotifier.notify_family(
        family,
        title: "Coin rate updated",
        body: "1 coin is now ₱#{format("%.2f", family.peso_per_coin)}",
        url: "/",
      )
    end

    entry
  end

  def self.random_rate
    rand(MIN_TENTHS..MAX_TENTHS) / 10.0
  end
end
