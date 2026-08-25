class AddChildProfileToPushSubscriptions < ActiveRecord::Migration[8.1]
  def change
    # Whose device this endpoint belongs to: null = a parent/admin device, set = that kid's device.
    # Lets us target a chore's push at parents + the one assigned kid instead of the whole family.
    add_reference :push_subscriptions, :child_profile, null: true, foreign_key: true
  end
end
