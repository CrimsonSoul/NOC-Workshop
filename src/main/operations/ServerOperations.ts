/**
 * ServerOperations - All server-related CRUD operations
 *
 * Handles parsing, adding, removing servers and importing from external files.
 */

import { join } from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import type { Server, DataError } from "@shared/ipc";
import { parseCsvAsync, desanitizeField } from "../csvUtils";
import { HeaderMatcher } from "../HeaderMatcher";
import { validateServers } from "../csvValidation";
import { STD_SERVER_HEADERS, SERVER_COLUMN_ALIASES } from "@shared/csvTypes";
import { FileContext, SERVER_FILES, CONTACT_FILES } from "./FileContext";
import { parseContacts } from "./ContactOperations";

/**
 * Parse servers.csv into an array of Server objects
 * Handles auto-detecting headers and normalizing column formats
 */
export async function parseServers(ctx: FileContext): Promise<Server[]> {
  const path = ctx.resolveExistingFile(SERVER_FILES);
  if (!path) return [];

  try {
    const contents = await fs.readFile(path, "utf-8");
    const lines = contents.split(/\r?\n/);

    let headerLineIndex = 0;
    const possibleHeaders = ["VM-M", "Server Name", "Name"];

    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      const line = lines[i].toLowerCase();
      if (possibleHeaders.some((h) => line.includes(h.toLowerCase()))) {
        headerLineIndex = i;
        break;
      }
    }

    const cleanContents = lines.slice(headerLineIndex).join("\n");
    const data = await parseCsvAsync(cleanContents);

    if (data.length < 2) return [];

    const header = data[0].map((h: any) =>
      desanitizeField(String(h).trim().toLowerCase())
    );
    const rows = data.slice(1);

    // Use HeaderMatcher for flexible column matching
    const matcher = new HeaderMatcher(header);

    const nameIdx = matcher.findColumn(SERVER_COLUMN_ALIASES.name);
    const baIdx = matcher.findColumn(SERVER_COLUMN_ALIASES.businessArea);
    const lobIdx = matcher.findColumn(SERVER_COLUMN_ALIASES.lob);
    const commentIdx = matcher.findColumn(SERVER_COLUMN_ALIASES.comment);
    const ownerIdx = matcher.findColumn(SERVER_COLUMN_ALIASES.owner);
    const contactIdx = matcher.findColumn(SERVER_COLUMN_ALIASES.contact);
    const osIdx = matcher.findColumn(SERVER_COLUMN_ALIASES.os);

    if (nameIdx === -1) {
      const error: DataError = {
        type: "parse",
        message: "No Name column found in servers.csv",
        file: "servers.csv",
      };
      ctx.emitError(error);
      return [];
    }

    let needsRewrite = false;
    if (headerLineIndex > 0) needsRewrite = true;

    const currentHeaderStr = data[0]
      .map((h: string) => String(h).trim())
      .join(",");
    const stdHeaderStr = [...STD_SERVER_HEADERS].join(",");

    if (currentHeaderStr !== stdHeaderStr) {
      needsRewrite = true;
    }

    const results: Server[] = [];
    const cleanDataForRewrite: string[][] = [[...STD_SERVER_HEADERS]];

    for (const rowValues of rows) {
      const getVal = (idx: number) => {
        if (idx === -1 || idx >= rowValues.length) return "";
        return desanitizeField(rowValues[idx]);
      };

      const name = getVal(nameIdx);
      if (!name) continue;

      const businessArea = getVal(baIdx);
      const lob = getVal(lobIdx);
      const comment = getVal(commentIdx);
      const owner = getVal(ownerIdx);
      const contact = getVal(contactIdx);
      const os = getVal(osIdx);

      const raw: Record<string, string> = {
        name: name,
        "business area": businessArea,
        lob: lob,
        comment: comment,
        owner: owner,
        "it contact": contact,
        os: os,
      };

      results.push({
        name,
        businessArea,
        lob,
        comment,
        owner,
        contact,
        os,
        _searchString:
          `${name} ${businessArea} ${lob} ${owner} ${contact} ${os} ${comment}`.toLowerCase(),
        raw,
      });

      cleanDataForRewrite.push([
        name,
        businessArea,
        lob,
        comment,
        owner,
        contact,
        os,
      ]);
    }

    // Validate servers and emit warnings
    const validation = validateServers(results);
    if (validation.warnings.length > 0) {
      const error: DataError = {
        type: "validation",
        message: `Found ${validation.warnings.length} validation warnings in servers.csv`,
        file: "servers.csv",
        details: validation.warnings,
      };
      ctx.emitError(error);
    }

    if (needsRewrite) {
      console.log(
        "[ServerOperations] servers.csv has old headers or is dirty. Rewriting with standard headers..."
      );
      const csvOutput = ctx.safeStringify(cleanDataForRewrite);
      ctx.rewriteFileDetached(path, csvOutput);
    }

    return results;
  } catch (e) {
    const error: DataError = {
      type: "parse",
      message: "Error parsing servers.csv",
      file: "servers.csv",
      details: e instanceof Error ? e.message : String(e),
    };
    ctx.emitError(error);
    return [];
  }
}

