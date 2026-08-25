module Chores
  # Awards a chore to a child at a 1-5 star grade: writes the completion and the coin ledger entry
  # in one transaction, idempotently (a non-open chore is refused). Shared by
  # ChoresController#complete and the MCP approve_chore tool. Callers map the guard errors to
  # their own response shape.
  class Approver
    class NotOpen < StandardError; end
    class BadGrade < StandardError; end

    Result = Struct.new(:chore, :award, :child, keyword_init: true)

    def self.call(chore:, child:, grade:)
      raise NotOpen, "chore is not open (already #{chore.status})" unless chore.open?
      raise BadGrade, "grade must be an integer 1-5" unless (1..5).cover?(grade)

      award = chore.award_for(grade)
      ActiveRecord::Base.transaction do
        chore.update!(status: :completed, completed_by: child, completed_at: Time.current, grade: grade)
        CoinTransaction.create!(child_profile: child, amount: award, chore: chore, reason: :chore_reward)
      end

      PushNotifier.notify_chore(
        chore,
        title: "Nice work, #{child.name}!",
        body: "#{award.to_f} coins for #{chore.title}",
        url: "/?chore=#{chore.id}",
      )

      Result.new(chore: chore, award: award, child: child)
    end
  end
end
