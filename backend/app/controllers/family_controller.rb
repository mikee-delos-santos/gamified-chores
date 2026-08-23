# Grown-up PIN for device-binding: kids' devices stay locked to one kid, and switching needs a
# grown-up PIN. Admins set it; kid devices check status and verify (both unauthenticated, since
# kids have no login) against the single-family MVP.
class FamilyController < ApplicationController
  before_action :authenticate_admin!, only: [:set_pin]

  # POST /family/pin { pin }  (admin) — set or change the grown-up PIN.
  def set_pin
    pin = params[:pin].to_s
    if pin.length < 4
      return render json: { error: "PIN must be at least 4 digits" }, status: :unprocessable_entity
    end
    current_family.update!(pin: pin)
    render json: { pin_set: true }
  end

  # GET /family/pin_status  (kid-facing) — does a PIN exist? Drives whether switching is guarded.
  def pin_status
    render json: { pin_set: Family.first&.pin_set? || false }
  end

  # POST /family/verify_pin { pin }  (kid-facing) — check a PIN before allowing a device to switch.
  def verify_pin
    family = Family.first
    ok = family&.pin_set? ? family.authenticate_pin(params[:pin].to_s) : false
    render json: { ok: !!ok }
  end
end
