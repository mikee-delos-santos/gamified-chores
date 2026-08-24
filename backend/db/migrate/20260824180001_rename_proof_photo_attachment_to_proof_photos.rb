# Proof photos moved from has_one_attached :proof_photo to has_many_attached :proof_photos.
# Active Storage keys attachments by name, so existing rows must be renamed or the old proofs
# would be orphaned (prod has real data). Reversible: flip the name back on rollback.
class RenameProofPhotoAttachmentToProofPhotos < ActiveRecord::Migration[8.1]
  def up
    execute(<<~SQL)
      UPDATE active_storage_attachments
      SET name = 'proof_photos'
      WHERE name = 'proof_photo' AND record_type = 'Chore'
    SQL
  end

  def down
    execute(<<~SQL)
      UPDATE active_storage_attachments
      SET name = 'proof_photo'
      WHERE name = 'proof_photos' AND record_type = 'Chore'
    SQL
  end
end
