# The single source of truth for a chore's JSON shape, shared by the REST controllers and the
# MCP tools so both surfaces always return identical fields. Photo URLs need a url builder, which
# differs by caller (each controller passes its own `url_for`), so it's injected.
class ChoreSerializer
  def initialize(url_for:)
    @url_for = url_for
  end

  def as_json(chore)
    proof_urls = photo_urls(chore.proof_photos)
    {
      id: chore.id,
      title: chore.title,
      description: chore.description,
      reward_coins: chore.reward_coins.to_f,
      status: chore.status,
      grade: chore.grade,
      created_by: chore.created_by_id,
      completed_by: chore.completed_by_id,
      completed_at: chore.completed_at,
      how_to_photo_urls: photo_urls(chore.how_to_photos),
      proof_photo_urls: proof_urls,
      proof_photo_url: proof_urls.first,
      proof_by: child_ref(chore.proof_by_child),
      assigned_to: child_ref(chore.assigned_to)
    }
  end

  private

  def photo_urls(attachments)
    attachments.attached? ? attachments.map { |p| @url_for.call(p) } : []
  end

  def child_ref(child)
    return nil unless child

    { id: child.id, name: child.name, color: child.color, photo_url: child_photo_url(child) }
  end

  def child_photo_url(child)
    child.photo.attached? ? @url_for.call(child.photo) : nil
  end
end
