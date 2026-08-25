module ChoreMcp
  module Tools
    # Post a fresh open chore from a reusable template (the recurring-chore case).
    class PostChoreFromTemplate < MCP::Tool
      tool_name "post_chore_from_template"
      description "Post a fresh open chore from a reusable chore template, copying its how-to photos. " \
                 "Use this for recurring chores (e.g. weekly trash). Returns the new chore."
      input_schema(
        properties: {
          template_id: { type: "integer", description: "The chore template to post from." }
        },
        required: [ "template_id" ],
      )

      class << self
        def call(template_id:, server_context:)
          ChoreMcp.respond do
            template = server_context[:family].chore_templates.find(template_id)
            chore = Chores::TemplatePoster.call(template: template, created_by: server_context[:user])
            ChoreMcp.ok(server_context[:serializer].call(chore))
          end
        end
      end
    end
  end
end
