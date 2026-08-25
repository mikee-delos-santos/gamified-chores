module Chores
  # Spawns a fresh open chore from a reusable template, copying the template's how-to photos by
  # blob (no re-upload), and fires the same "new chore" push. Shared by
  # ChoreTemplatesController#post_chore and the MCP post_chore_from_template tool.
  class TemplatePoster
    def self.call(template:, created_by:)
      family = template.family
      chore = family.chores.new(
        title: template.title,
        description: template.description,
        reward_coins: template.reward_coins,
        created_by: created_by,
      )
      chore.save!
      copy_how_to_photos(template, chore)
      PushNotifier.notify_family(family, title: "New chore", body: chore.title, url: "/")
      chore
    end

    def self.copy_how_to_photos(template, chore)
      return unless template.how_to_photos.attached?

      template.how_to_photos.each { |photo| chore.how_to_photos.attach(photo.blob) }
    end
  end
end