/**
 * Add or update a server
 * If name exists, updates the existing row; otherwise adds new row
 */
export async function addServer(
  ctx: FileContext,
  server: Partial<Server>
): Promise<boolean> {
  try {
    const path = join(ctx.rootDir, SERVER_FILES[0]);
    let contents = "";
    if (existsSync(path)) {
      contents = await fs.readFile(path, "utf-8");
    }

    const data = await parseCsvAsync(contents);
    const workingData = data.map((row) =>
      row.map((cell) => desanitizeField(cell))
    );

    if (workingData.length === 0) {
      workingData.push([...STD_SERVER_HEADERS]);
    }

    let workingHeader = workingData[0];
    const matcher = new HeaderMatcher(workingHeader);

    const nameIdx = matcher.ensureColumn(
      SERVER_COLUMN_ALIASES.name,
      STD_SERVER_HEADERS[0],
      workingData
    );
    const businessAreaIdx = matcher.ensureColumn(
      SERVER_COLUMN_ALIASES.businessArea,
      STD_SERVER_HEADERS[1],
      workingData
    );
    const lobIdx = matcher.ensureColumn(
      SERVER_COLUMN_ALIASES.lob,
      STD_SERVER_HEADERS[2],
      workingData
    );
    const commentIdx = matcher.ensureColumn(
      SERVER_COLUMN_ALIASES.comment,
      STD_SERVER_HEADERS[3],
      workingData
    );
    const ownerIdx = matcher.ensureColumn(
      SERVER_COLUMN_ALIASES.owner,
      STD_SERVER_HEADERS[4],
      workingData
    );
    const contactIdx = matcher.ensureColumn(
      SERVER_COLUMN_ALIASES.contact,
      STD_SERVER_HEADERS[5],
      workingData
    );
    const osIdx = matcher.ensureColumn(
      SERVER_COLUMN_ALIASES.os,
      STD_SERVER_HEADERS[6],
      workingData
    );

    // Update or Add
    let rowIndex = -1;
    if (server.name) {
      const lowerName = server.name.toLowerCase();
      rowIndex = workingData.findIndex(
        (row, idx) =>
          idx > 0 && row[nameIdx]?.trim().toLowerCase() === lowerName
      );
    }

    const setVal = (row: any[], idx: number, val?: string) => {
      if (idx !== -1 && val !== undefined) row[idx] = val;
    };

    if (rowIndex !== -1) {
      const row = workingData[rowIndex];
      setVal(row, nameIdx, server.name);
      setVal(row, businessAreaIdx, server.businessArea);
      setVal(row, lobIdx, server.lob);
      setVal(row, commentIdx, server.comment);
      setVal(row, ownerIdx, server.owner);
      setVal(row, contactIdx, server.contact);
      setVal(row, osIdx, server.os);
    } else {
      const newRow = new Array(workingHeader.length).fill("");
      setVal(newRow, nameIdx, server.name);
      setVal(newRow, businessAreaIdx, server.businessArea);
      setVal(newRow, lobIdx, server.lob);
      setVal(newRow, commentIdx, server.comment);
      setVal(newRow, ownerIdx, server.owner);
      setVal(newRow, contactIdx, server.contact);
      setVal(newRow, osIdx, server.os);
      workingData.push(newRow);
    }

    const csvOutput = ctx.safeStringify(workingData);
    await ctx.writeAndEmit(path, csvOutput);
    ctx.performBackup("addServer");
    return true;
  } catch (e) {
    console.error("[ServerOperations] addServer error:", e);
    return false;
  }
}

/**
 * Remove a server by name
 */
