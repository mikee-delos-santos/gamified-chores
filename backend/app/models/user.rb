# Admin account (owner + spouse). Kids do NOT have User records — they are
# ChildProfiles with no login.
class User < ApplicationRecord
  has_secure_password

  belongs_to :family
  has_many :created_chores,
           class_name: "Chore",
           foreign_key: :created_by_id,
           inverse_of: :created_by,
           dependent: :nullify
  has_many :created_chore_templates,
           class_name: "ChoreTemplate",
           foreign_key: :created_by_id,
           inverse_of: :created_by,
           dependent: :nullify

  enum :role, { admin: 0 }, default: :admin

  validates :email, presence: true, uniqueness: { case_sensitive: false }
  validates :name, presence: true

  normalizes :email, with: ->(email) { email.strip.downcase }
end
