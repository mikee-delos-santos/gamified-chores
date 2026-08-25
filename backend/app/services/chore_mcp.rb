# Shared helpers for the Chore MCP tools: a uniform way to wrap a result payload and to turn the
# domain's exceptions into MCP tool errors (isError responses) instead of 500s. Every tool runs
# its body inside `respond` so an agent gets a readable message rather than a crash.
module ChoreMcp
  # The full tool set the /mcp endpoint advertises.
  def self.tools
    [
      Tools::CreateChore,
      Tools::ApproveChore,
      Tools::RejectChore,
      Tools::ListChores,
      Tools::ListChildren,
      Tools::PostChoreFromTemplate,
    ]
  end

  # A successful tool result. The payload is JSON in a text block (what every MCP host can read),
  # and, when it's an object, also as structuredContent for hosts that consume typed output.
  def self.ok(payload)
    MCP::Tool::Response.new(
      [{ type: "text", text: payload.to_json }],
      structured_content: payload.is_a?(Hash) ? payload : nil,
    )
  end

  def self.error(message)
    MCP::Tool::Response.new([{ type: "text", text: message }], error: true)
  end

  # Run a tool body, mapping the same failures the REST controllers handle into tool errors.
  def self.respond
    yield
  rescue ActiveRecord::RecordNotFound => e
    error("Not found: #{e.message}")
  rescue ActiveRecord::RecordInvalid => e
    error(e.record.errors.full_messages.to_sentence)
  rescue Chores::Approver::NotOpen, Chores::Approver::BadGrade, Chores::Rejecter::NotOpen => e
    error(e.message)
  end
end
