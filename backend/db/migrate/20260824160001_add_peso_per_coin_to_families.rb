class AddPesoPerCoinToFamilies < ActiveRecord::Migration[8.1]
  def change
    # The admin-set coin -> PHP peso rate. "1 coin = ₱peso_per_coin", shown only in the Coin bank.
    add_column :families, :peso_per_coin, :decimal, precision: 10, scale: 2, null: false, default: "2.5"
  end
end
