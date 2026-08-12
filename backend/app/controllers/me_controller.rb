# The current admin — also serves as a protected-endpoint smoke test for auth.
class MeController < ApplicationController
  before_action :authenticate_admin!

  def show
    render json: {
      id: current_user.id,
      name: current_user.name,
      email: current_user.email,
      role: current_user.role
    }
  end
end
