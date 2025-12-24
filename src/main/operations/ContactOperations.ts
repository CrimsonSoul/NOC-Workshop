/**
 * ContactOperations - All contact-related CRUD operations
 *
 * Handles parsing, adding, removing contacts and importing from external files.
 */

import { join } from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { stringify } from "csv-stringify/sync";
import type { Contact, DataError } from "@shared/ipc";
import { parseCsvAsync, desanitizeField, stringifyCsv } from "../csvUtils";
import { cleanAndFormatPhoneNumber } from "../phoneUtils";
import { HeaderMatcher } from "../HeaderMatcher";
import { validateContacts } from "../csvValidation";
import { CONTACT_COLUMN_ALIASES } from "@shared/csvTypes";
import { FileContext, CONTACT_FILES } from "./FileContext";

/**
 * Parse contacts.csv into an array of Contact objects
 * Handles phone number cleanup and validation
 */
export async function parseContacts(ctx: FileContext): Promise<Contact[]> {
  const path = ctx.resolveExistingFile(CONTACT_FILES);
  if (!path) return [];

  try {
    const contents = await fs.readFile(path, "utf-8");
    const data = await parseCsvAsync(contents);

    if (data.length < 2) return [];

    const header = data[0].map((h: any) =>
      desanitizeField(String(h).trim().toLowerCase())
    );
    const rows = data.slice(1);

    // Use HeaderMatcher for flexible column matching
    const matcher = new HeaderMatcher(header);
    const phoneIdx = matcher.findColumn(CONTACT_COLUMN_ALIASES.phone);

    let needsWrite = false;

    // Clean phone numbers in memory if needed
    if (phoneIdx !== -1) {
      for (let i = 1; i < data.length; i++) {
        const rawPhone = desanitizeField(data[i][phoneIdx]);
        if (rawPhone) {
          const cleaned = cleanAndFormatPhoneNumber(String(rawPhone));
          if (cleaned !== rawPhone) {
            data[i][phoneIdx] = cleaned; // We will sanitize on write
            needsWrite = true;
          }
        }
      }
    }

    if (needsWrite) {
      console.log(
        "[ContactOperations] Detected messy phone numbers. Cleaning and rewriting contacts.csv..."
      );
      const csvOutput = stringifyCsv(data);
      ctx.rewriteFileDetached(path, csvOutput);
    }

    const results = rows.map((rowValues: any[]) => {
      const row: { [key: string]: string } = {};
      header.forEach((h: string, i: number) => {
        row[h] = desanitizeField(rowValues[i]);
      });

      const getField = (fieldNames: string[]) => {
        for (const fieldName of fieldNames) {
          if (row[fieldName.toLowerCase()])
            return row[fieldName.toLowerCase()].trim();
        }
        return "";
      };

      const name = getField(["name", "full name"]);
      const email = getField(["email", "e-mail"]);
      const phone = getField(["phone", "phone number"]);
      const title = getField([
        "title",
        "role",
        "position",
        "department",
        "dept",
      ]);

      return {
        name,
        email,
        phone,
        title,
        _searchString: `${name} ${email} ${phone} ${title}`.toLowerCase(),
        raw: row,
      };
    });

    // Validate contacts and emit warnings
    const validation = validateContacts(results);
    if (validation.warnings.length > 0) {
      const error: DataError = {
        type: "validation",
        message: `Found ${validation.warnings.length} validation warnings in contacts.csv`,
        file: "contacts.csv",
        details: validation.warnings,
      };
      ctx.emitError(error);
    }

    return results;
  } catch (e) {
    const error: DataError = {
      type: "parse",
      message: "Error parsing contacts.csv",
      file: "contacts.csv",
      details: e instanceof Error ? e.message : String(e),
    };
    ctx.emitError(error);
    return [];
  }
}

/**
 * Remove a contact by email
 */
