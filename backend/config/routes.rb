Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # JSON health check for the API and the mobile app's connectivity probe.
  get "health" => "health#show"

  # Model Context Protocol endpoint for AI agents (JSON-RPC). Auth reuses the admin JWT.
  post "mcp" => "mcp#handle"

  # Admin auth
  post "auth/login" => "auth#login"
  get "me" => "me#show" # protected; returns the current admin

  # Chores (admin-only)
  resources :chores, only: [:index, :show, :create, :update, :destroy] do
    member do
      post :complete
      post :proof # kid-facing photo proof upload
      post :expire
      post :reject
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

  # Family settings — the coin -> peso rate (admin-only).
  get "family/settings" => "family#settings"
  patch "family/settings" => "family#update_settings"

  # Child profiles: index/show are kid-facing (unauthenticated); create/update/destroy are
  # admin-only (guarded in the controller).
  resources :child_profiles, only: [:index, :show, :create, :update, :destroy]

  # Coin bank (kid-facing read) + cash-out requests. A kid creates a request; an admin lists the
  # pending ones and approves (writing the ledger withdrawal) or denies them.
  get "child_profiles/:id/coin_bank" => "coin_bank#show"
  post "child_profiles/:id/cash_out_requests" => "cash_out_requests#create"
  resources :cash_out_requests, only: [:index] do
    member do
      post :approve
      post :deny
    end
  end

  # Web Push: subscribe is open (kid devices have no login); test is admin-only.
  post "push/subscribe" => "push#subscribe"
  post "push/test" => "push#test"

  # Super-admin maintenance (admin-only, destructive).
  post "admin/destroy_chores" => "admin#destroy_chores"
  post "admin/reset_coins" => "admin#reset_coins"
end
