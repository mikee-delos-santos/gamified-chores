require "rails_helper"

RSpec.describe WeeklyRateScheduler do
  let!(:family) { Family.create!(name: "Test Family", peso_per_coin: 2.5) }
  let(:monday) { Date.new(2026, 9, 21) } # a Monday

  describe ".ensure_week" do
    it "creates exactly 7 rows, one per day of the week" do
      entries = described_class.ensure_week(family, monday)

      expect(entries.size).to eq(7)
      expect(entries.map(&:on_date)).to eq((0..6).map { |i| monday + i })
    end

    it "draws every rate within 0.1..5.0 at 1-decimal precision" do
      entries = described_class.ensure_week(family, monday)

      entries.each do |e|
        rate = e.peso_per_coin
        expect(rate).to be >= 0.1
        expect(rate).to be <= 5.0
        expect((rate * 10).round).to eq((rate * 10)) # exactly one decimal place
      end
    end

    it "normalizes any day in the week to that week's Monday" do
      wednesday = monday + 2
      entries = described_class.ensure_week(family, wednesday)

      expect(entries.first.on_date).to eq(monday)
    end

    it "is idempotent — a second call does not re-roll existing days" do
      first = described_class.ensure_week(family, monday).map(&:peso_per_coin)

      expect {
        second = described_class.ensure_week(family, monday).map(&:peso_per_coin)
        expect(second).to eq(first)
      }.not_to change { family.scheduled_exchange_rates.count }
    end
  end

  describe ".apply_for" do
    before { described_class.ensure_week(family, monday) }

    it "sets the family's live rate to the scheduled value for that day" do
      day = family.scheduled_exchange_rates.find_by(on_date: monday)

      described_class.apply_for(family, monday)

      expect(family.reload.peso_per_coin).to eq(day.peso_per_coin)
    end

    it "returns nil and leaves the rate untouched when no day is scheduled" do
      unscheduled = monday + 30

      expect(described_class.apply_for(family, unscheduled)).to be_nil
      expect(family.reload.peso_per_coin).to eq(2.5)
    end

    it "pushes when the rate changes" do
      family.scheduled_exchange_rates.find_by(on_date: monday).update!(peso_per_coin: 4.0)
      family.update!(peso_per_coin: 1.0)

      expect(PushNotifier).to receive(:notify_family).once
      described_class.apply_for(family, monday)
      expect(family.reload.peso_per_coin).to eq(4.0)
    end

    it "does not push when the scheduled rate equals the live rate" do
      family.scheduled_exchange_rates.find_by(on_date: monday).update!(peso_per_coin: 2.5)
      family.update!(peso_per_coin: 2.5)

      expect(PushNotifier).not_to receive(:notify_family)
      described_class.apply_for(family, monday)
    end
  end
end
