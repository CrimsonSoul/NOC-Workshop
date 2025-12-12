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
    it('formats 10 digit numbers as raw strings', () => {
        expect(formatPhoneNumber('5551234567')).toBe('5551234567');
        expect(formatPhoneNumber('555-123-4567')).toBe('5551234567');
    });

    it('formats 11 digit numbers starting with 1 by stripping 1', () => {
        expect(formatPhoneNumber('15551234567')).toBe('5551234567');
    });

    it('formats 11 digit numbers starting with +1 by stripping +1', () => {
        expect(formatPhoneNumber('+15551234567')).toBe('5551234567');
    });

    it('preserves international numbers with +', () => {
        expect(formatPhoneNumber('+919999999999')).toBe('+919999999999');
        expect(formatPhoneNumber('+447700900077')).toBe('+447700900077');
    });

    it('handles 00 prefix as +', () => {
        expect(sanitizePhoneNumber('00447700900077')).toBe('+447700900077');
        expect(formatPhoneNumber('00447700900077')).toBe('+447700900077');
    });

    it('splits run-on numbers with comma', () => {
        expect(formatPhoneNumber('55555555551111111111')).toBe('5555555555, 1111111111');
        expect(formatPhoneNumber('555555555511111111112222222222')).toBe('5555555555, 1111111111, 2222222222');
    });
});
