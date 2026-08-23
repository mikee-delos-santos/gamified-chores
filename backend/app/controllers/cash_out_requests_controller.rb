# Cash-out requests. A kid creates one (unauthenticated); a grown-up lists the pending ones and
# approves (writing the ledger withdrawal) or denies them (both admin-only).
class CashOutRequestsController < ApplicationController
  before_action :authenticate_admin!, only: [:index, :approve, :deny]

  # POST /child_profiles/:id/cash_out_requests { coins }  (kid-facing)
  def create
    child = ChildProfile.find(params[:id])
    coins = params[:coins].to_d

    if coins <= 0
      return render json: { error: "Enter how many coins to cash out." }, status: :unprocessable_entity
    end
    if coins > child.balance
      return render json: { error: "Not enough coins to cash out yet." }, status: :unprocessable_entity
    end

    req = child.cash_out_requests.create!(coins: coins, peso_amount: child.family.peso_for(coins))
    PushNotifier.notify_family(
      child.family,
      title: "Cash-out request",
      body: "#{child.name} asked to cash out #{coins.to_f} coins (#{peso(req.peso_amount)})",
      url: "/",
    )
    render json: request_json(req), status: :created
  end

  # GET /cash_out_requests?status=pending  (admin) — defaults to pending.
  def index
    status = CashOutRequest.statuses.key?(params[:status]) ? params[:status] : "pending"
    requests = current_family.cash_out_requests.where(status: status).order(created_at: :desc)
    render json: requests.map { |req| request_json(req) }
  end

  # POST /cash_out_requests/:id/approve  (admin) — writes the ledger withdrawal, idempotently.
  def approve
    req = current_family.cash_out_requests.find(params[:id])
    return already_decided(req) unless req.pending?

    child = req.child_profile
    if req.coins > child.balance
      return render json: { error: "#{child.name} no longer has enough coins." }, status: :unprocessable_entity
    end

    ActiveRecord::Base.transaction do
      CoinTransaction.create!(child_profile: child, amount: -req.coins, reason: :cash_out)
      req.update!(status: :approved, decided_by: current_user, decided_at: Time.current)
    end

    PushNotifier.notify_family(
      child.family,
      title: "Cash-out approved",
      body: "#{child.name} cashed out #{req.coins.to_f} coins (#{peso(req.peso_amount)})",
      url: "/",
    )
    render json: request_json(req)
  end

  # POST /cash_out_requests/:id/deny  (admin)
  def deny
    req = current_family.cash_out_requests.find(params[:id])
    return already_decided(req) unless req.pending?

    req.update!(status: :denied, decided_by: current_user, decided_at: Time.current)
    PushNotifier.notify_family(
      req.child_profile.family,
      title: "Cash-out denied",
      body: "#{req.child_profile.name}'s cash-out was not approved.",
      url: "/",
    )
    render json: request_json(req)
  end

  private

  def already_decided(req)
    render json: { error: "This request was already #{req.status}." }, status: :unprocessable_entity
  end

  def peso(amount)
    "₱#{format('%.2f', amount)}"
  end

  def request_json(req)
    {
      id: req.id,
      child_profile_id: req.child_profile_id,
      child_name: req.child_profile.name,
      coins: req.coins.to_f,
      peso_amount: req.peso_amount.to_f,
      status: req.status,
      created_at: req.created_at,
      decided_at: req.decided_at
    }
  end
end
