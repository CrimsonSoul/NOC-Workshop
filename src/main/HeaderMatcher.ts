/**
 * Utility class for flexible CSV header matching and column management
 */

export class HeaderMatcher {
  private headers: string[];
  private lowerHeaders: string[];

  constructor(headers: string[]) {
    this.headers = headers;
    this.lowerHeaders = headers.map(h => String(h).toLowerCase().trim());
  }

  /**
   * Find column index by checking multiple possible aliases (case-insensitive)
   */
  findColumn(aliases: string[]): number {
    return this.lowerHeaders.findIndex(h => aliases.includes(h));
  }

  /**
   * Ensure a column exists, creating it if necessary
   * @param aliases - Possible column names to search for
   * @param defaultName - Name to use if column needs to be created
   * @param data - Optional data array to extend with empty values
   * @returns Column index
   */
  ensureColumn(aliases: string[], defaultName: string, data?: any[][]): number {
    let idx = this.findColumn(aliases);

    if (idx === -1) {
      // Add new column
      this.headers.push(defaultName);
      this.lowerHeaders.push(defaultName.toLowerCase());

      // Extend data rows with empty values if data provided
      if (data) {
        for (let i = 1; i < data.length; i++) {
          data[i].push('');
        }
      }

      idx = this.headers.length - 1;
    }

    return idx;
  }

  /**
   * Get the actual header name at an index
   */
  getHeader(index: number): string | undefined {
    return this.headers[index];
  }

  /**
   * Get all headers
   */
  getHeaders(): string[] {
    return [...this.headers];
  }

  /**
   * Check if a header exists
   */
  hasColumn(aliases: string[]): boolean {
    return this.findColumn(aliases) !== -1;
  }

  /**
   * Get column index, throwing error if not found
   */
  requireColumn(aliases: string[], errorMessage?: string): number {
    const idx = this.findColumn(aliases);
    if (idx === -1) {
      throw new Error(errorMessage || `Required column not found. Tried: ${aliases.join(', ')}`);
    }
    return idx;
  }
}
