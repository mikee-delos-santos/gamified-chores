class CreateChoreTemplates < ActiveRecord::Migration[8.1]
  def change
    create_table :chore_templates do |t|
      t.references :family, null: false, foreign_key: true
      t.references :created_by, null: false, foreign_key: { to_table: :users }
      t.string :title, null: false
      t.text :description
      t.decimal :reward_coins, precision: 10, scale: 2, null: false, default: 0

      t.timestamps
    end
  end
end
