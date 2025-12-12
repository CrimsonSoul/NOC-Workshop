import { describe, it, expect } from 'vitest';
import { cleanAndFormatPhoneNumber } from './phoneUtils';

describe('cleanAndFormatPhoneNumber', () => {
    it('formats simple US numbers', () => {
        expect(cleanAndFormatPhoneNumber('5551234567')).toBe('(555) 123-4567');
        expect(cleanAndFormatPhoneNumber('1-555-123-4567')).toBe('(555) 123-4567');
        expect(cleanAndFormatPhoneNumber('+1 (555) 123-4567')).toBe('(555) 123-4567');
    });

    it('splits complex labeled strings', () => {
        const input = 'Office:79984456 Ext:877-273-9002';
        expect(cleanAndFormatPhoneNumber(input)).toBe('79984456, (877) 273-9002');
    });

    it('splits comma separated numbers', () => {
        expect(cleanAndFormatPhoneNumber('5551234567, 555-987-6543')).toBe('(555) 123-4567, (555) 987-6543');
    });

    it('handles international numbers', () => {
        expect(cleanAndFormatPhoneNumber('+91 99049 18167')).toBe('+919904918167');
        expect(cleanAndFormatPhoneNumber('0044 7700 900077')).toBe('+447700900077');
    });

    it('deduplicates numbers', () => {
        expect(cleanAndFormatPhoneNumber('555-123-4567, (555) 123-4567')).toBe('(555) 123-4567');
    });

    it('handles mixed US and International', () => {
        expect(cleanAndFormatPhoneNumber('+1 555 123 4567; +44 20 7946 0958')).toBe('(555) 123-4567, +442079460958');
    });

    it('ignores junk text', () => {
        expect(cleanAndFormatPhoneNumber('Call me at 555-123-4567 or at home')).toBe('(555) 123-4567');
    });

    it('handles empty input', () => {
        expect(cleanAndFormatPhoneNumber('')).toBe('');
    });
});
