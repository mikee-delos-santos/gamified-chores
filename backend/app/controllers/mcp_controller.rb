# The Model Context Protocol endpoint that AI agents connect to. It speaks JSON-RPC over a single
# POST /mcp (Streamable HTTP, tools-only, so plain JSON responses with no SSE). Auth reuses the
# admin JWT: an agent presents the same Bearer token an admin uses, and every tool is scoped to
# that admin's family. An agent with an admin token is, by design, a full admin.
class McpController < ApplicationController
  before_action :authenticate_agent!

  def handle
    result = mcp_server.handle_json(request.raw_post)
    if result.nil?
      head :accepted # a notification has no response body
    else
      render json: result
    end
  end

  private

  # Like authenticate_admin!, but a failure returns HTTP 401 with a JSON-RPC error object so an
  # MCP client treats it as an auth challenge rather than a surprise HTML page.
  def authenticate_agent!
    token = request.headers["Authorization"]&.split(" ")&.last
    payload = token && JsonWebToken.decode(token)
    @current_user = payload && User.find_by(id: payload[:user_id])
    return if @current_user&.admin?

    render json: { jsonrpc: "2.0", id: nil, error: { code: -32001, message: "unauthorized" } },
           status: :unauthorized
  end

  def mcp_server
    MCP::Server.new(
      name: "chore-app",
      tools: ChoreMcp.tools,
      server_context: { user: current_user, family: current_family, serializer: method(:chore_json) },
    )
  end
end
