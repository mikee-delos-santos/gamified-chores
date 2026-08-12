# Bearer-token auth for admin-only endpoints. Controllers opt in with
#   before_action :authenticate_admin!
module Authenticatable
  extend ActiveSupport::Concern

  included do
    attr_reader :current_user
  end

  def authenticate_admin!
    token = request.headers["Authorization"]&.split(" ")&.last
    payload = token && JsonWebToken.decode(token)
    @current_user = payload && User.find_by(id: payload[:user_id])

    return if @current_user&.admin?

    render json: { error: "unauthorized" }, status: :unauthorized
  end
end
