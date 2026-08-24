# Admin API for reusable chore templates: list, create, edit, delete, and
# "post" (spawn a fresh open Chore from the template). Admin-only.
class ChoreTemplatesController < ApplicationController
  before_action :authenticate_admin!

  def index
    templates = current_family.chore_templates.order(created_at: :desc)
    render json: templates.map { |t| chore_template_json(t) }
  end

  def create
    template = current_family.chore_templates.new(template_params)
    template.created_by = current_user
    template.save!
    template.how_to_photos.attach(params[:how_to_photos]) if params[:how_to_photos].present?
    render json: chore_template_json(template), status: :created
  end

  def update
    template = current_family.chore_templates.find(params[:id])
    template.update!(template_params)
    template.how_to_photos.attach(params[:how_to_photos]) if params[:how_to_photos].present?
    render json: chore_template_json(template)
  end

  def destroy
    current_family.chore_templates.find(params[:id]).destroy
    render json: { ok: true }
  end

  # POST /chore_templates/:id/post_chore
  # Spawn a fresh open chore from the template, copying its how-to photos, and
  # fire the same "new chore" push that ChoresController#create sends.
  def post_chore
    template = current_family.chore_templates.find(params[:id])
    chore = current_family.chores.new(
      title: template.title,
      description: template.description,
      reward_coins: template.reward_coins,
      created_by: current_user,
    )
    chore.save!
    copy_how_to_photos(template, chore)
    PushNotifier.notify_family(current_family, title: "New chore", body: chore.title, url: "/")
    render json: chore_json(chore), status: :created
  end

  private

  def template_params
    params.permit(:title, :description, :reward_coins)
  end

  # Re-attach the template's how-to blobs to the new chore (no re-upload).
  def copy_how_to_photos(template, chore)
    return unless template.how_to_photos.attached?

    template.how_to_photos.each do |photo|
      chore.how_to_photos.attach(photo.blob)
    end
  end

  def chore_template_json(template)
    {
      id: template.id,
      title: template.title,
      description: template.description,
      reward_coins: template.reward_coins.to_f,
      how_to_photo_urls: template.how_to_photos.attached? ? template.how_to_photos.map { |p| url_for(p) } : []
    }
  end

  # The posted chore is serialized exactly like ChoresController does.
  def chore_json(chore)
    proof_urls = chore.proof_photos.attached? ? chore.proof_photos.map { |p| url_for(p) } : []
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
      how_to_photo_urls: chore.how_to_photos.attached? ? chore.how_to_photos.map { |p| url_for(p) } : [],
      proof_photo_urls: proof_urls,
      proof_photo_url: proof_urls.first,
      proof_by: chore.proof_by_child ? { id: chore.proof_by_child.id, name: chore.proof_by_child.name } : nil
    }
  end
end
