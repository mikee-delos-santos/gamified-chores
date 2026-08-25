# Web Push enrollment + a manual test trigger.
#
# subscribe is unauthenticated so kid devices (which have no login) can enroll; it keys the
# subscription to the family. This is a single-family MVP, so subscriptions attach to the one
# family. test is admin-only and fires a family-wide notification for verification.
class PushController < ApplicationController
  before_action :authenticate_admin!, only: [:test]

  # POST /push/subscribe  { subscription: { endpoint, keys: { p256dh, auth } } }
  def subscribe
    family = Family.first
    return render json: { error: "no family yet" }, status: :unprocessable_entity if family.nil?

    sub = params.require(:subscription)
    endpoint = sub[:endpoint]
    keys = sub[:keys] || {}
    p256dh = keys[:p256dh]
    auth = keys[:auth]

    if endpoint.blank? || p256dh.blank? || auth.blank?
      return render json: { error: "invalid subscription" }, status: :unprocessable_entity
    end

    record = PushSubscription.find_or_initialize_by(endpoint: endpoint)
    record.family = family
    record.p256dh = p256dh
    record.auth = auth
    # Kid devices send their bound kid id so we can target pushes at that one kid; admin/parent
    # devices omit it and stay untagged (nil). A blank or unknown id leaves the device untagged.
    record.child_profile = family.child_profiles.find_by(id: params[:child_profile_id]) if params[:child_profile_id].present?
    record.save!

    render json: { ok: true }, status: :created
  end

  # POST /push/test  (admin) — send a test notification to the whole family.
  def test
    PushNotifier.notify_family(
      current_family,
      title: "Faye Coins",
      body: "Test notification — push is working!",
      url: "/",
    )
    render json: { ok: true, sent_to: current_family.push_subscriptions.count }
  end
end
