require "rails_helper"

RSpec.describe "POST /push/app_update", type: :request do
  let!(:family) { Family.create!(name: "Test Family") }
  let!(:admin) do
    User.create!(family: family, name: "Admin", email: "admin@example.com",
                 password: "password123", password_confirmation: "password123")
  end

  def auth_headers(user)
    token = JsonWebToken.encode({ user_id: user.id, family_id: user.family_id })
    { "Authorization" => "Bearer #{token}" }
  end

  it "requires an admin token" do
    post "/push/app_update"
    expect(response).to have_http_status(:unauthorized)
  end

  it "broadcasts an app-update push to the whole family and reports the count" do
    2.times do |i|
      family.push_subscriptions.create!(endpoint: "https://push.example/#{i}", p256dh: "k#{i}", auth: "a#{i}")
    end

    expect(PushNotifier).to receive(:notify_family).with(
      family,
      hash_including(type: "app-update")
    )

    post "/push/app_update", headers: auth_headers(admin)

    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body)["sent_to"]).to eq(2)
  end
end
