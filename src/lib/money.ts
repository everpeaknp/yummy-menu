const formatter = new Intl.NumberFormat('en-NP', {
  style: 'currency', currency: 'NPR', minimumFractionDigits: 0, maximumFractionDigits: 2,
});

export const money = (amount: number) => formatter.format(amount);
