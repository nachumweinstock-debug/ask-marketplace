// Generates clean profile URLs: /sacha-feit-7
export function providerUrl(name, id) {
  if (!name || !id) return `/providers/${id}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `/${slug}-${id}`;
}

// Extracts numeric provider ID from either:
//   /sacha-feit-7  → 7
//   /providers/7   → (handled by :id param)
export function parseProviderSlug(slug) {
  const match = slug.match(/(\d+)$/);
  return match ? parseInt(match[1]) : NaN;
}
