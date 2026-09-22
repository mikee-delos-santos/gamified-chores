class CreateScheduledExchangeRates < ActiveRecord::Migration[8.1]
  def change
    create_table :scheduled_exchange_rates do |t|
      t.references :family, null: false, foreign_key: true
      t.date :on_date, null: false
      t.decimal :peso_per_coin, precision: 10, scale: 2, null: false

      t.timestamps
    end

    add_index :scheduled_exchange_rates, [:family_id, :on_date], unique: true
  end
end
