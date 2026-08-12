# Admin login. Returns a JWT the mobile app sends as `Authorization: Bearer <token>`.
class AuthController < ApplicationController
  def login
    user = User.find_by(email: params[:email].to_s.strip.downcase)

    if user&.authenticate(params[:password])
      render json: {
        token: JsonWebToken.encode({ user_id: user.id }),
        user: user_json(user)
      }
    else
      render json: { error: "invalid email or password" }, status: :unauthorized
    end
  end

  private

  def user_json(user)
    { id: user.id, name: user.name, email: user.email, role: user.role }
  end
end
