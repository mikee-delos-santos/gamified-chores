# Be sure to restart your server when you modify this file.
#
# Cross-Origin Resource Sharing (CORS) for the PWA and mobile clients. The web app is served
# from a different origin than this API (a separate Railway service), so browsers require CORS.
#
# Allowed origins come from the CORS_ORIGINS env var (comma-separated). In development we default
# to the Expo web dev server. Read more: https://github.com/cyu/rack-cors

allowed_origins =
  ENV.fetch("CORS_ORIGINS", "http://localhost:8081").split(",").map(&:strip).reject(&:empty?)

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*allowed_origins)

    resource "*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head]
  end
end
