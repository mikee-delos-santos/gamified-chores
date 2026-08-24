class AddColorToChildProfiles < ActiveRecord::Migration[8.1]
  def change
    add_column :child_profiles, :color, :string
  end
end
