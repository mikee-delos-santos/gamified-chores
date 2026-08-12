# Simple JSON health check for the API + the mobile client's connectivity probe.
# (Rails' built-in HTML check stays available at /up for load balancers.)
class HealthController < ApplicationController
  def show
    render json: { status: "ok", time: Time.now.utc.iso8601 }
  end
end
