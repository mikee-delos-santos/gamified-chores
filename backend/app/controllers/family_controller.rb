# Grown-up PIN for device-binding: kids' devices stay locked to one kid, and switching needs a
# grown-up PIN. Admins set it; kid devices check status and verify (both unauthenticated, since
# kids have no login) against the single-family MVP.
class FamilyController < ApplicationController
  before_action :authenticate_admin!, only: [:set_pin, :settings, :update_settings]

  # GET /family/settings  (admin) — read family-level settings (the peso rate).
  def settings
    render json: settings_json(current_family)
  end

  # PATCH /family/settings { peso_per_coin }  (admin) — set the coin -> peso rate.
  # A real change pushes the new rate to every enrolled device in the family.
  def update_settings
    family = current_family
    old_rate = family.peso_per_coin
    family.update!(peso_per_coin: params.require(:peso_per_coin))

    if family.peso_per_coin != old_rate
      PushNotifier.notify_family(
        family,
        title: "Coin rate updated",
        body: "1 coin is now ₱#{format("%.2f", family.peso_per_coin)}",
        url: "/",
      )
    end

    render json: settings_json(family)
  end

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

  private

  def settings_json(family)
    { peso_per_coin: family.peso_per_coin.to_f }
  end
end
