require "rails_helper"

RSpec.describe PushNotifier do
  let!(:family) { Family.create!(name: "Test Family") }
  let!(:admin) do
    User.create!(family: family, name: "Admin", email: "admin@example.com",
                 password: "password123", password_confirmation: "password123")
  end
  let!(:julia) { ChildProfile.create!(family: family, name: "Julia") }
  let!(:cyrus) { ChildProfile.create!(family: family, name: "Cyrus") }

  # One subscription per device kind. Parent = untagged (child_profile nil).
  let!(:parent_sub) { sub("parent", nil) }
  let!(:julia_sub) { sub("julia", julia) }
  let!(:cyrus_sub) { sub("cyrus", cyrus) }

  def sub(name, child)
    PushSubscription.create!(family: family, child_profile: child,
                             endpoint: "https://push.example/#{name}", p256dh: "p", auth: "a")
  end

  before do
    allow(PushNotifier).to receive(:configured?).and_return(true)
    @delivered = []
    allow(PushNotifier).to receive(:deliver) { |s, _payload| @delivered << s.endpoint }
  end

  describe ".notify_chore" do
    it "reaches only parents and the assigned kid when a chore is assigned" do
      chore = Chore.create!(family: family, created_by: admin, title: "Dishes",
                            reward_coins: 3, assigned_to: julia)

      PushNotifier.notify_chore(chore, title: "t", body: "b")

      expect(@delivered).to contain_exactly(parent_sub.endpoint, julia_sub.endpoint)
      expect(@delivered).not_to include(cyrus_sub.endpoint)
    end

    it "reaches the whole family when the chore is unassigned" do
      chore = Chore.create!(family: family, created_by: admin, title: "Dishes", reward_coins: 3)

      PushNotifier.notify_chore(chore, title: "t", body: "b")

      expect(@delivered).to contain_exactly(parent_sub.endpoint, julia_sub.endpoint, cyrus_sub.endpoint)
    end
  end
end