export async function removeServer(
  ctx: FileContext,
  name: string
): Promise<boolean> {
  try {
    const path = join(ctx.rootDir, SERVER_FILES[0]);
    if (!existsSync(path)) return false;

    const contents = await fs.readFile(path, "utf-8");
    const data = await parseCsvAsync(contents);
    const workingData = data.map((row) => row.map((c) => desanitizeField(c)));

    if (workingData.length < 2) return false;

    const header = workingData[0].map((h) => String(h).toLowerCase());
    const nameIdx = header.findIndex((h) =>
      ["name", "server name", "vm-m"].includes(h)
    );

    if (nameIdx === -1) return false;

    const newData = [workingData[0]];
    let removed = false;

    for (let i = 1; i < workingData.length; i++) {
      if (
        workingData[i][nameIdx]?.trim().toLowerCase() === name.toLowerCase()
      ) {
        removed = true;
      } else {
        newData.push(workingData[i]);
      }
    }

    if (removed) {
      const csvOutput = ctx.safeStringify(newData);
      await ctx.writeAndEmit(path, csvOutput);
      ctx.performBackup("removeServer");
      return true;
    }
    return false;
  } catch (e) {
    console.error("[ServerOperations] removeServer error:", e);
    return false;
  }
}

/**
 * Import servers from an external CSV file, merging with existing data
 */
export async function importServersWithMapping(
  ctx: FileContext,
  sourcePath: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const targetPath = join(ctx.rootDir, SERVER_FILES[0]);

    // Read source first
    const sourceContent = await fs.readFile(sourcePath, "utf-8");
    const lines = sourceContent.split(/\r?\n/);
    if (lines.length === 0)
      return { success: false, message: "Empty source file" };

    // Check if current servers are dummy data
    if (await ctx.isDummyData(SERVER_FILES[0])) {
      console.log(
        "[ServerOperations] Detected dummy servers. Clearing before import."
      );
      try {
        await fs.unlink(targetPath);
      } catch (e) {
        console.error(
          "[ServerOperations] Failed to delete dummy servers file:",
          e
        );
      }
    }
    let headerLineIndex = -1;

    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      if (
        lines[i].toLowerCase().includes("vm-m") ||
        lines[i].toLowerCase().includes("server name") ||
        lines[i].toLowerCase().includes("name")
      ) {
        headerLineIndex = i;
        break;
      }
    }

    if (headerLineIndex === -1) {
      return {
        success: false,
        message:
          'Could not find "VM-M", "Server Name", or "Name" header in the first 20 lines.',
      };
    }

    const cleanContents = lines.slice(headerLineIndex).join("\n");
    const sourceDataRaw = await parseCsvAsync(cleanContents);
    const sourceData = sourceDataRaw.map((r) =>
      r.map((c) => desanitizeField(c))
    );

    if (sourceData.length < 2) {
      return {
        success: false,
        message: "File appears to be empty or missing data rows.",
      };
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

    const s_nameIdx = mapHeader(SERVER_COLUMN_ALIASES.name);
    const s_baIdx = mapHeader(SERVER_COLUMN_ALIASES.businessArea);
    const s_lobIdx = mapHeader(SERVER_COLUMN_ALIASES.lob);
    const s_commentIdx = mapHeader(SERVER_COLUMN_ALIASES.comment);
    const s_ownerIdx = mapHeader(SERVER_COLUMN_ALIASES.owner);
    const s_contactIdx = mapHeader(SERVER_COLUMN_ALIASES.contact);
    const s_osTypeIdx = mapHeader(SERVER_COLUMN_ALIASES.os);

    if (s_nameIdx === -1) {
      return {
        success: false,
        message: 'No "VM-M" or "Server Name" column found in the header.',
      };
    }

    let targetData: any[][] = [];

    // Load or Init Target with Standard Headers
    const STD_HEADERS = [
      "Name",
      "Business Area",
      "LOB",
      "Comment",
      "Owner",
      "IT Contact",
      "OS",
    ];

    if (existsSync(targetPath)) {
      const existing = await fs.readFile(targetPath, "utf-8");
      const dataRaw = await parseCsvAsync(existing);
      targetData = dataRaw.map((r) => r.map((c) => desanitizeField(c)));
    }

    if (targetData.length === 0) {
      targetData.push(STD_HEADERS);
    }

    const targetHeader = targetData[0].map((h) => String(h).toLowerCase());

    const ensureTargetCol = (name: string) => {
      let idx = targetHeader.findIndex((h) => h === name.toLowerCase());
      if (idx === -1) {
        targetHeader.push(name.toLowerCase());
        targetData[0].push(name); // Use proper case for display
        for (let i = 1; i < targetData.length; i++) targetData[i].push("");
        idx = targetHeader.length - 1;
      }
      return idx;
    };

    const t_nameIdx = ensureTargetCol("Name");
    const t_baIdx = ensureTargetCol("Business Area");
    const t_lobIdx = ensureTargetCol("LOB");
    const t_commentIdx = ensureTargetCol("Comment");
    const t_ownerIdx = ensureTargetCol("Owner");
    const t_contactIdx = ensureTargetCol("IT Contact");
    const t_osIdx = ensureTargetCol("OS");

    // Build server name -> row index map for O(1) lookups (instead of O(n) per server)
    const nameToRowIdx = new Map<string, number>();
    for (let i = 1; i < targetData.length; i++) {
      const existingName = targetData[i][t_nameIdx]?.trim().toLowerCase();
      if (existingName) {
        nameToRowIdx.set(existingName, i);
      }
    }

    for (const row of sourceRows) {
      const name = row[s_nameIdx]?.trim();
      if (!name) continue;

      // O(1) lookup using Map instead of O(n) loop
      const matchRowIdx = nameToRowIdx.get(name.toLowerCase());

      const getValue = (idx: number) =>
        idx !== -1 && row[idx] ? row[idx].trim() : "";

      if (matchRowIdx !== undefined) {
        const tRow = targetData[matchRowIdx];
        if (s_baIdx !== -1) tRow[t_baIdx] = getValue(s_baIdx);
        if (s_lobIdx !== -1) tRow[t_lobIdx] = getValue(s_lobIdx);
        if (s_commentIdx !== -1) tRow[t_commentIdx] = getValue(s_commentIdx);
        if (s_ownerIdx !== -1) tRow[t_ownerIdx] = getValue(s_ownerIdx);
        if (s_contactIdx !== -1) tRow[t_contactIdx] = getValue(s_contactIdx);
        if (s_osTypeIdx !== -1) tRow[t_osIdx] = getValue(s_osTypeIdx);
      } else {
        const newRow = new Array(targetData[0].length).fill("");
        newRow[t_nameIdx] = name;
        newRow[t_baIdx] = getValue(s_baIdx);
        newRow[t_lobIdx] = getValue(s_lobIdx);
        newRow[t_commentIdx] = getValue(s_commentIdx);
        newRow[t_ownerIdx] = getValue(s_ownerIdx);
        newRow[t_contactIdx] = getValue(s_contactIdx);
        newRow[t_osIdx] = getValue(s_osTypeIdx);
        targetData.push(newRow);
        // Add to map so subsequent duplicates in source can find it
        nameToRowIdx.set(name.toLowerCase(), targetData.length - 1);
      }
    }

    const csvOutput = ctx.safeStringify(targetData);
    await ctx.writeAndEmit(targetPath, csvOutput);
    ctx.performBackup("importServers");

    // Trigger cleanup after successful import
    await cleanupServerContacts(ctx);

    return { success: true };
  } catch (e: any) {
    console.error("[ServerOperations] importServersWithMapping error:", e);
    return { success: false, message: e.message };
  }
}

