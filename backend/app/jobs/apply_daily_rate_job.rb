# Midnight Manila: set the live rate to today's predetermined value. Self-heals a missed
# generation by ensuring the current week exists first. apply_for fires the usual
# "Coin rate updated" push when the rate actually changes.
class ApplyDailyRateJob < ApplicationJob
  queue_as :default

  def perform
    today = WeeklyRateScheduler.today

    Family.find_each do |family|
      WeeklyRateScheduler.ensure_week(family, WeeklyRateScheduler.monday_of(today))
      WeeklyRateScheduler.apply_for(family, today)
    end
  end
end
