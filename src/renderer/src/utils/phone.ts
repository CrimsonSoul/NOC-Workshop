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

    // Normalize US with 1 prefix
    // Only strip 1 if it's strictly a 10-digit number following it (standard US)
    if (!hasPlus && clean.length === 11 && clean.startsWith('1')) {
        clean = clean.slice(1);
    }


    // Internal Extension: (7) 270-5555
    if (clean.length === 8 && clean.startsWith('7')) {
        return `(7) ${clean.slice(1, 4)}-${clean.slice(4)}`;
    }

    // Format US 10-digit: (XXX) XXX-XXXX
    if (clean.length === 10 && (!hasPlus || (hasPlus && phone.startsWith('+1')))) {
        return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
    }

    // International / Long numbers
    // Goal: Use brackets for country code if possible.
    // Heuristic: If it starts with +, treat the first 1-3 digits as country code?
    // User example: "(1) ..." or "(25) ...".
    // If we have a plus, we try to parse it. 
    // This is tricky without a full lib, but let's try a best-effort approach based on user request.
    if (hasPlus || clean.length > 10) {
        // If 11 digits and starts with 1 -> +1 (US) -> (1) ...
        if (clean.length === 11 && clean.startsWith('1')) {
            const rest = clean.slice(1);
            return `(1) (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6)}`;
        }

        // Generic International: (CC) ...
        // Assume country code is 1-3 digits. 
        // For now, let's just format strictly as user requested if we can identify the code.
        // If it starts with +, use the digits after + until some logic? 
        // Let's just group visually: (CC) XXX...

        let formatted = hasPlus ? '+' + clean : clean;

        if (clean.length > 10) {
            // Try to guess country code length? 
            // For 12 digits: (XX) XXX...
            // For 11 digits (non-1): (X) ...
            // Let's apply a generic grouping with brackets for the first part.
            const codeLen = clean.length % 10 || 1; // Fallback
            // Actually, let's just support the explicit user examples and standard grouping.

            if (hasPlus) {
                // +923122016023 -> (92) 312 201 6023
                // How many digits is CC? Hard to know. 
                // Let's assume 2 digits if length is 12, 1 if length is 11?
                // Standard is difficult.
                // Let's stick to the user's specific "Internal" request first which was clear: (7) 270-5555.
                // For international: "(1) or (25)".
                // Let's just wrap the prefix in brackets if it exceeds 10 digits.
                const excess = clean.length - 10;
                if (excess > 0 && excess < 4) {
                    const code = clean.slice(0, excess);
                    const rest = clean.slice(excess);
                    // Format the rest as US-like if 10 digits?
                    const formattedRest = `${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
                    return `(${code}) ${formattedRest}`;
                }
            }
        }
    }

    // Format US 7-digit (local)
    if (clean.length === 7) {
        return `${clean.slice(0, 3)}-${clean.slice(3)}`;
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
