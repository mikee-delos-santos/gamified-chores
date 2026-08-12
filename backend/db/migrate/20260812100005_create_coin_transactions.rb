class CreateCoinTransactions < ActiveRecord::Migration[8.1]
  def change
    create_table :coin_transactions do |t|
      t.references :child_profile, null: false, foreign_key: true
      t.decimal :amount, precision: 10, scale: 2, null: false
      t.integer :reason, null: false, default: 0
      # The chore that awarded these coins (null for later non-chore entries
      # like store/withdraw/adjustment).
      t.references :chore, null: true, foreign_key: true

      t.timestamps
    end
  end
end
