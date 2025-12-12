/**
 * CSV data validation utilities
 */

import { ValidationError, ValidationResult } from '@shared/csvTypes';
import type { Contact, Server } from '@shared/ipc';

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || !email.trim()) return false;

  // Basic email regex - more permissive to handle various formats
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate phone number format (very permissive - just check if it has digits)
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || !phone.trim()) return true; // Phone is optional

  // Check if it contains at least some digits
  const hasDigits = /\d/.test(phone);
  return hasDigits;
}

/**
 * Validate required fields for contact
 */
export function validateContact(contact: Partial<Contact>, row: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // Email is required
  if (!contact.email || !contact.email.trim()) {
    errors.push({
      row,
      field: 'email',
      value: contact.email || '',
      message: 'Email is required'
    });
  } else if (!isValidEmail(contact.email)) {
    errors.push({
      row,
      field: 'email',
      value: contact.email,
      message: 'Invalid email format'
    });
  }

  // Name validation (optional but warn if missing)
  if (!contact.name || !contact.name.trim()) {
    errors.push({
      row,
      field: 'name',
      value: contact.name || '',
      message: 'Name is recommended (not required)'
    });
  }

  // Phone validation
  if (contact.phone && !isValidPhone(contact.phone)) {
    errors.push({
      row,
      field: 'phone',
      value: contact.phone,
      message: 'Invalid phone format'
    });
  }

  return errors;
}

/**
 * Validate required fields for server
 */
export function validateServer(server: Partial<Server>, row: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // Name is required
  if (!server.name || !server.name.trim()) {
    errors.push({
      row,
      field: 'name',
      value: server.name || '',
      message: 'Server name is required'
    });
  }

  // Owner email validation (if provided)
  if (server.owner && server.owner.trim() && !isValidEmail(server.owner)) {
    errors.push({
      row,
      field: 'owner',
      value: server.owner,
      message: 'Invalid owner email format'
    });
  }

  // Contact email validation (if provided)
  if (server.contact && server.contact.trim() && !isValidEmail(server.contact)) {
    errors.push({
      row,
      field: 'contact',
      value: server.contact,
      message: 'Invalid IT contact email format'
    });
  }

  return errors;
}

/**
 * Check for duplicate contacts by email
 */
export function findDuplicateContacts(contacts: Partial<Contact>[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const seen = new Map<string, number>();

  contacts.forEach((contact, idx) => {
    const email = contact.email?.toLowerCase().trim();
    if (!email) return;

    const firstRow = seen.get(email);
    if (firstRow !== undefined) {
      errors.push({
        row: idx + 2, // +2 because row 1 is header and arrays are 0-indexed
        field: 'email',
        value: contact.email || '',
        message: `Duplicate email (first seen on row ${firstRow})`
      });
    } else {
      seen.set(email, idx + 2);
    }
  });

  return errors;
}

/**
 * Check for duplicate servers by name
 */
export function findDuplicateServers(servers: Partial<Server>[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const seen = new Map<string, number>();

  servers.forEach((server, idx) => {
    const name = server.name?.toLowerCase().trim();
    if (!name) return;

    const firstRow = seen.get(name);
    if (firstRow !== undefined) {
      errors.push({
        row: idx + 2,
        field: 'name',
        value: server.name || '',
        message: `Duplicate server name (first seen on row ${firstRow})`
      });
    } else {
      seen.set(name, idx + 2);
    }
  });

  return errors;
}

/**
 * Validate a batch of contacts
 */
export function validateContacts(contacts: Partial<Contact>[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validate each contact
  contacts.forEach((contact, idx) => {
    const contactErrors = validateContact(contact, idx + 2);
    contactErrors.forEach(err => {
      if (err.message.includes('recommended')) {
        warnings.push(err);
      } else {
        errors.push(err);
      }
    });
  });

  // Check for duplicates
  const duplicates = findDuplicateContacts(contacts);
  warnings.push(...duplicates);

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a batch of servers
 */
export function validateServers(servers: Partial<Server>[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validate each server
  servers.forEach((server, idx) => {
    const serverErrors = validateServer(server, idx + 2);
    errors.push(...serverErrors);
  });

  // Check for duplicates
  const duplicates = findDuplicateServers(servers);
  warnings.push(...duplicates);

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
