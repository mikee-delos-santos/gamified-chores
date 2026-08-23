// Coin amounts render with two decimals throughout the kid app ("12.00 coins"), matching the
// design copy. Kept in one place so every screen formats identically.

export function fmtCoins(n: number): string {
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

// Peso value (shown only in the Coin bank). Kept here for when PC-3 lands.
export function fmtPeso(coins: number, rate: number): string {
  return `₱${((Number.isFinite(coins) ? coins : 0) * rate).toFixed(2)}`;
}
