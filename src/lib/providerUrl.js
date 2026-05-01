// Generates clean profile URLs
// If the provider has a username slug: /nachum-weinstock
// Fallback with ID suffix: /sacha-feit-7
export function providerUrl(name, id, username) {
  if (username) return `/${username}`;
  if (!name || !id) return `/providers/${id}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `/${slug}-${id}`;
}

// Extracts numeric provider ID from /sacha-feit-7 style slugs.
// Returns NaN for pure-text slugs (username-based) — caller handles those separately.
export function parseProviderSlug(slug) {
  const match = slug.match(/(\d+)$/);
  return match ? parseInt(match[1]) : NaN;
}

// Returns true if the slug looks like a username (no trailing number)
export function isUsernameSlug(slug) {
  return !/\d+$/.test(slug);
}
