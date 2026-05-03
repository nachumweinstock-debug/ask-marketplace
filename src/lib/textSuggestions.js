const REPLACEMENTS = [
  [/\bbuisness\b/gi, 'business'],
  [/\bbusines\b/gi, 'business'],
  [/\bsequel\b/gi, 'SQL'],
  [/\bexcell\b/gi, 'Excel'],
  [/\bexcelent\b/gi, 'excellent'],
  [/\bleasons\b/gi, 'lessons'],
  [/\blesssons\b/gi, 'lessons'],
  [/\btutorering\b/gi, 'instruction'],
  [/\btutering\b/gi, 'instruction'],
  [/\bcalcualus\b/gi, 'calculus'],
  [/\bchemisty\b/gi, 'chemistry'],
  [/\bphisics\b/gi, 'physics'],
  [/\bstatstics\b/gi, 'statistics'],
  [/\baccountng\b/gi, 'accounting'],
  [/\bfinace\b/gi, 'finance'],
  [/\beconomcis\b/gi, 'economics'],
  [/\bavailablity\b/gi, 'availability'],
  [/\bbegginer\b/gi, 'beginner'],
  [/\bbegginers\b/gi, 'beginners'],
  [/\bexperiance\b/gi, 'experience'],
  [/\bproffesional\b/gi, 'professional'],
  [/\brecieve\b/gi, 'receive'],
];

export function suggestText(input = '') {
  let next = String(input);
  for (const [pattern, replacement] of REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }
  next = next
    .replace(/\bi\b/g, 'I')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?])/g, '$1');
  return next;
}

export function hasSuggestion(input = '') {
  return suggestText(input) !== String(input);
}
