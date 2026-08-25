require "rails_helper"

RSpec.describe "Chore assignment", type: :request do
  let!(:family) { Family.create!(name: "Test Family") }
  let!(:admin) do
    User.create!(family: family, name: "Admin", email: "admin@example.com",
                 password: "password123", password_confirmation: "password123")
  end
  let!(:julia) { ChildProfile.create!(family: family, name: "Julia") }
  let!(:cyrus) { ChildProfile.create!(family: family, name: "Cyrus") }

  def auth_headers(user)
    token = JsonWebToken.encode({ user_id: user.id, family_id: user.family_id })
    { "Authorization" => "Bearer #{token}" }
  end

  describe "POST /chores with child_profile_id" do
    it "assigns the chore and returns assigned_to in the JSON" do
      post "/chores", params: { title: "Dishes", reward_coins: 3, child_profile_id: julia.id },
                      headers: auth_headers(admin)

      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      expect(json["assigned_to"]).to eq("id" => julia.id, "name" => "Julia", "color" => nil)
      expect(Chore.last.child_profile_id).to eq(julia.id)
    end

    it "leaves the chore unassigned when child_profile_id is blank" do
      post "/chores", params: { title: "Dishes", reward_coins: 3, child_profile_id: "" },
                      headers: auth_headers(admin)

      expect(response).to have_http_status(:created)
      expect(JSON.parse(response.body)["assigned_to"]).to be_nil
      expect(Chore.last.child_profile_id).to be_nil
    end

    it "rejects a kid from another family" do
      other_family = Family.create!(name: "Other")
      stranger = ChildProfile.create!(family: other_family, name: "Stranger")

      post "/chores", params: { title: "Dishes", reward_coins: 3, child_profile_id: stranger.id },
                      headers: auth_headers(admin)

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "PATCH /chores/:id" do
    let!(:chore) { Chore.create!(family: family, created_by: admin, title: "Dishes", reward_coins: 3, assigned_to: julia) }

    it "reassigns to another kid" do
      patch "/chores/#{chore.id}", params: { child_profile_id: cyrus.id }, headers: auth_headers(admin)

      expect(response).to have_http_status(:ok)
      expect(chore.reload.child_profile_id).to eq(cyrus.id)
    end

    it "clears the assignment when child_profile_id is blank" do
      patch "/chores/#{chore.id}", params: { child_profile_id: "" }, headers: auth_headers(admin)

      expect(response).to have_http_status(:ok)
      expect(chore.reload.child_profile_id).to be_nil
    end

    it "leaves the assignment untouched when child_profile_id is omitted" do
      patch "/chores/#{chore.id}", params: { title: "Wash up" }, headers: auth_headers(admin)

      expect(response).to have_http_status(:ok)
      expect(chore.reload.child_profile_id).to eq(julia.id)
    end
  end

  describe "GET /open_chores" do
    let!(:unassigned) { Chore.create!(family: family, created_by: admin, title: "Anyone", reward_coins: 1) }
    let!(:for_julia) { Chore.create!(family: family, created_by: admin, title: "Julia only", reward_coins: 1, assigned_to: julia) }
    let!(:for_cyrus) { Chore.create!(family: family, created_by: admin, title: "Cyrus only", reward_coins: 1, assigned_to: cyrus) }

    it "returns unassigned plus the kid's own chores for that kid" do
      get "/open_chores", params: { child_profile_id: julia.id }

      titles = JSON.parse(response.body).map { |c| c["title"] }
      expect(titles).to contain_exactly("Anyone", "Julia only")
    end

    it "returns only unassigned chores when no kid id is given" do
      get "/open_chores"

      titles = JSON.parse(response.body).map { |c| c["title"] }
      expect(titles).to contain_exactly("Anyone")
    end
  end
end
