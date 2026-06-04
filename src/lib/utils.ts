export function formatCurrency(value: number): string {
  return `₹${value.toFixed(2)}`;
}

export function formatCurrencyValue(value: number): string {
  return value.toFixed(2);
}
