
export const cleanAndFormatPhoneNumber = (input: string): string => {
  if (!input) return '';

  // 1. Split messy strings.
  // We want to split on text labels like "Office:", "Ext:", "Fax:", or just generic separators if they look like breaks between numbers.
  // A simple strategy:
  // - Remove common text labels (replace with space).
  // - Split by commas, semicolons, or "words" that act as separators.
  // - But "Ext: 123" might be one number "555-1234 ext 123" or two "555-1234, 123".
  // The user example "Office:79984456 Ext:877-273-9002" implies distinct numbers.
  // Let's try to extract sequences of "phone-like" characters.

  // Normalize: Replace known separators with a unique token '|'
  let normalized = input.replace(/(?:Office|Ext|Home|Work|Cell|Fax|Tel|Phone|[:;])/gi, ' | ');

  // Split by '|' or ','
  const rawParts = normalized.split(/[|,]/).map(s => s.trim()).filter(s => s);

  const cleanedParts: string[] = [];

  for (const part of rawParts) {
      // Further split if we see distinct number blocks separated by spaces,
      // UNLESS the spaces are part of formatting (e.g. "+91 999 999").
      // Heuristic: If we format it and it looks valid, keep it.

      // Let's use a simpler "extract all numbers" approach if the part is complex?
      // No, "+91 99049 18167" is ONE number.
      // "79984456 877-273-9002" might be TWO.

      // Given the user wants to split "Office:... Ext:...", the labels are key.
      // We already split by labels.

      // Now process each candidate `part`.
      // 1. Sanitize
      const sanitized = sanitize(part);
      if (!sanitized || sanitized.length < 3) continue; // Ignore tiny fragments like "1" or "0" if they appear as noise

      // 2. Format
      const formatted = format(sanitized);
      cleanedParts.push(formatted);
  }

  // Deduplicate
  return Array.from(new Set(cleanedParts)).join(', ');
};

const sanitize = (str: string): string => {
    // Keep digits and leading +
    // Handle "00" prefix -> "+"
    let s = str.trim();
    if (s.startsWith('00')) s = '+' + s.slice(2);

    // Check for +
    const hasPlus = s.includes('+'); // Usually at start, but if "123+456" ?? Assume start.
    // Actually, simply remove all non-digits.
    // If original string had a '+' anywhere, treat as international?
    // Better: If it starts with +, keep it.

    // Logic from memory/existing utils:
    // If we have a '+', find it.
    const plusIdx = s.indexOf('+');
    if (plusIdx !== -1) {
        s = s.slice(plusIdx); // Start from plus
    }

    const digits = s.replace(/[^0-9]/g, '');
    // If original started with + (after trimming junk), prepend +
    // logic: " +1 (555) " -> starts with +
    if (s.startsWith('+')) return '+' + digits;
    return digits;
};

const format = (clean: string): string => {
    // US: 10 digits
    if (/^\d{10}$/.test(clean)) {
        return `(${clean.slice(0,3)}) ${clean.slice(3,6)}-${clean.slice(6)}`;
    }

    // US: 11 digits starting with 1
    if (/^1\d{10}$/.test(clean)) {
        const ten = clean.slice(1);
        return `(${ten.slice(0,3)}) ${ten.slice(3,6)}-${ten.slice(6)}`;
    }

    // US: +1 followed by 10 digits
    if (/^\+1\d{10}$/.test(clean)) {
        const ten = clean.slice(2);
        return `(${ten.slice(0,3)}) ${ten.slice(3,6)}-${ten.slice(6)}`;
    }

    // International or others: Keep as is (clean digits or +digits)
    // Maybe add spacing for readability if possible?
    // E.g. +919904918167 -> +91 99049 18167?
    // Hard to guess country code length without a library like libphonenumber.
    // "Use whatever is most standard". E.164 (condensed) is standard for machine storage,
    // but user asked for "Formatted".
    // Without country-specific rules, space-separated is hard.
    // Let's stick to returning the raw clean string (with +) for non-US,
    // OR if it's purely digits and long, maybe just return it.
    return clean;
};
