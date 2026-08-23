# Kid-facing Coin bank read model (unauthenticated — kids have no login). Returns the balance,
# its peso value at the family's current rate, the ledger history, and any pending cash-out so
# the kid app can show the "waiting for approval" state. Peso value lives only here, by design.
class CoinBankController < ApplicationController
  def show
    child = ChildProfile.find(params[:id])
    family = child.family
    balance = child.balance

    render json: {
      child_id: child.id,
      name: child.name,
      balance: balance.to_f,
      peso_per_coin: family.peso_per_coin.to_f,
      peso_value: family.peso_for(balance).to_f,
      pending_cash_out: pending_cash_out_json(child),
      history: history_json(child)
    }
  end

  private

  def pending_cash_out_json(child)
    req = child.cash_out_requests.where(status: :pending).order(created_at: :desc).first
    return nil unless req

    { id: req.id, coins: req.coins.to_f, peso_amount: req.peso_amount.to_f, created_at: req.created_at }
  end

  def history_json(child)
    child.coin_transactions.includes(:chore).order(created_at: :desc).limit(50).map do |tx|
      { id: tx.id, label: label_for(tx), amount: tx.amount.to_f, reason: tx.reason, created_at: tx.created_at }
    end
  end

  def label_for(tx)
    case tx.reason
    when "cash_out" then "Cashed out"
    when "adjustment" then "Adjustment"
    else tx.chore&.title || "Chore reward"
    end
  end
end
