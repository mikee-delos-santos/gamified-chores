module Chores
  # Creates an open chore in a family, with an optional assignee and optional how-to photos, and
  # fires the "new chore" push. Shared by ChoresController#create and the MCP create_chore tool.
  # Pass notify: false to skip the "new chore" push (used when the caller awards the chore in the
  # same request, so only the award push fires).
  class Creator
    def self.call(family:, created_by:, title:, reward_coins:, description: nil, assignee: nil, how_to_photos: nil, notify: true)
      chore = family.chores.new(title: title, description: description, reward_coins: reward_coins)
      chore.created_by = created_by
      chore.assigned_to = assignee
      chore.save!
      chore.how_to_photos.attach(how_to_photos) if how_to_photos.present?
      PushNotifier.notify_chore(chore, title: "New chore", body: chore.title, url: "/?chore=#{chore.id}") if notify
      chore
    end
  end
end
