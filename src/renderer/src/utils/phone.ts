import { sanitizePhoneNumber as sharedSanitizePhoneNumber, normalizeUSPhone } from '../../../shared/phoneUtils';

/**
 * Re-export the shared sanitizePhoneNumber utility for backward compatibility
 */
export const sanitizePhoneNumber = sharedSanitizePhoneNumber;

/**
 * Formats a single sanitized phone number for UI display.
 * US numbers: 123-456-7890
 * Extensions: 1234
 * International: +91...
 */
const formatSingleNumber = (phone: string): string => {
    if (!phone) return '';

    // Handle international prefix
    const hasPlus = phone.trim().startsWith('+');
    let clean = phone.replace(/[^0-9]/g, '');

    // Normalize US with +1 prefix
    if (hasPlus && clean.length === 11 && clean.startsWith('1')) {
        const digits = clean.slice(1);
        return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    // Normalize US with 1 prefix (no plus)
    if (!hasPlus && clean.length === 11 && clean.startsWith('1')) {
        clean = clean.slice(1);
    }

    // Format US 10-digit
    if (clean.length === 10) {
        return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
    }

    // Format US 7-digit (local)
    if (clean.length === 7) {
        return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    }

    // International (non-US)
    if (hasPlus) {
        return '+' + clean;
    }

    // Internal Extension (2-6 digits)
    if (clean.length >= 2 && clean.length <= 6) {
        return clean;
    }

    // Fallback
    return hasPlus ? '+' + clean : clean;
};

/**
 * Formats a phone number for UI display.
 * Handles run-on numbers and multiple numbers separated by punctuation.
 *
 * @param phone - Raw phone number string
 * @returns Formatted phone number(s)
 */
export const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';

    // Split by common separators (comma, semicolon, slash, pipe)
    const parts = phone.split(/[,;/|]/);

    if (parts.length > 1) {
        return parts
            .map(p => formatPhoneNumber(p.trim()))
            .filter(p => !!p)
            .join(', ');
    }

    const input = phone.trim();
    const digitOnly = input.replace(/[^0-9]/g, '');

    // Handle "Run-on" numbers (concatenated 10-digit numbers) without separators
    // e.g. 55555555551111111111 -> split
    if (digitOnly.length >= 20 && digitOnly.length % 10 === 0 && /^\d+$/.test(digitOnly) && !input.startsWith('+')) {
        const subParts: string[] = [];
        for (let i = 0; i < digitOnly.length; i += 10) {
            subParts.push(digitOnly.slice(i, i + 10));
        }
        return subParts.map(formatSingleNumber).join(', ');
    }

    return formatSingleNumber(input);
};
