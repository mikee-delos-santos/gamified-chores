# Weekly exchange-rate forecast (PC-82)

Teach the kids to wait for a good day by showing the coin to peso exchange rate
a week in advance, then letting them watch it change each day.

## Goal

Kids currently see one flat exchange rate the admin sets by hand. This feature turns
the rate into a weekly forecast: seven predetermined daily rates, rolled at the start
of the week and revealed as a trend graph, so a kid can see that Thursday pays more
than Monday and choose to wait before cashing out.

## Behavior

- **Sunday 23:00 Manila (GMT+8):** pre-generate 7 random daily rates for the upcoming
  Monday through Sunday. Each day is independently random between 0.1 and 5.0, rounded
  to 1 decimal (0.1 steps). Announce with a push: "New exchange rate trend projection".
- **Every midnight Manila:** set the live rate (`families.peso_per_coin`) to that day's
  predetermined value. This fires only the existing "Coin rate updated" push, and only
  when the rate actually changed. No new notification type here.
- **Admin manual override:** `PATCH /family/settings` still sets `peso_per_coin`
  immediately (with its existing push). Because the midnight job overwrites the live rate
  from the schedule, a manual change naturally lasts only until the next midnight. No
  override flag is needed - the midnight job always wins.
- **Trend graph:** both the kid and admin bank/cash-out screens show a 7-point line of
  the week's rates, today highlighted and the peak day marked, so the best cash-out day
  is easy to spot.

The Philippines observes no daylight saving, so GMT+8 is fixed year-round. That removes
the usual DST hazard from the cron math.

## Data model

New table `scheduled_exchange_rates`, one row per family per day:

| column          | type          | notes                                             |
|-----------------|---------------|---------------------------------------------------|
| `family_id`     | bigint FK     | scoped to the family (MVP: `Family.first`)        |
| `on_date`       | date          | the Manila calendar day this rate applies         |
| `peso_per_coin` | decimal(10,2) | predetermined rate, 0.1 - 5.0, matches families   |
| timestamps      |               |                                                   |

Unique index on `(family_id, on_date)`. That uniqueness is what makes generation
idempotent: creating a week that already exists is a no-op. A "week" is just the seven
rows for Monday through Sunday.

The live applied rate stays `families.peso_per_coin`, unchanged. Every existing reader of
the rate keeps working; the daily job simply writes the scheduled value into that column.

## Service: `WeeklyRateScheduler`

One service holds the logic so the jobs and the read endpoint share it:

- `ensure_week(family, monday)` - create the 7 rows for that Monday-based week if they do
  not already exist; return the week's rows. No push, no side effects beyond the insert.
  Random draw: `(rand(1..50) / 10.0)` gives 0.1 .. 5.0 in 0.1 steps.
- `apply_for(family, date)` - look up the row for `date`, set `family.peso_per_coin` to it,
  and fire the "Coin rate updated" push only if the value changed. Idempotent.
- Helper to compute the Manila "today" and the Monday of its week:
  `Time.current.in_time_zone("Asia/Manila").to_date`.

## Scheduled jobs (Solid Queue recurring, DB-backed, no Redis)

Defined in `config/recurring.yml`. Cron is written in UTC (server clock) and each job also
derives the Manila date itself, so it stays correct even if firing drifts by a minute.

- **`GenerateWeeklyRatesJob`** - `0 15 * * 0` UTC = Sunday 23:00 Manila. Computes next
  week's Monday (Manila today + 1 day, since it runs Sunday night), calls
  `ensure_week`, then sends the "New exchange rate trend projection" push.
- **`ApplyDailyRateJob`** - `0 16 * * *` UTC = 00:00 Manila. Calls `ensure_week` for the
  current week first (self-heals a missed generation), then `apply_for(today)`.

Manila 00:00 == 16:00 UTC the previous day; Sunday 23:00 Manila == Sunday 15:00 UTC.

The recurring scheduler only runs when the Solid Queue supervisor runs. We run it inside
Puma via `SOLID_QUEUE_IN_PUMA=true` on the backend service (single-server, low volume).
The queue tables already exist through the Rails 8 multi-database setup.

## API

New read endpoint `GET /family/rate_schedule` (unauthenticated, consistent with the other
kid-facing reads like `open_chores` and `pin_status`). It lazily calls `ensure_week` for
the current week so the graph is never empty, then returns:

```json
{
  "week_start": "2026-09-21",
  "peso_per_coin": 2.5,
  "days": [
    { "date": "2026-09-21", "weekday": "Mon", "peso_per_coin": 4.7, "is_today": false, "is_past": true },
    { "date": "2026-09-24", "weekday": "Thu", "peso_per_coin": 2.5, "is_today": true,  "is_past": false }
  ]
}
```

`peso_per_coin` at the top is the live applied rate right now. If the admin manually
overrode today, that live value can differ from today's scheduled value on the graph; the
graph marks "today" using the live value so it stays honest. This is a rare case and
acceptable.

## Frontend (kid and admin bank screens)

- `api.ts`: `getRateSchedule()` returning a new `RateWeek` type matching the JSON above.
- New `RateTrendCard` component drawn with the existing `react-native-svg` (no new
  dependency): a 7-point line, Mon-Sun on the x-axis, 0.1-5.0 on the y-axis, today's point
  highlighted and the peak day marked. Shows the current live rate as a caption.
- Rendered on both `(kid)/(tabs)/bank.tsx` and `(admin)/(tabs)/bank.tsx`, fetched
  alongside the existing bank load.

## Testing

RSpec specs for `WeeklyRateScheduler` (this is the logic-heavy piece the backend CLAUDE.md
flags as the point to add specs):

- generation produces exactly 7 rows, all within 0.1..5.0, all 1-decimal.
- generation is idempotent (second call does not re-roll).
- `apply_for` sets `families.peso_per_coin` to the day's scheduled value.
- push fires on a real change and not on a no-op.

## Out of scope

- Editing individual future days by hand (admin can only manually override the live rate,
  which lasts until the next midnight).
- Multi-family support beyond the existing single-family MVP.
