import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { validateDataPath } from './pathValidation';
import fs from 'fs';
import { join } from 'path';
import os from 'os';

describe('validateDataPath', () => {
    const tmpDir = os.tmpdir();
    const testDir = join(tmpDir, 'relay-test-data');

    beforeEach(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    afterEach(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    it('should return success for a valid writeable directory', () => {
        fs.mkdirSync(testDir);
        const result = validateDataPath(testDir);
        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
    });

    it('should create directory if it does not exist', () => {
        const result = validateDataPath(testDir);
        expect(result.success).toBe(true);
        expect(fs.existsSync(testDir)).toBe(true);
    });

    it('should return error for invalid path (mocked failure)', () => {
         // It's hard to simulate permission errors on actual OS tmp dirs without root/chmod
         // So we will spy on fs.writeFileSync to throw EACCES
         const spy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
             const err: any = new Error('Permission denied');
             err.code = 'EACCES';
             throw err;
         });

         const result = validateDataPath(testDir);
         expect(result.success).toBe(false);
         expect(result.error).toContain('Write permission denied');

         spy.mockRestore();
    });
});
