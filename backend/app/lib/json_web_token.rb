# Encode/decode JWTs for admin API auth, signed with the app's secret_key_base.
class JsonWebToken
  ALGORITHM = "HS256".freeze

  def self.encode(payload, exp: 30.days.from_now)
    JWT.encode(payload.merge(exp: exp.to_i), secret, ALGORITHM)
  end

  # Returns the decoded payload (indifferent access) or nil if invalid/expired.
  def self.decode(token)
    body, = JWT.decode(token, secret, true, algorithm: ALGORITHM)
    body.with_indifferent_access
  rescue JWT::DecodeError
    nil
  end

  def self.secret
    Rails.application.secret_key_base
  end
end
