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
  resources :chores, only: [:index, :create] do
    member { post :complete }
  end

  # Child profiles + balance (kid-facing, unauthenticated)
  resources :child_profiles, only: [:index, :show]
end
