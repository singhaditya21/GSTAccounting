export function formatCurrency(
  amount: number,
  currencyCode: string = "INR",
  locale: string = "en-IN"
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    console.warn(`Fallback currency formatting triggered for ${currencyCode}`);
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

// Convert a foreign amount back to Base Currency (INR) for IRS/GST
export function calculateBaseCurrencyEquiv(foreignAmount: number, exchangeRate: number): number {
  return foreignAmount * exchangeRate;
}
