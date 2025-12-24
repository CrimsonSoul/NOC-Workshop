/**
 * OnCallOperations - All on-call related CRUD operations
 *
 * Handles parsing, updating, removing on-call team assignments.
 */

import { join } from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import type { OnCallRow } from "@shared/ipc";
import { ONCALL_COLUMNS, STD_ONCALL_HEADERS } from "@shared/csvTypes";
import { parseCsvAsync, desanitizeField } from "../csvUtils";
import { FileContext, ONCALL_FILES } from "./FileContext";

/**
 * Parse oncall.csv into an array of OnCallRow objects
 * Handles migration from legacy format (Primary/Backup columns) to new format
 */
export async function parseOnCall(ctx: FileContext): Promise<OnCallRow[]> {
  let path = ctx.resolveExistingFile(ONCALL_FILES);

  // Auto-create if missing
  if (!path) {
    console.log("[OnCallOperations] oncall.csv not found. Creating default...");
    path = join(ctx.rootDir, ONCALL_FILES[0]);
    const defaultContent = STD_ONCALL_HEADERS.join(",") + "\n";
    try {
      await fs.writeFile(path, defaultContent, "utf-8");
      console.log(`[OnCallOperations] Created ${path}`);
    } catch (e) {
      console.error("[OnCallOperations] Failed to create oncall.csv:", e);
      return [];
    }
  }

  try {
    const contents = await fs.readFile(path, "utf-8");
    const data = (await parseCsvAsync(contents)) as string[][];

    if (data.length < 2) return [];

    const header = data[0].map((h: string) =>
      desanitizeField(h.trim().toLowerCase())
    );
    const rows = data.slice(1);

    // MIGRATION DETECTION
    // Check for old headers
    const isLegacy = header.includes("primary") && header.includes("backup");

    if (isLegacy) {
      console.log(
        "[OnCallOperations] Detected legacy on-call format. Migrating..."
      );
      // Legacy Columns: Team, Primary, Backup, Label
      const teamIdx = header.indexOf("team");
      const primaryIdx = header.indexOf("primary");
      const backupIdx = header.indexOf("backup");
      const labelIdx = header.indexOf("label");

      if (teamIdx === -1) return [];

      const migratedRows: OnCallRow[] = [];

      for (const row of rows) {
        const team = desanitizeField(row[teamIdx]);
        const primary =
          primaryIdx !== -1 ? desanitizeField(row[primaryIdx]) : "";
        const backup = backupIdx !== -1 ? desanitizeField(row[backupIdx]) : "";
        const label =
          labelIdx !== -1 ? desanitizeField(row[labelIdx]) : "BACKUP";

        if (team) {
          if (primary) {
            migratedRows.push({
              id: randomUUID(),
              team,
              role: "Primary",
              name: "", // Will be resolved by frontend match if possible
              contact: primary,
            });
          }
          if (backup) {
            migratedRows.push({
              id: randomUUID(),
              team,
              role: label || "Backup",
              name: "",
              contact: backup,
            });
          }
        }
      }

      // Save immediately to complete migration
      await saveAllOnCall(ctx, migratedRows);
      return migratedRows;
    }

    const teamIdx = header.indexOf(ONCALL_COLUMNS.TEAM.toLowerCase());
    const roleIdx = header.indexOf(ONCALL_COLUMNS.ROLE.toLowerCase());
    const nameIdx = header.indexOf(ONCALL_COLUMNS.NAME.toLowerCase());
    const contactIdx = header.findIndex(
      (h) =>
        h === ONCALL_COLUMNS.CONTACT.toLowerCase() ||
        h === "email" ||
        h === "phone"
    );
    const timeWindowIdx = header.findIndex(
      (h) =>
        h === "time window" ||
        h === "timewindow" ||
        h === "shift" ||
        h === "hours"
    );

    return rows
      .map((row: string[]) => ({
        id: randomUUID(),
        team: desanitizeField(row[teamIdx] || ""),
        role: roleIdx !== -1 ? desanitizeField(row[roleIdx] || "") : "",
        name: nameIdx !== -1 ? desanitizeField(row[nameIdx] || "") : "",
        contact:
          contactIdx !== -1 ? desanitizeField(row[contactIdx] || "") : "",
        timeWindow:
          timeWindowIdx !== -1 ? desanitizeField(row[timeWindowIdx] || "") : "",
      }))
      .filter((r) => r.team); // Filter out empty teams
  } catch (e) {
    console.error("[OnCallOperations] Error parsing oncall:", e);
    return [];
  }
}