/**
 * Replace email addresses in server Owner/Contact fields with names from contacts.csv
 */
export async function cleanupServerContacts(ctx: FileContext): Promise<void> {
  console.log("[ServerOperations] Starting Server Contact Cleanup...");
  try {
    const servers = await parseServers(ctx);
    const contacts = await parseContacts(ctx);
    const path = join(ctx.rootDir, SERVER_FILES[0]);

    if (servers.length === 0 || contacts.length === 0) return;

    // Map Email -> Name
    const emailToName = new Map<string, string>();
    for (const c of contacts) {
      if (c.email && c.name) {
        emailToName.set(c.email.toLowerCase(), c.name);
      }
    }

    let changed = false;

    // Re-read file to get grid (since parseServers returns objects)
    const content = await fs.readFile(path, "utf-8");
    const dataRaw = await parseCsvAsync(content);
    const data = dataRaw.map((r) => r.map((c) => desanitizeField(c)));

    if (data.length < 2) return;

    const header = data[0].map((h: any) => String(h).toLowerCase().trim());
    const ownerIdx = header.findIndex(
      (h) => h === "owner" || h === "lob owner"
    );
    const contactIdx = header.findIndex(
      (h) => h === "it contact" || h === "it tech support contact"
    );

    if (ownerIdx === -1 && contactIdx === -1) return;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      const tryReplace = (idx: number) => {
        if (idx !== -1 && row[idx]) {
          const val = String(row[idx]).trim();
          if (val.includes("@")) {
            const match = emailToName.get(val.toLowerCase());
            if (match && match !== val) {
              row[idx] = match;
              changed = true;
            }
          }
        }
      };

      tryReplace(ownerIdx);
      tryReplace(contactIdx);
    }

    if (changed) {
      const csvOutput = ctx.safeStringify(data);
      await ctx.writeAndEmit(path, csvOutput);
      ctx.performBackup("cleanupServerContacts");
      console.log(
        "[ServerOperations] Server contacts cleanup completed. Updated file."
      );
    } else {
      console.log("[ServerOperations] No server contacts needed cleanup.");
    }
  } catch (e) {
    console.error("[ServerOperations] Error in cleanupServerContacts:", e);
  }
}
