module ChoreMcp
  module Tools
    # Reject a chore's submitted proof as not-done. Terminal, no coins awarded.
    class RejectChore < MCP::Tool
      tool_name "reject_chore"
      description "Reject a chore whose proof is not acceptable. This is terminal: no coins are " \
                 "awarded and the kid cannot resubmit. Only an open chore can be rejected."
      input_schema(
        properties: {
          chore_id: { type: "integer", description: "The chore to reject." }
        },
        required: [ "chore_id" ],
      )

      class << self
        def call(chore_id:, server_context:)
          ChoreMcp.respond do
            chore = server_context[:family].chores.find(chore_id)
            ChoreMcp.ok(server_context[:serializer].call(Chores::Rejecter.call(chore: chore)))
          end
        end
      end
    end
  end
end
