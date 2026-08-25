module ChoreMcp
  module Tools
    # Approve a chore for a kid at a 1-5 star grade, awarding grade/5 of the reward.
    class ApproveChore < MCP::Tool
      tool_name "approve_chore"
      description "Approve (complete) a chore for a kid at a 1-5 star grade, awarding grade/5 of the " \
                 "reward coins. Use list_chores to find the chore and list_children for the kid id. " \
                 "Only an open chore can be approved."
      input_schema(
        properties: {
          chore_id: { type: "integer", description: "The chore to approve." },
          child_profile_id: { type: "integer", description: "The kid who did the chore." },
          grade: { type: "integer", description: "Quality grade, 1 (partial) to 5 (full reward)." }
        },
        required: [ "chore_id", "child_profile_id", "grade" ],
      )

      class << self
        def call(chore_id:, child_profile_id:, grade:, server_context:)
          ChoreMcp.respond do
            family = server_context[:family]
            chore = family.chores.find(chore_id)
            child = family.child_profiles.find(child_profile_id)
            result = Chores::Approver.call(chore: chore, child: child, grade: grade)
            payload = server_context[:serializer].call(result.chore)
                                                 .merge(awarded: result.award.to_f, child_balance: child.balance.to_f)
            ChoreMcp.ok(payload)
          end
        end
      end
    end
  end
end
