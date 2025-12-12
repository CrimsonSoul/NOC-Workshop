
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify/sync';
import type { CsvRow, CsvData } from '@shared/csvTypes';

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

/**
 * Parse CSV with enhanced options for better compatibility
 */
export function parseCsvAsync(contents: string): Promise<CsvRow[]> {
    // Strip BOM if present
    const cleanContents = contents.replace(/^\uFEFF/, '');
    return new Promise((resolve, reject) => {
      parse(cleanContents, {
        trim: true,
        skip_empty_lines: true,
        relax_quotes: true,        // More tolerant of malformed quotes
        relax_column_count: true,  // Allow variable column counts
        quote: '"',
        escape: '"'
      }, (err, records) => {
          if (err) reject(err);
          else resolve(records as CsvRow[]);
      });
    });
}

/**
 * Parse CSV and separate headers from rows
 */
export async function parseCsvWithHeaders(contents: string): Promise<CsvData> {
    const allRows = await parseCsvAsync(contents);

    if (allRows.length === 0) {
        return { headers: [], rows: [] };
    }

    return {
        headers: allRows[0],
        rows: allRows.slice(1)
    };
}

/**
 * Stringify CSV data with proper sanitization
 */
export function stringifyCsv(data: CsvRow[]): string {
    const sanitizedData = data.map(row => row.map(cell => sanitizeField(cell)));
    return stringify(sanitizedData);
}
