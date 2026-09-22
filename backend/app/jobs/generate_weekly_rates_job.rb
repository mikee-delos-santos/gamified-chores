# Sunday 23:00 Manila: roll next week's seven daily rates and announce the new forecast.
# The apply job at the following midnight starts revealing them one day at a time.
class GenerateWeeklyRatesJob < ApplicationJob
  queue_as :default

  def perform
    today = WeeklyRateScheduler.today
    upcoming_monday = WeeklyRateScheduler.monday_of(today + 1.day)

    Family.find_each do |family|
      WeeklyRateScheduler.ensure_week(family, upcoming_monday)
      PushNotifier.notify_family(
        family,
        title: "New exchange rate trend projection",
        body: "This week's coin rates are set. Peek at the trend and pick your day to cash out!",
        url: "/",
      )
    end
  end
end
