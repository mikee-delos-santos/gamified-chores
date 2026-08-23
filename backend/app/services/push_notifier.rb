# Sends a Web Push notification to every enrolled device in a family (parents and kids alike).
#
# VAPID keys come from env (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT). When they are
# not configured (e.g. local dev without keys) this is a safe no-op. Sending is best-effort and
# never raises into the caller: a dead subscription (404/410) is pruned, other errors are logged.
class PushNotifier
  def self.notify_family(family, title:, body:, url: "/")
    return unless configured?
    return if family.nil?

    payload = { title: title, body: body, url: url }.to_json

    family.push_subscriptions.find_each do |sub|
      deliver(sub, payload)
    end
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
