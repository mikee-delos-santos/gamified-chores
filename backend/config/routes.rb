Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # JSON health check for the API and the mobile app's connectivity probe.
  get "health" => "health#show"

  # Admin auth
  post "auth/login" => "auth#login"
  get "me" => "me#show" # protected; returns the current admin

  # Chores (admin-only)
  resources :chores, only: [:index, :create, :update, :destroy] do
    member do
      post :complete
      post :proof # kid-facing photo proof upload
    end
  end

  # Recurring chore templates (admin-only). post_chore spawns a fresh open chore.
  resources :chore_templates, only: [:index, :create, :update, :destroy] do
    member { post :post_chore }
  end

  # Kid-facing list of open chores (unauthenticated).
  get "open_chores" => "chores#open"

  # Grown-up PIN for device-binding: set is admin-only; status/verify are kid-facing.
  post "family/pin" => "family#set_pin"
  get "family/pin_status" => "family#pin_status"
  post "family/verify_pin" => "family#verify_pin"

  # Child profiles: index/show are kid-facing (unauthenticated); create/update/destroy are
  # admin-only (guarded in the controller).
  resources :child_profiles, only: [:index, :show, :create, :update, :destroy]

  # Web Push: subscribe is open (kid devices have no login); test is admin-only.
  post "push/subscribe" => "push#subscribe"
  post "push/test" => "push#test"

  # Super-admin maintenance (admin-only, destructive).
  post "admin/destroy_chores" => "admin#destroy_chores"
  post "admin/reset_coins" => "admin#reset_coins"
end
