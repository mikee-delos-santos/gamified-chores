require "rails_helper"

RSpec.describe "GET /chores (index + show)", type: :request do
  let!(:family) { Family.create!(name: "Test Family") }
  let!(:admin) do
    User.create!(family: family, name: "Admin", email: "admin@example.com",
                 password: "password123", password_confirmation: "password123")
  end
  let!(:child) { ChildProfile.create!(family: family, name: "Julia") }

  def auth_headers(user)
    token = JsonWebToken.encode({ user_id: user.id, family_id: user.family_id })
    { "Authorization" => "Bearer #{token}" }
  end

  def make_chore(title:, status: :open, created_at: Time.current)
    Chore.create!(family: family, created_by: admin, title: title, reward_coins: 1,
                  status: status, created_at: created_at)
  end

  describe "pagination" do
    before do
      # 25 open chores, oldest first so ordering is checkable by title.
      25.times { |i| make_chore(title: "Chore #{format('%02d', i)}", created_at: i.minutes.ago) }
    end

    it "returns the first page (default per=20), newest first" do
      get "/chores", headers: auth_headers(admin)

      json = JSON.parse(response.body)
      expect(json.size).to eq(20)
      # Newest = smallest minutes.ago = "Chore 00".
      expect(json.first["title"]).to eq("Chore 00")
    end

    it "returns the remainder on page 2" do
      get "/chores", params: { page: 2 }, headers: auth_headers(admin)

      json = JSON.parse(response.body)
      expect(json.size).to eq(5)
    end

    it "honors a custom per" do
      get "/chores", params: { per: 5 }, headers: auth_headers(admin)

      expect(JSON.parse(response.body).size).to eq(5)
    end
  end

  describe "status filter" do
    let!(:open_chore) { make_chore(title: "Open one", status: :open) }
    let!(:done_chore) { make_chore(title: "Done one", status: :completed) }

    it "returns only the requested status" do
      get "/chores", params: { status: "completed" }, headers: auth_headers(admin)

      titles = JSON.parse(response.body).map { |c| c["title"] }
      expect(titles).to eq(["Done one"])
    end
  end

  describe "needs_review=1" do
    let!(:plain_open) { make_chore(title: "No proof", status: :open) }
    let!(:with_proof) { make_chore(title: "Has proof", status: :open) }
    let!(:completed_with_proof) { make_chore(title: "Completed", status: :completed) }

    before do
      file = Rack::Test::UploadedFile.new(StringIO.new("img"), "image/jpeg", original_filename: "p.jpg")
      with_proof.proof_photos.attach(file)
      completed_with_proof.proof_photos.attach(
        Rack::Test::UploadedFile.new(StringIO.new("img"), "image/jpeg", original_filename: "p.jpg")
      )
    end

    it "returns only open chores that have proof, ignoring paging" do
      get "/chores", params: { needs_review: "1", per: 1 }, headers: auth_headers(admin)

      titles = JSON.parse(response.body).map { |c| c["title"] }
      expect(titles).to contain_exactly("Has proof")
    end
  end

  describe "GET /chores/:id" do
    let!(:chore) { make_chore(title: "Wash dishes") }

    it "returns the one chore" do
      get "/chores/#{chore.id}", headers: auth_headers(admin)

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["title"]).to eq("Wash dishes")
    end

    it "404s for a chore in another family" do
      other = Family.create!(name: "Other")
      other_admin = User.create!(family: other, name: "B", email: "b@example.com",
                                 password: "password123", password_confirmation: "password123")
      other_chore = Chore.create!(family: other, created_by: other_admin, title: "Theirs", reward_coins: 1)

      get "/chores/#{other_chore.id}", headers: auth_headers(admin)

      expect(response).to have_http_status(:not_found)
    end
  end
end
