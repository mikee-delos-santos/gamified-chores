class AddPinToFamilies < ActiveRecord::Migration[8.1]
  def change
    add_column :families, :pin_digest, :string
  end
end
