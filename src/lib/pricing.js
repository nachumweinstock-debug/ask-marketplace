export function discountPercent(listing) {
  const percent = Number(listing?.first_time_discount_percent || 0);
  return percent === 15 || percent === 20 ? percent : 0;
}

export function discountedPrice(listing) {
  const base = Number(listing?.price_per_session || 0);
  const percent = discountPercent(listing);
  if (base <= 0 || !percent) return base;
  return Math.round(base * (100 - percent)) / 100;
}

export function money(value) {
  const amount = Number(value || 0);
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

export function firstTimeDiscountLabel(listing) {
  const percent = discountPercent(listing);
  if (percent && listing?.first_time_discount_scope === 'sitewide') return `${percent}% sale`;
  return percent ? `First time discount -${percent}%` : '';
}
