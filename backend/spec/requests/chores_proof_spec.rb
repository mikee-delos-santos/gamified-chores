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

  let(:proof_image) do
    Rack::Test::UploadedFile.new(Rails.root.join("spec/fixtures/files/proof.png"), "image/png")
  end

  describe "with child_profile_id param" do
    it "persists proof_by_child_id and returns proof_by in the JSON" do
      post "/chores/#{chore.id}/proof", params: { proof_photos: [proof_image], child_profile_id: child.id, by: child.name }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json["proof_by"]).to eq("id" => child.id, "name" => child.name, "color" => child.color,
                                     "photo_url" => nil)

      chore.reload
      expect(chore.proof_by_child_id).to eq(child.id)
    end
  end

  describe "rejects a submit with no proof photo" do
    it "returns 422 and does not attach proof" do
      post "/chores/#{chore.id}/proof", params: { by: "A kid" }

      expect(response).to have_http_status(:unprocessable_entity)
      json = JSON.parse(response.body)
      expect(json["error"]).to eq("a proof photo is required")

      chore.reload
      expect(chore.proof_photos.attached?).to be(false)
    end
  end

  describe "with a proof photo but no child_profile_id" do
    it "returns 200 and attaches the proof" do
      post "/chores/#{chore.id}/proof", params: { proof_photos: [proof_image], by: "A kid" }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json["proof_by"]).to be_nil

      chore.reload
      expect(chore.proof_photos.attached?).to be(true)
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
      expect(found["proof_by"]).to eq("id" => child.id, "name" => child.name, "color" => child.color,
                                      "photo_url" => nil)
    end
  end

  private

  def auth_headers(user)
    token = JsonWebToken.encode({ user_id: user.id, family_id: user.family_id })
    { "Authorization" => "Bearer #{token}" }
  end
end