/**
 * Update all rows for a specific team
 * Performs a full read-modify-write to preserve other teams' data
 */
export async function updateOnCallTeam(
  ctx: FileContext,
  team: string,
  rows: OnCallRow[]
): Promise<boolean> {
  try {
    // We do a full read-modify-write here to ensure we don't blow away other teams
    const allRows = await parseOnCall(ctx);

    // Filter out ANY rows for this team
    const otherRows = allRows.filter((r) => r.team !== team);

    // Add the new rows
    const merged = [...otherRows, ...rows];

    return await saveAllOnCall(ctx, merged);
  } catch (e) {
    console.error("[OnCallOperations] updateOnCallTeam error:", e);
    return false;
  }
}

/**
 * Remove all rows for a specific team
 */
export async function removeOnCallTeam(
  ctx: FileContext,
  team: string
): Promise<boolean> {
  try {
    const path = join(ctx.rootDir, ONCALL_FILES[0]);
    if (!existsSync(path)) return false;

    const contents = await fs.readFile(path, "utf-8");
    const data = await parseCsvAsync(contents);
    const workingData = data.map((row) =>
      row.map((cell) => desanitizeField(cell))
    );

    if (workingData.length < 2) return false;

    const header = workingData[0].map((h) => String(h).toLowerCase());
    const teamIdx = header.indexOf(ONCALL_COLUMNS.TEAM.toLowerCase());
    if (teamIdx === -1) return false;

    const newData = [workingData[0]];
    let removed = false;
    for (let i = 1; i < workingData.length; i++) {
      if (workingData[i][teamIdx] !== team) {
        newData.push(workingData[i]);
      } else {
        removed = true;
      }
    }

    if (removed) {
      const csvOutput = ctx.safeStringify(newData);
      await ctx.writeAndEmit(path, csvOutput);
      ctx.performBackup("removeOnCallTeam");
      return true;
    }
    return false;
  } catch (e) {
    console.error("[OnCallOperations] removeOnCallTeam error:", e);
    return false;
  }
}

/**
 * Rename a team across all its on-call rows
 */
export async function renameOnCallTeam(
  ctx: FileContext,
  oldName: string,
  newName: string
): Promise<boolean> {
  try {
    const path = join(ctx.rootDir, ONCALL_FILES[0]);
    if (!existsSync(path)) return false;

    const contents = await fs.readFile(path, "utf-8");
    const data = await parseCsvAsync(contents);
    const workingData = data.map((row) =>
      row.map((cell) => desanitizeField(cell))
    );

    if (workingData.length < 2) return false;

    const header = workingData[0].map((h) => String(h).toLowerCase());
    const teamIdx = header.indexOf(ONCALL_COLUMNS.TEAM.toLowerCase());
    if (teamIdx === -1) return false;

    let renamed = false;
    for (let i = 1; i < workingData.length; i++) {
      if (workingData[i][teamIdx] === oldName) {
        workingData[i][teamIdx] = newName;
        renamed = true;
      }
    }

    if (renamed) {
      const csvOutput = ctx.safeStringify(workingData);
      await ctx.writeAndEmit(path, csvOutput);
      ctx.performBackup("renameOnCallTeam");
      return true;
    }
    return false;
  } catch (e) {
    console.error("[OnCallOperations] renameOnCallTeam error:", e);
    return false;
  }
}

/**
 * Save all on-call rows to file (full overwrite)
 */
export async function saveAllOnCall(
  ctx: FileContext,
  rows: OnCallRow[]
): Promise<boolean> {
  try {
    const path = join(ctx.rootDir, ONCALL_FILES[0]);

    const csvData = [
      [...STD_ONCALL_HEADERS, "Time Window"], // Header row: Team, Role, Name, Contact, Time Window
      ...rows.map((r) => [
        r.team,
        r.role,
        r.name,
        r.contact,
        r.timeWindow || "",
      ]),
    ];

    const csvOutput = ctx.safeStringify(csvData);
    await ctx.writeAndEmit(path, csvOutput);
    ctx.performBackup("saveAllOnCall");
    return true;
  } catch (e) {
    console.error("[OnCallOperations] saveAllOnCall error:", e);
    return false;
  }
}
