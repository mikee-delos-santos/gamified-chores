# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_08_24_150001) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.bigint "record_id", null: false
    t.string "record_type", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.string "content_type"
    t.datetime "created_at", null: false
    t.string "filename", null: false
    t.string "key", null: false
    t.text "metadata"
    t.string "service_name", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "child_profiles", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "family_id", null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.index ["family_id"], name: "index_child_profiles_on_family_id"
  end

  create_table "chore_templates", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "created_by_id", null: false
    t.text "description"
    t.bigint "family_id", null: false
    t.decimal "reward_coins", precision: 10, scale: 2, default: "0.0", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["created_by_id"], name: "index_chore_templates_on_created_by_id"
    t.index ["family_id"], name: "index_chore_templates_on_family_id"
  end

  create_table "chores", force: :cascade do |t|
    t.datetime "completed_at"
    t.bigint "completed_by_id"
    t.datetime "created_at", null: false
    t.bigint "created_by_id", null: false
    t.text "description"
    t.bigint "family_id", null: false
    t.integer "grade"
    t.decimal "reward_coins", precision: 10, scale: 2, default: "0.0", null: false
    t.integer "status", default: 0, null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["completed_by_id"], name: "index_chores_on_completed_by_id"
    t.index ["created_by_id"], name: "index_chores_on_created_by_id"
    t.index ["family_id"], name: "index_chores_on_family_id"
  end

  create_table "coin_transactions", force: :cascade do |t|
    t.decimal "amount", precision: 10, scale: 2, null: false
    t.bigint "child_profile_id", null: false
    t.bigint "chore_id"
    t.datetime "created_at", null: false
    t.integer "reason", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["child_profile_id"], name: "index_coin_transactions_on_child_profile_id"
    t.index ["chore_id"], name: "index_coin_transactions_on_chore_id"
  end

  create_table "families", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.string "pin_digest"
    t.datetime "updated_at", null: false
  end

  create_table "push_subscriptions", force: :cascade do |t|
    t.string "auth", null: false
    t.datetime "created_at", null: false
    t.string "endpoint", null: false
    t.bigint "family_id", null: false
    t.string "p256dh", null: false
    t.datetime "updated_at", null: false
    t.index ["endpoint"], name: "index_push_subscriptions_on_endpoint", unique: true
    t.index ["family_id"], name: "index_push_subscriptions_on_family_id"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.bigint "family_id", null: false
    t.string "name", null: false
    t.string "password_digest", null: false
    t.integer "role", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index "lower((email)::text)", name: "index_users_on_lower_email", unique: true
    t.index ["family_id"], name: "index_users_on_family_id"
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "child_profiles", "families"
  add_foreign_key "chore_templates", "families"
  add_foreign_key "chore_templates", "users", column: "created_by_id"
  add_foreign_key "chores", "child_profiles", column: "completed_by_id"
  add_foreign_key "chores", "families"
  add_foreign_key "chores", "users", column: "created_by_id"
  add_foreign_key "coin_transactions", "child_profiles"
  add_foreign_key "coin_transactions", "chores"
  add_foreign_key "push_subscriptions", "families"
  add_foreign_key "users", "families"
end
