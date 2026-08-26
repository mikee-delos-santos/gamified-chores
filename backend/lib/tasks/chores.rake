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

  # Attach each kid's avatar photo from db/seed_assets/kids, matched by the kid's name
  # (case-insensitive), e.g. db/seed_assets/kids/julia.jpg. Idempotent and resilient: skips
  # kids with no matching file, and re-attaches only when the file actually changed (by name +
  # size). Safe to re-run against production after dropping new photos in.
  desc "Attach kid photos from db/seed_assets/kids (matched by kid name)"
  task seed_kid_photos: :environment do
    dir = Rails.root.join("db/seed_assets/kids")
    exts = %w[jpg jpeg png webp]

    ChildProfile.find_each do |child|
      file = exts.map { |e| dir.join("#{child.name.downcase}.#{e}") }.find { |p| File.exist?(p) }

      unless file
        puts "skip: no photo file for #{child.name} (looked for #{child.name.downcase}.{#{exts.join(',')}})"
        next
      end

      filename = File.basename(file)
      if child.photo.attached? &&
         child.photo.blob.filename.to_s == filename &&
         child.photo.blob.byte_size == File.size(file)
        puts "ok: #{child.name} already has #{filename}"
        next
      end

      child.photo.purge if child.photo.attached?
      File.open(file) do |io|
        child.photo.attach(io: io, filename: filename, content_type: Marcel::MimeType.for(file))
      end
      puts "set: #{child.name} -> #{filename}"
    end
  end
end
