require "rails_helper"

# The MCP endpoint any authenticated AI agent connects to. It speaks JSON-RPC over a single
# POST /mcp, reusing the admin JWT for auth and scoping every tool to that admin's family.
RSpec.describe "POST /mcp", type: :request do
  let!(:family) { Family.create!(name: "Test Family") }
  let!(:admin) do
    User.create!(family: family, name: "Admin", email: "admin@example.com",
                 password: "password123", password_confirmation: "password123")
  end
  let!(:julia) { ChildProfile.create!(family: family, name: "Julia") }

  def auth_headers(user)
    token = JsonWebToken.encode({ user_id: user.id, family_id: user.family_id })
    { "Authorization" => "Bearer #{token}", "Content-Type" => "application/json" }
  end

  # Send one JSON-RPC call and return the parsed response body.
  def rpc(method, params = {}, id: 1, user: admin)
    body = { jsonrpc: "2.0", id: id, method: method, params: params }.to_json
    post "/mcp", params: body, headers: auth_headers(user)
    JSON.parse(response.body)
  end

  # tools/call returns a result whose `content` is a text block; pull the JSON payload back out.
  def tool_result(name, arguments = {}, user: admin)
    parsed = rpc("tools/call", { name: name, arguments: arguments }, user: user)
    parsed.fetch("result")
  end

  def tool_payload(result)
    JSON.parse(result["content"].first["text"])
  end

  describe "handshake" do
    it "responds to initialize with the chore-app server info" do
      parsed = rpc("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1" },
      })

      expect(parsed["result"]["serverInfo"]["name"]).to eq("chore-app")
      expect(parsed["result"]["protocolVersion"]).to be_present
    end
  end

  describe "tools/list" do
    it "advertises the six chore tools" do
      names = rpc("tools/list")["result"]["tools"].map { |t| t["name"] }

      expect(names).to contain_exactly(
        "create_chore", "approve_chore", "reject_chore",
        "list_chores", "list_children", "post_chore_from_template"
      )
    end
  end

  describe "auth" do
    it "rejects a request with no bearer token" do
      post "/mcp", params: { jsonrpc: "2.0", id: 1, method: "tools/list" }.to_json,
                   headers: { "Content-Type" => "application/json" }

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "create_chore" do
    it "creates an open chore in the family" do
      result = tool_result("create_chore", { title: "Sweep", reward_coins: 4 })

      expect(result["isError"]).to be_falsey
      payload = tool_payload(result)
      expect(payload["title"]).to eq("Sweep")
      expect(payload["status"]).to eq("open")
      expect(family.chores.reload.last.title).to eq("Sweep")
    end

    it "assigns the chore when child_profile_id is given" do
      result = tool_result("create_chore", { title: "Dishes", reward_coins: 2, child_profile_id: julia.id })

      expect(tool_payload(result)["assigned_to"]["name"]).to eq("Julia")
    end

    it "returns a tool error when required title is missing" do
      result = tool_result("create_chore", { reward_coins: 2 })

      expect(result["isError"]).to be(true)
    end
  end

  describe "approve_chore" do
    let!(:chore) { Chore.create!(family: family, created_by: admin, title: "Trash", reward_coins: 5) }

    it "awards graded coins and completes the chore" do
      result = tool_result("approve_chore", { chore_id: chore.id, child_profile_id: julia.id, grade: 4 })

      expect(result["isError"]).to be_falsey
      expect(chore.reload).to be_completed
      expect(julia.reload.balance.to_f).to eq(4.0)
    end

    it "returns a tool error when the chore is not open" do
      chore.update!(status: :completed)

      result = tool_result("approve_chore", { chore_id: chore.id, child_profile_id: julia.id, grade: 4 })

      expect(result["isError"]).to be(true)
    end
  end

  describe "reject_chore" do
    let!(:chore) { Chore.create!(family: family, created_by: admin, title: "Trash", reward_coins: 5, proof_by_child: julia) }

    it "marks the chore rejected and awards no coins" do
      expect {
        result = tool_result("reject_chore", { chore_id: chore.id })
        expect(result["isError"]).to be_falsey
      }.not_to change(CoinTransaction, :count)

      expect(chore.reload).to be_rejected
    end
  end

  describe "list_chores" do
    let!(:open_chore) { Chore.create!(family: family, created_by: admin, title: "Open one", reward_coins: 1) }
    let!(:done_chore) { Chore.create!(family: family, created_by: admin, title: "Done one", reward_coins: 1, status: :completed) }

    it "lists all chores by default" do
      titles = tool_payload(tool_result("list_chores")).map { |c| c["title"] }
      expect(titles).to include("Open one", "Done one")
    end

    it "filters by status" do
      titles = tool_payload(tool_result("list_chores", { status: "open" })).map { |c| c["title"] }
      expect(titles).to contain_exactly("Open one")
    end
  end

  describe "list_children" do
    it "returns the family kids with their balances" do
      CoinTransaction.create!(child_profile: julia, amount: 7, reason: :adjustment)

      children = tool_payload(tool_result("list_children"))
      julia_row = children.find { |c| c["id"] == julia.id }
      expect(julia_row["name"]).to eq("Julia")
      expect(julia_row["balance"]).to eq(7.0)
    end
  end

  describe "post_chore_from_template" do
    let!(:template) { ChoreTemplate.create!(family: family, created_by: admin, title: "Weekly trash", reward_coins: 6) }

    it "spawns a fresh open chore from the template" do
      result = tool_result("post_chore_from_template", { template_id: template.id })

      payload = tool_payload(result)
      expect(payload["title"]).to eq("Weekly trash")
      expect(payload["status"]).to eq("open")
      expect(family.chores.reload.where(title: "Weekly trash")).to be_present
    end
  end
end