export async function removeContact(
  ctx: FileContext,
  email: string
): Promise<boolean> {
  try {
    const path = join(ctx.rootDir, CONTACT_FILES[0]);
    if (!existsSync(path)) return false;

    const contents = await fs.readFile(path, "utf-8");
    const data = await parseCsvAsync(contents);

    if (data.length < 2) return false;

    const header = data[0].map((h: any) =>
      desanitizeField(String(h).toLowerCase())
    );
    const emailIdx = header.findIndex((h: string) =>
      ["email", "e-mail"].includes(h)
    );

    if (emailIdx === -1) return false;

    const newData = [data[0]];
    let removed = false;

    for (let i = 1; i < data.length; i++) {
      const val = desanitizeField(data[i][emailIdx]);
      if (val === email) {
        removed = true;
      } else {
        newData.push(data[i]);
      }
    }

    if (removed) {
      const csvOutput = stringify(newData);
      await ctx.writeAndEmit(path, csvOutput);
      ctx.performBackup("removeContact");
      return true;
    }
    return false;
  } catch (e) {
    console.error("[ContactOperations] removeContact error:", e);
    return false;
  }
}

/**
 * Add or update a contact
 * If email exists, updates the existing row; otherwise adds new row
 */
export async function addContact(
  ctx: FileContext,
  contact: Partial<Contact>
): Promise<boolean> {
  try {
    const path = join(ctx.rootDir, CONTACT_FILES[0]);
    let contents = "";
    if (existsSync(path)) {
      contents = await fs.readFile(path, "utf-8");
    }

    const data = await parseCsvAsync(contents);

    // Strategy: Convert EVERYTHING to desanitized in memory first.
    const workingData = data.map((row) =>
      row.map((cell: string) => desanitizeField(cell))
    );
    let workingHeader = workingData.length > 0 ? workingData[0] : [];

    const findIdxWorking = (names: string[]) =>
      workingHeader.findIndex((h: string) => names.includes(h.toLowerCase()));
    const ensureColWorking = (names: string[], defaultName: string) => {
      let idx = findIdxWorking(names);
      if (idx === -1) {
        workingHeader.push(defaultName);
        for (let i = 1; i < workingData.length; i++) workingData[i].push("");
        idx = workingHeader.length - 1;
      }
      return idx;
    };

    if (workingData.length === 0) {
      workingHeader = ["Name", "Title", "Email", "Phone"];
      workingData.push(workingHeader);
    }

    const nameIdx = ensureColWorking(["name", "full name"], "Name");
    const emailIdx = ensureColWorking(["email", "e-mail"], "Email");
    const titleIdx = ensureColWorking(["title", "role", "position"], "Title");
    const phoneIdx = ensureColWorking(["phone", "phone number"], "Phone");

    if (contact.phone) {
      contact.phone = cleanAndFormatPhoneNumber(contact.phone);
    }

    let rowIndex = -1;
    if (emailIdx !== -1 && contact.email) {
      rowIndex = workingData.findIndex(
        (row, idx) => idx > 0 && row[emailIdx] === contact.email
      );
    }

    if (rowIndex !== -1) {
      const row = workingData[rowIndex];
      if (nameIdx !== -1 && contact.name !== undefined)
        row[nameIdx] = contact.name;
      if (titleIdx !== -1 && contact.title !== undefined)
        row[titleIdx] = contact.title;
      if (phoneIdx !== -1 && contact.phone !== undefined)
        row[phoneIdx] = contact.phone;
    } else {
      const newRow = new Array(workingHeader.length).fill("");
      const setVal = (idx: number, val?: string) => {
        if (idx !== -1 && val !== undefined) newRow[idx] = val;
      };

      setVal(nameIdx, contact.name);
      setVal(emailIdx, contact.email);
      setVal(titleIdx, contact.title);
      setVal(phoneIdx, contact.phone);

      workingData.push(newRow);
    }

    const csvOutput = ctx.safeStringify(workingData);
    await ctx.writeAndEmit(path, csvOutput);
    ctx.performBackup("addContact");
    return true;
  } catch (e) {
    console.error("[ContactOperations] addContact error:", e);
    return false;
  }
}

/**
 * Import contacts from an external CSV file, merging with existing data
 */
