class AddGradeToChores < ActiveRecord::Migration[8.1]
  def change
    # 1-5 star grade set when an admin approves/completes a chore (PC-34).
    # Null until completed; the award is grade/5 of reward_coins.
    add_column :chores, :grade, :integer
  end
end
