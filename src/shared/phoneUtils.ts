/**
 * Shared phone number utilities for both main and renderer processes.
 * These utilities handle sanitization and basic formatting of phone numbers.
 */

/**
 * Sanitizes a phone number string by removing all non-numeric characters
 * except for a leading '+' sign (for international numbers).
 *
 * Handles '00' prefix as '+' (common international standard).
 *
 * @param phone - The phone number string to sanitize
 * @returns A sanitized string containing only digits and optionally a leading '+'
 */
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
  const hasPlus = processed.startsWith('+');
  const digits = processed.replace(/[^0-9]/g, '');

  if (!digits) return '';

  return hasPlus ? `+${digits}` : digits;
};

/**
 * Formats a US phone number (10 digits) with parentheses and dashes.
 * E.g., "5551234567" -> "(555) 123-4567"
 *
 * @param digits - A string of exactly 10 digits
 * @returns Formatted phone number
 */
export const formatUSPhone = (digits: string): string => {
  if (digits.length !== 10) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
};

/**
 * Determines if a sanitized phone number is a US number and returns it
 * in a normalized format (10 digits, no country code).
 *
 * @param clean - A sanitized phone number (digits only, optionally with leading +)
 * @returns Object with isUS flag and normalized digits
 */
export const normalizeUSPhone = (clean: string): { isUS: boolean; digits: string } => {
  // 10 digits: XXXXXXXXXX (US Standard)
  if (/^\d{10}$/.test(clean)) {
    return { isUS: true, digits: clean };
  }

  // 11 digits starting with 1: 1XXXXXXXXXX (US with country code)
  if (/^1\d{10}$/.test(clean)) {
    return { isUS: true, digits: clean.slice(1) };
  }

  // +1 followed by 10 digits: +1XXXXXXXXXX (International format US)
  if (/^\+1\d{10}$/.test(clean)) {
    return { isUS: true, digits: clean.slice(2) };
  }

  return { isUS: false, digits: clean };
};
