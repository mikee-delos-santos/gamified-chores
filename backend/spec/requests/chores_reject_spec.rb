require "rails_helper"

RSpec.describe "POST /chores/:id/reject", type: :request do
  let!(:family) { Family.create!(name: "Test Family") }
  let!(:admin) do
    User.create!(
      family: family,
      name: "Admin",
      email: "admin@example.com",
      password: "password123",
      password_confirmation: "password123"
    )
  end
  let!(:child) { ChildProfile.create!(family: family, name: "Faye") }
  let!(:chore) do
    Chore.create!(
      family: family,
      created_by: admin,
      title: "Wash dishes",
      reward_coins: 3,
      proof_by_child: child
    )
  end

  it "marks an open chore rejected and awards no coins" do
    expect {
      post "/chores/#{chore.id}/reject", headers: auth_headers(admin)
    }.not_to change(CoinTransaction, :count)

    expect(response).to have_http_status(:ok)
    json = JSON.parse(response.body)
    expect(json["status"]).to eq("rejected")

    chore.reload
    expect(chore).to be_rejected
  end

  it "refuses to reject a chore that is not open" do
    chore.update!(status: :completed)

    post "/chores/#{chore.id}/reject", headers: auth_headers(admin)

    expect(response).to have_http_status(:unprocessable_entity)
    chore.reload
    expect(chore).to be_completed
  end

  it "requires an admin (rejects unauthenticated calls)" do
    post "/chores/#{chore.id}/reject"

    expect(response).to have_http_status(:unauthorized)
    chore.reload
    expect(chore).to be_open
  end

  private

  def auth_headers(user)
    token = JsonWebToken.encode({ user_id: user.id, family_id: user.family_id })
    { "Authorization" => "Bearer #{token}" }
  end
end
