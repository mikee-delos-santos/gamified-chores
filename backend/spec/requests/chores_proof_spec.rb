require "rails_helper"

RSpec.describe "POST /chores/:id/proof", type: :request do
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
      reward_coins: 3
    )
  end

  describe "with child_profile_id param" do
    it "persists proof_by_child_id and returns proof_by in the JSON" do
      post "/chores/#{chore.id}/proof", params: { child_profile_id: child.id, by: child.name }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json["proof_by"]).to eq("id" => child.id, "name" => child.name, "color" => child.color)

      chore.reload
      expect(chore.proof_by_child_id).to eq(child.id)
    end
  end

  describe "without child_profile_id param" do
    it "leaves proof_by null and still returns 200" do
      post "/chores/#{chore.id}/proof", params: { by: "A kid" }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json["proof_by"]).to be_nil

      chore.reload
      expect(chore.proof_by_child_id).to be_nil
    end
  end

  describe "serializing a chore that already has proof_by_child set" do
    before do
      chore.update!(proof_by_child: child)
    end

    it "returns the correct proof_by in the serialized JSON" do
      get "/chores", headers: auth_headers(admin)

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      found = json.find { |c| c["id"] == chore.id }
      expect(found["proof_by"]).to eq("id" => child.id, "name" => child.name, "color" => child.color)
    end
  end

  private

  def auth_headers(user)
    token = JsonWebToken.encode({ user_id: user.id, family_id: user.family_id })
    { "Authorization" => "Bearer #{token}" }
  end
end
