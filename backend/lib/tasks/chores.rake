# Maintenance tasks for the chores app.
namespace :chores do
  # Give the kids their card colors. Idempotent and resilient: matches by name
  # (case-insensitive), skips kids that don't exist, and only writes when the
  # stored color actually differs. Safe to re-run against production.
  desc "Seed kid card colors (Julia -> pink, Cyrus -> black)"
  task seed_kid_colors: :environment do
    colors = { "Julia" => "#EC4899", "Cyrus" => "#111111" }

    colors.each do |name, color|
      child = ChildProfile.where("LOWER(name) = ?", name.downcase).first

      unless child
        puts "skip: no kid named #{name}"
        next
      end

      if child.color == color
        puts "ok: #{child.name} already #{color}"
      else
        child.update!(color: color)
        puts "set: #{child.name} -> #{color}"
      end
    end
  end
end
