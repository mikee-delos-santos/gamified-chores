module ChoreMcp
  module Tools
    # List the family's kids with their current coin balances, for resolving names to ids.
    class ListChildren < MCP::Tool
      tool_name "list_children"
      description "List the family's kids with their id, name, card color, and current Faye Coin " \
                 "balance. Use this to turn a kid's name into the child_profile_id the other tools need."
      input_schema(properties: {}, required: [])

      class << self
        def call(server_context:)
          ChoreMcp.respond do
            children = server_context[:family].child_profiles.order(:name).map do |child|
              { id: child.id, name: child.name, color: child.color, balance: child.balance.to_f }
            end
            ChoreMcp.ok(children)
          end
        end
      end
    end
  end
end
