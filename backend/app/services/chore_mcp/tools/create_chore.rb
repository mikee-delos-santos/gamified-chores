module ChoreMcp
  module Tools
    # Create a new open chore for the family, optionally assigned to one kid.
    class CreateChore < MCP::Tool
      tool_name "create_chore"
      description "Create a new open chore for the family. Optionally assign it to a single kid by " \
                 "passing child_profile_id (get ids from list_children); omit it to leave the chore " \
                 "open to any kid. Returns the created chore."
      input_schema(
        properties: {
          title: { type: "string", description: "Short name of the chore, e.g. 'Sweep the porch'." },
          description: { type: "string", description: "Optional longer instructions." },
          reward_coins: { type: "number", description: "Faye Coins awarded on full completion." },
          child_profile_id: { type: "integer", description: "Optional kid to assign this chore to." }
        },
        required: [ "title", "reward_coins" ],
      )

      class << self
        def call(title:, reward_coins:, description: nil, child_profile_id: nil, server_context:)
          ChoreMcp.respond do
            family = server_context[:family]
            assignee = child_profile_id && family.child_profiles.find(child_profile_id)
            chore = Chores::Creator.call(
              family: family,
              created_by: server_context[:user],
              title: title,
              reward_coins: reward_coins,
              description: description,
              assignee: assignee,
            )
            ChoreMcp.ok(server_context[:serializer].call(chore))
          end
        end
      end
    end
  end
end
