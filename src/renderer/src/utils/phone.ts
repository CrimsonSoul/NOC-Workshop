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

  // Remove all non-numeric characters, except the leading +
  // If we have a +, keep it.
  const hasPlus = processed.startsWith('+');
  const digits = processed.replace(/[^0-9]/g, '');

  if (!digits) return '';

  return hasPlus ? `+${digits}` : digits;
};

const formatSingleNumber = (clean: string): string => {
    // 10 digits: XXXXXXXXXX (US Standard simplified)
    if (/^\d{10}$/.test(clean)) {
        return clean;
    }

    // 11 digits starting with 1: XXXXXXXXXX (Strip leading 1)
    if (/^1\d{10}$/.test(clean)) {
        return clean.slice(1);
    }

    // +1 followed by 10 digits: XXXXXXXXXX (Strip +1)
    if (/^\+1\d{10}$/.test(clean)) {
        return clean.slice(2);
    }

    // Generic International: +XXXXXXXXX (No spaces)
    // Matches + followed by any digits.
    if (clean.startsWith('+')) {
        return clean;
    }

    return clean;
};

export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  const clean = sanitizePhoneNumber(phone);

  // Check for "Run-on" numbers (concatenated 10-digit numbers)
  // e.g. 55555555551111111111 (20 digits) -> split
  // Logic: multiple of 10 digits, > 10
  if (/^\d+$/.test(clean) && clean.length > 10 && clean.length % 10 === 0) {
      const parts: string[] = [];
      for (let i = 0; i < clean.length; i += 10) {
          parts.push(clean.slice(i, i + 10));
      }
      return parts.map(formatSingleNumber).join(', ');
  }

  return formatSingleNumber(clean);
};
