class CreateCashOutRequests < ActiveRecord::Migration[8.1]
  def change
    create_table :cash_out_requests do |t|
      t.references :child_profile, null: false, foreign_key: true
      # The admin who approved/denied it (null while pending).
      t.references :decided_by, foreign_key: { to_table: :users }
      t.decimal :coins, precision: 10, scale: 2, null: false
      # Peso value snapshotted at the rate in effect when the kid asked, so a later rate change
      # does not silently move the amount a grown-up already saw.
      t.decimal :peso_amount, precision: 10, scale: 2, null: false
      t.integer :status, null: false, default: 0
      t.datetime :decided_at

      t.timestamps
    end
  end
end
