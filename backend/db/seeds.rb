# Idempotent seed data for local development: one family, two admins, two kids.
# Passwords here are for local dev only.

family = Family.find_or_create_by!(name: "Delos Santos")

[
  { name: "Mark", email: "mark@example.com" },
  { name: "Wife", email: "wife@example.com" },
].each do |attrs|
  User.find_or_create_by!(email: attrs[:email]) do |user|
    user.family = family
    user.name = attrs[:name]
    user.role = :admin
    user.password = "password"
  end
end

["Faye", "Sibling"].each do |kid_name|
  ChildProfile.find_or_create_by!(family: family, name: kid_name)
end

admin = User.order(:id).first
puts "Seeded: #{Family.count} family, #{User.count} admin(s), #{ChildProfile.count} kid(s)"
puts "Admin login: #{admin.email} / password" if admin