export async function importContactsWithMapping(
  ctx: FileContext,
  sourcePath: string
): Promise<boolean> {
  try {
    const targetPath = join(ctx.rootDir, CONTACT_FILES[0]);

    // Read source first
    const sourceContent = await fs.readFile(sourcePath, "utf-8");
    const sourceDataRaw = await parseCsvAsync(sourceContent);
    const sourceData = sourceDataRaw.map((r) =>
      r.map((c) => desanitizeField(c))
    );
    if (sourceData.length < 2) return false;

    // Check if current contacts are dummy data
    if (await ctx.isDummyData(CONTACT_FILES[0])) {
      console.log(
        "[ContactOperations] Detected dummy contacts. Clearing before import."
      );
      try {
        await fs.unlink(targetPath);
      } catch (e) {
        console.error(
          "[ContactOperations] Failed to delete dummy contacts file:",
          e
        );
      }
    }

    const sourceHeader = sourceData[0].map((h: any) =>
      String(h).toLowerCase().trim()
    );
    const sourceRows = sourceData.slice(1);

    // Use priority-order matching like HeaderMatcher - check each candidate in order
    const mapHeader = (candidates: string[]) => {
      for (const candidate of candidates) {
        const idx = sourceHeader.indexOf(candidate);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const srcNameIdx = mapHeader(CONTACT_COLUMN_ALIASES.name);
    const srcEmailIdx = mapHeader(CONTACT_COLUMN_ALIASES.email);
    const srcPhoneIdx = mapHeader(CONTACT_COLUMN_ALIASES.phone);
    const srcTitleIdx = mapHeader(CONTACT_COLUMN_ALIASES.title);

    if (srcEmailIdx === -1) {
      console.error(
        "[ContactOperations] Import failed: No email column found."
      );
      return false;
    }

    let targetData: any[][] = [];
    const existingContent = existsSync(targetPath)
      ? await fs.readFile(targetPath, "utf-8")
      : "";

    if (existsSync(targetPath)) {
      const rawTarget = await parseCsvAsync(existingContent);
      targetData = rawTarget.map((r) => r.map((c) => desanitizeField(c)));
    }

    if (targetData.length === 0) {
      targetData.push(["Name", "Email", "Phone", "Title"]);
    }

    const targetHeader = targetData[0].map((h: any) => String(h).toLowerCase());

    const getTargetIdx = (name: string) => {
      let idx = targetHeader.findIndex((h: string) => h === name.toLowerCase());
      if (idx === -1) {
        targetHeader.push(name.toLowerCase());
        targetData[0].push(name);
        for (let i = 1; i < targetData.length; i++) targetData[i].push("");
        idx = targetHeader.length - 1;
      }
      return idx;
    };

    const tgtNameIdx = getTargetIdx("Name");
    const tgtEmailIdx = getTargetIdx("Email");
    const tgtPhoneIdx = getTargetIdx("Phone");
    const tgtTitleIdx = getTargetIdx("Title");

    // Build email -> row index map for O(1) lookups (instead of O(n) per contact)
    const emailToRowIdx = new Map<string, number>();
    for (let i = 1; i < targetData.length; i++) {
      const existingEmail = targetData[i][tgtEmailIdx]?.trim().toLowerCase();
      if (existingEmail) {
        emailToRowIdx.set(existingEmail, i);
      }
    }

    for (const srcRow of sourceRows) {
      const email = srcRow[srcEmailIdx]?.trim();
      if (!email) continue;

      const name = srcNameIdx !== -1 ? srcRow[srcNameIdx] : "";
      const title = srcTitleIdx !== -1 ? srcRow[srcTitleIdx] : "";
      let phone = srcPhoneIdx !== -1 ? srcRow[srcPhoneIdx] : "";

      if (phone) phone = cleanAndFormatPhoneNumber(String(phone));

      // O(1) lookup using Map instead of O(n) loop
      const matchRowIdx = emailToRowIdx.get(email.toLowerCase());

      if (matchRowIdx !== undefined) {
        if (name) targetData[matchRowIdx][tgtNameIdx] = name;
        if (phone) targetData[matchRowIdx][tgtPhoneIdx] = phone;
        if (title) targetData[matchRowIdx][tgtTitleIdx] = title;
      } else {
        const newRow = new Array(targetData[0].length).fill("");
        newRow[tgtEmailIdx] = email;
        newRow[tgtNameIdx] = name;
        newRow[tgtPhoneIdx] = phone;
        newRow[tgtTitleIdx] = title;
        targetData.push(newRow);
        // Add to map so subsequent duplicates in source can find it
        emailToRowIdx.set(email.toLowerCase(), targetData.length - 1);
      }
    }

    const csvOutput = ctx.safeStringify(targetData);
    await ctx.writeAndEmit(targetPath, csvOutput);
    ctx.performBackup("importContacts");
    return true;
  } catch (e) {
    console.error("[ContactOperations] importContactsWithMapping error:", e);
    return false;
  }
}
