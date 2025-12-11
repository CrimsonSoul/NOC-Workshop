export const sanitizePhoneNumber = (phone: string): string => {
  if (!phone) return '';

  let processed = phone.trim();

  // Handle '00' prefix as '+' (common international standard)
  if (processed.startsWith('00')) {
      processed = '+' + processed.slice(2);
  }

  const plusIndex = processed.indexOf('+');

  // If there is a '+', assume the number starts there
  if (plusIndex !== -1) {
      processed = processed.slice(plusIndex);
  }

  // Remove all non-numeric characters
  const digits = processed.replace(/[^0-9]/g, '');

  if (!digits) return '';

  return plusIndex !== -1 ? `+${digits}` : digits;
};

export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  const clean = sanitizePhoneNumber(phone);

  // 10 digits: (XXX) XXX-XXXX
  if (/^\d{10}$/.test(clean)) {
    return `(${clean.slice(0,3)}) ${clean.slice(3,6)}-${clean.slice(6)}`;
  }

  // 11 digits starting with 1: +1 (XXX) XXX-XXXX
  if (/^1\d{10}$/.test(clean)) {
    return `+1 (${clean.slice(1,4)}) ${clean.slice(4,7)}-${clean.slice(7)}`;
  }

  // +1 followed by 10 digits: +1 (XXX) XXX-XXXX
  if (/^\+1\d{10}$/.test(clean)) {
     const nums = clean.slice(2);
     return `+1 (${nums.slice(0,3)}) ${nums.slice(3,6)}-${nums.slice(6)}`;
  }

  // Generic +1 fallback (e.g. extensions or partials)
  if (clean.startsWith('+1') && clean.length > 2) {
     const nums = clean.slice(2);
     if (nums.length <= 3) return `+1 (${nums})`;
     if (nums.length <= 6) return `+1 (${nums.slice(0,3)}) ${nums.slice(3)}`;
     // +1 (555) 123-4567...
     return `+1 (${nums.slice(0,3)}) ${nums.slice(3,6)}-${nums.slice(6)}`;
  }

  // Generic International: +XX ...
  // Matches +XX followed by any digits.
  // We use a heuristic of 2-digit country code and 4-digit chunks.
  const intlMatch = clean.match(/^\+(\d{2})(\d+)/);
  if (intlMatch) {
      const cc = intlMatch[1];
      const rest = intlMatch[2];
      // Format rest in chunks of 4
      const chunks = rest.match(/.{1,4}/g)?.join(' ') || rest;
      return `+${cc} ${chunks}`;
  }

  // Fallback: return the cleaned number
  return clean;
};
