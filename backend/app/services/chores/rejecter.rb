module Chores
  # Marks a chore's submitted proof as not-done: terminal, no coins, no resubmit. Shared by
  # ChoresController#reject and the MCP reject_chore tool. Only an open chore can be rejected.
  class Rejecter
    class NotOpen < StandardError; end

    def self.call(chore:)
      raise NotOpen, "chore is not open (already #{chore.status})" unless chore.open?

      chore.update!(status: :rejected)

      who = chore.proof_by_child&.name
      body = who ? "#{who}: #{chore.title} was marked not done" : "#{chore.title} was marked not done"
      PushNotifier.notify_chore(chore, title: "Chore not done", body: body, url: "/?chore=#{chore.id}")

      chore
    end
  end
end
