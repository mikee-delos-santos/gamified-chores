class CreateChildProfiles < ActiveRecord::Migration[8.1]
  def change
    create_table :child_profiles do |t|
      t.references :family, null: false, foreign_key: true
      t.string :name, null: false

      t.timestamps
    end
  end
end
