# A browser/PWA push endpoint registered for a family. Any enrolled device (parent or kid)
# gets family-wide notifications; kid devices are unauthenticated, so subscriptions are keyed
# by their unique push endpoint rather than by a user.
class PushSubscription < ApplicationRecord
  belongs_to :family

  validates :endpoint, presence: true, uniqueness: true
  validates :p256dh, :auth, presence: true
end
