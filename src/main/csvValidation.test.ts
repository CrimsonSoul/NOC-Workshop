import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidPhone } from './csvValidation';

describe('isValidEmail', () => {
  // Valid emails
  it('accepts standard email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('user.name@example.com')).toBe(true);
    expect(isValidEmail('user+tag@example.com')).toBe(true);
    expect(isValidEmail('user@subdomain.example.com')).toBe(true);
  });

  it('accepts emails with special characters in local part', () => {
    expect(isValidEmail("user!#$%&'*+/=?^_`{|}~@example.com")).toBe(true);
    expect(isValidEmail('user-name@example.com')).toBe(true);
  });

  it('accepts emails with valid TLDs', () => {
    expect(isValidEmail('user@example.co')).toBe(true);
    expect(isValidEmail('user@example.io')).toBe(true);
    expect(isValidEmail('user@example.museum')).toBe(true);
  });

  // Invalid emails
  it('rejects emails without @ symbol', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('rejects emails without domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('rejects emails without local part', () => {
    expect(isValidEmail('@example.com')).toBe(false);
  });

  it('rejects emails with single-character TLD', () => {
    expect(isValidEmail('user@example.c')).toBe(false);
    expect(isValidEmail('a@b.c')).toBe(false);
  });

  it('rejects emails with consecutive dots', () => {
    expect(isValidEmail('user..name@example.com')).toBe(false);
    expect(isValidEmail('user@example..com')).toBe(false);
  });

  it('rejects emails with leading/trailing dots in local part', () => {
    expect(isValidEmail('.user@example.com')).toBe(false);
    expect(isValidEmail('user.@example.com')).toBe(false);
  });

  it('rejects empty or whitespace-only input', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('   ')).toBe(false);
  });

  it('rejects emails exceeding max length', () => {
    const longEmail = 'a'.repeat(250) + '@example.com';
    expect(isValidEmail(longEmail)).toBe(false);
  });

  it('trims whitespace from input', () => {
    expect(isValidEmail('  user@example.com  ')).toBe(true);
  });
});

describe('isValidPhone', () => {
  // Valid phones
  it('accepts US phone formats', () => {
    expect(isValidPhone('1234567890')).toBe(true);
    expect(isValidPhone('123-456-7890')).toBe(true);
    expect(isValidPhone('(123) 456-7890')).toBe(true);
    expect(isValidPhone('123.456.7890')).toBe(true);
  });

  it('accepts international formats', () => {
    expect(isValidPhone('+1 234 567 8901')).toBe(true);
    expect(isValidPhone('+44 20 7946 0958')).toBe(true);
    expect(isValidPhone('+1-234-567-8901')).toBe(true);
  });

  it('accepts extensions', () => {
    expect(isValidPhone('123-456-7890 x123')).toBe(true);
    expect(isValidPhone('123-456-7890 ext 123')).toBe(true);
    expect(isValidPhone('123-456-7890 ext. 123')).toBe(true);
  });

  it('accepts empty/null phones (optional field)', () => {
    expect(isValidPhone('')).toBe(true);
    expect(isValidPhone('   ')).toBe(true);
  });

  // Invalid phones
  it('rejects strings with too few digits', () => {
    expect(isValidPhone('123')).toBe(false);
    expect(isValidPhone('12-34-56')).toBe(false);
    expect(isValidPhone('abc')).toBe(false);
  });

  it('rejects strings with too many digits', () => {
    expect(isValidPhone('1234567890123456')).toBe(false); // 16 digits
  });

  it('rejects strings with invalid characters', () => {
    expect(isValidPhone('123-456-7890@')).toBe(false);
    expect(isValidPhone('123abc4567890')).toBe(false);
    expect(isValidPhone('phone: 1234567890')).toBe(false);
  });

  it('trims whitespace from input', () => {
    expect(isValidPhone('  123-456-7890  ')).toBe(true);
  });
});
