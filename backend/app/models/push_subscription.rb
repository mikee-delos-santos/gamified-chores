# A browser/PWA push endpoint registered for a family. Any enrolled device (parent or kid)
# gets family-wide notifications; kid devices are unauthenticated, so subscriptions are keyed
# by their unique push endpoint rather than by a user.
class PushSubscription < ApplicationRecord
  belongs_to :family
  # nil = a parent/admin device; set = the kid this device is bound to. Drives targeted push.
  belongs_to :child_profile, optional: true

  validates :endpoint, presence: true, uniqueness: true
  validates :p256dh, :auth, presence: true
end
