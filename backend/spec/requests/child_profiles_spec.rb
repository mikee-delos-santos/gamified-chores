require "rails_helper"

RSpec.describe "GET /child_profiles", type: :request do
  let!(:family) { Family.create!(name: "Test Family") }
  let!(:child) { ChildProfile.create!(family: family, name: "Julia", color: "#EC4899") }

  it "returns kids with a null photo_url when none is attached" do
    get "/child_profiles"

    row = JSON.parse(response.body).find { |c| c["id"] == child.id }
    expect(row).to include("name" => "Julia", "color" => "#EC4899", "photo_url" => nil)
  end

  it "returns a photo_url once a photo is attached" do
    child.photo.attach(
      Rack::Test::UploadedFile.new(StringIO.new("img"), "image/jpeg", original_filename: "julia.jpg")
    )

    get "/child_profiles"

    row = JSON.parse(response.body).find { |c| c["id"] == child.id }
    expect(row["photo_url"]).to be_present
  end
end
