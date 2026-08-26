# Sends a Web Push notification to every enrolled device in a family (parents and kids alike).
#
# VAPID keys come from env (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT). When they are
# not configured (e.g. local dev without keys) this is a safe no-op. Sending is best-effort and
# never raises into the caller: a dead subscription (404/410) is pruned, other errors are logged.
class PushNotifier
  # `type` is an optional client hint carried in the payload (e.g. "app-update") so the service
  # worker can treat some pushes differently from a normal chore update.
  def self.notify_family(family, title:, body:, url: "/", type: nil)
    return unless configured?
    return if family.nil?

    deliver_all(family.push_subscriptions, title: title, body: body, url: url, type: type)
  end

  # Notify about a chore, honoring its optional assignee. An assigned chore only reaches the
  # parents (subscriptions with no kid) and the one assigned kid's devices; an unassigned chore
  # falls back to the whole family.
  def self.notify_chore(chore, title:, body:, url: "/")
    return unless configured?
    return if chore.nil? || chore.family.nil?

    subs = chore.family.push_subscriptions
    if chore.child_profile_id.present?
      subs = subs.where(child_profile_id: [nil, chore.child_profile_id])
    end
    deliver_all(subs, title: title, body: body, url: url)
  end

  def self.deliver_all(subscriptions, title:, body:, url:, type: nil)
    payload = { title: title, body: body, url: url }
    payload[:type] = type if type.present?
    json = payload.to_json
    subscriptions.find_each { |sub| deliver(sub, json) }
  end

  def self.configured?
    ENV["VAPID_PUBLIC_KEY"].present? && ENV["VAPID_PRIVATE_KEY"].present?
  end

  def self.deliver(sub, payload)
    WebPush.payload_send(
      message: payload,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      vapid: {
        subject: ENV.fetch("VAPID_SUBJECT", "mailto:admin@fayecoins.app"),
        public_key: ENV["VAPID_PUBLIC_KEY"],
        private_key: ENV["VAPID_PRIVATE_KEY"],
      },
      urgency: "high",
    )
  rescue WebPush::ExpiredSubscription, WebPush::InvalidSubscription
    # The browser dropped this subscription; stop trying to reach it.
    sub.destroy
  rescue => e
    Rails.logger.warn("[PushNotifier] send failed for subscription #{sub.id}: #{e.class} #{e.message}")
  end
end
