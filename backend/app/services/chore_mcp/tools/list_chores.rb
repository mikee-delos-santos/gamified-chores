module ChoreMcp
  module Tools
    # List the family's chores, newest first, optionally filtered by status.
    class ListChores < MCP::Tool
      tool_name "list_chores"
      description "List the family's chores, newest first. Pass status to filter " \
                 "(open, completed, rejected, expired); omit it to list every chore. Each chore " \
                 "includes its proof state so you can find the ones waiting to be reviewed."
      input_schema(
        properties: {
          status: {
            type: "string",
            enum: %w[open completed rejected expired],
            description: "Optional status filter."
          }
        },
        required: [],
      )

      class << self
        def call(server_context:, status: nil)
          ChoreMcp.respond do
            chores = server_context[:family].chores.order(created_at: :desc)
            chores = chores.where(status: status) if status.present? && Chore.statuses.key?(status)
            ChoreMcp.ok(chores.map { |chore| server_context[:serializer].call(chore) })
          end
        end
      end
    end
  end
end
