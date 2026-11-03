function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyWithSymbol(value: number): string {
  return `${formatCurrency(value)} CUP`;
}

export { formatCurrency, formatCurrencyWithSymbol };
