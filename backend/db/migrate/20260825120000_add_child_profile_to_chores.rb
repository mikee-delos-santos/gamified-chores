class AddChildProfileToChores < ActiveRecord::Migration[8.1]
  def change
    # Optional assignee: null = unassigned (open to all kids), set = this chore belongs to one kid.
    add_reference :chores, :child_profile, null: true, foreign_key: true
  end
end
