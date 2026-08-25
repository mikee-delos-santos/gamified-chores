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
    chore = Chores::TemplatePoster.call(template: template, created_by: current_user)
    render json: chore_json(chore), status: :created
  end

  private

  def template_params
    params.permit(:title, :description, :reward_coins)
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
end
