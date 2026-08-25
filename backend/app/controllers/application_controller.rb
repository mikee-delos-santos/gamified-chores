class ApplicationController < ActionController::API
  include Authenticatable

  rescue_from ActiveRecord::RecordNotFound do |e|
    render json: { error: e.message }, status: :not_found
  end

  rescue_from ActiveRecord::RecordInvalid do |e|
    render json: { error: e.record.errors.full_messages }, status: :unprocessable_entity
  end

  private

  # The family of the authenticated admin. Scopes all admin data access.
  def current_family
    current_user&.family
  end

  # The one chore JSON shape, shared by every controller (and mirrored by the MCP tools).
  def chore_json(chore)
    ChoreSerializer.new(url_for: method(:url_for)).as_json(chore)
  end
end
