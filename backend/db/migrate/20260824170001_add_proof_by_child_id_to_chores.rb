class AddProofByChildIdToChores < ActiveRecord::Migration[8.1]
  def change
    add_reference :chores, :proof_by_child, null: true, foreign_key: { to_table: :child_profiles }
  end
end
