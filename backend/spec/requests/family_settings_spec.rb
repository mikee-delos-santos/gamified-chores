require "rails_helper"

RSpec.describe "PATCH /family/settings", type: :request do
  let!(:family) { Family.create!(name: "Test Family", peso_per_coin: 2) }
  let!(:admin) do
    User.create!(
      family: family,
      name: "Admin",
      email: "admin@example.com",
      password: "password123",
      password_confirmation: "password123"
    )
  end

  it "notifies the whole family when the rate changes" do
    expect(PushNotifier).to receive(:notify_family).with(
      family_matching(family),
      hash_including(body: a_string_including("2.5"))
    )

    patch "/family/settings", params: { peso_per_coin: 2.5 }, headers: auth_headers(admin)

    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body)["peso_per_coin"]).to eq(2.5)
    expect(family.reload.peso_per_coin).to eq(2.5)
  end

  it "does not notify when the submitted rate equals the current rate" do
    expect(PushNotifier).not_to receive(:notify_family)

    patch "/family/settings", params: { peso_per_coin: 2 }, headers: auth_headers(admin)

    expect(response).to have_http_status(:ok)
  end

  private

  # Matches the family arg regardless of a reloaded/rebuilt instance.
  def family_matching(expected)
    satisfy { |actual| actual.is_a?(Family) && actual.id == expected.id }
  end

  def auth_headers(user)
    token = JsonWebToken.encode({ user_id: user.id, family_id: user.family_id })
    { "Authorization" => "Bearer #{token}" }
  end
end
