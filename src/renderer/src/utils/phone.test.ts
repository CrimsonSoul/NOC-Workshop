import { describe, it, expect } from 'vitest';
import { sanitizePhoneNumber, formatPhoneNumber } from './phone';

describe('sanitizePhoneNumber', () => {
    it('strips non-numeric characters', () => {
        expect(sanitizePhoneNumber('123-456')).toBe('123456');
        expect(sanitizePhoneNumber('(555) 123')).toBe('555123');
        expect(sanitizePhoneNumber('123 456')).toBe('123456');
    });

    it('preserves leading +', () => {
        expect(sanitizePhoneNumber('+1-555-123')).toBe('+1555123');
        expect(sanitizePhoneNumber('+92 123')).toBe('+92123');
    });

    it('removes labels', () => {
        expect(sanitizePhoneNumber('Phone: 123')).toBe('123');
        expect(sanitizePhoneNumber('Work: +1 234')).toBe('+1234');
        expect(sanitizePhoneNumber('Phone1 (+92 123)')).toBe('+92123');
    });

    it('handles empty strings', () => {
        expect(sanitizePhoneNumber('')).toBe('');
        expect(sanitizePhoneNumber('   ')).toBe('');
        expect(sanitizePhoneNumber('abc')).toBe('');
    });
});

describe('formatPhoneNumber', () => {
    it('formats 10 digit numbers', () => {
        expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
        expect(formatPhoneNumber('555-123-4567')).toBe('(555) 123-4567');
    });

    it('formats 11 digit numbers starting with 1', () => {
        expect(formatPhoneNumber('15551234567')).toBe('+1 (555) 123-4567');
    });

    it('formats 11 digit numbers starting with +1', () => {
        expect(formatPhoneNumber('+15551234567')).toBe('+1 (555) 123-4567');
    });

    it('returns raw for other formats', () => {
        expect(formatPhoneNumber('123')).toBe('123');
        // Now formatted as international
        expect(formatPhoneNumber('+44 123')).toBe('+44 123');
    });

    it('formats generic international numbers', () => {
        // 13 chars total, CC=44, Rest=7700900077 -> +44 7700 9000 77
        // Wait, input +44 7700 900077 -> sanitized +447700900077
        // format logic: CC=44, Rest=7700900077 (10 digits)
        // Chunks of 4: 7700 9000 77
        // Result: +44 7700 9000 77
        expect(formatPhoneNumber('+44 7700 900077')).toBe('+44 7700 9000 77');
    });

    it('handles 00 prefix as +', () => {
        expect(sanitizePhoneNumber('00447700900077')).toBe('+447700900077');
    });
});
