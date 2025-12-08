
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify/sync';

/**
 * Sanitizes a field for CSV export to prevent Formula Injection (CSV Injection).
 * Prepend a single quote if the field starts with =, +, -, @, \t, or \r.
 */
export function sanitizeField(value: string | null | undefined): string {
    if (!value) return '';
    const str = String(value);
    if (/^[=+\-@\t\r]/.test(str)) {
        return "'" + str;
    }
    return str;
}

/**
 * Desanitizes a field read from CSV.
 * If the field starts with a single quote followed by a hazardous character, remove the quote.
 */
export function desanitizeField(value: string | null | undefined): string {
    if (!value) return '';
    const str = String(value);
    if (str.startsWith("'") && /^[=+\-@\t\r]/.test(str.slice(1))) {
        return str.slice(1);
    }
    return str;
}

export function parseCsvAsync(contents: string): Promise<any[][]> {
    // Strip BOM if present
    const cleanContents = contents.replace(/^\uFEFF/, '');
    return new Promise((resolve, reject) => {
      parse(cleanContents, {
        trim: true,
        skip_empty_lines: true
      }, (err, records) => {
          if (err) reject(err);
          else resolve(records);
      });
    });
}
