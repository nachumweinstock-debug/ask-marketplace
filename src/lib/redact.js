export function redactContactText(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/\s*You can reach me at\s+\+?\d[\d\s().-]{7,}\d\s+on\s+(?:iMessage|WhatsApp)\.?/gi, '')
    .replace(/(?:\+?\d|\(\d{3}\))[\d\s().-]{6,}\d/g, match => {
      const digits = match.replace(/\D/g, '');
      return digits.length >= 10 ? '[phone hidden]' : match;
    });
}
