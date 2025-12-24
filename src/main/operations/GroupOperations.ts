/**
 * GroupOperations - All group-related CRUD operations
 *
 * Handles parsing, adding, removing, renaming groups and managing membership.
 */

import { join } from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import type { GroupMap } from "@shared/ipc";
import { parseCsvAsync, desanitizeField } from "../csvUtils";
import { FileContext, GROUP_FILES } from "./FileContext";

/**
 * Parse groups.csv into a GroupMap
 * Groups are stored column-wise: header = group name, cells below = member emails
 */
export async function parseGroups(ctx: FileContext): Promise<GroupMap> {
  const path = ctx.resolveExistingFile(GROUP_FILES);
  if (!path) return {};

  try {
    const contents = await fs.readFile(path, "utf-8");
    const data = await parseCsvAsync(contents);

    if (!data || data.length === 0) return {};

    const groups: GroupMap = {};
    const maxCols = data[0].length;
    for (let col = 0; col < maxCols; col++) {
      const groupName = desanitizeField(data[0][col]);
      if (!groupName) continue;
      const emails: string[] = [];
      for (let row = 1; row < data.length; row++) {
        const email = desanitizeField(data[row][col]);
        if (email) emails.push(String(email).trim());
      }
      groups[String(groupName).trim()] = emails;
    }
    return groups;
  } catch (e) {
    console.error("Error parsing groups:", e);
    return {};
  }
}

/**
 * Add a new group column to groups.csv
 */
export async function addGroup(
  ctx: FileContext,
  groupName: string
): Promise<boolean> {
  try {
    const path = join(ctx.rootDir, GROUP_FILES[0]);
    let contents = "";
    if (existsSync(path)) {
      contents = await fs.readFile(path, "utf-8");
    }

    const data = (await parseCsvAsync(contents)) as string[][];
    const workingData = data.map((row: string[]) =>
      row.map((c: string) => desanitizeField(c))
    );

    if (workingData.length === 0) {
      workingData.push([groupName]);
    } else {
      if (workingData[0].includes(groupName)) return true;

      workingData[0].push(groupName);
      for (let i = 1; i < workingData.length; i++) {
        workingData[i].push("");
      }
    }

    const csvOutput = ctx.safeStringify(workingData);
    await ctx.writeAndEmit(path, csvOutput);
    ctx.performBackup("addGroup");
    return true;
  } catch (e) {
    console.error("[GroupOperations] addGroup error:", e);
    return false;
  }
}

/**
 * Update group membership - add or remove an email from a group
 */
export async function updateGroupMembership(
  ctx: FileContext,
  groupName: string,
  email: string,
  remove: boolean
): Promise<boolean> {
  try {
    const path = join(ctx.rootDir, GROUP_FILES[0]);
    if (!existsSync(path)) return false;

    const contents = await fs.readFile(path, "utf-8");
    const data = (await parseCsvAsync(contents)) as string[][];
    const workingData = data.map((row: string[]) =>
      row.map((c: string) => desanitizeField(c))
    );

    if (workingData.length === 0) return false;

    const groupIdx = workingData[0].indexOf(groupName);
    if (groupIdx === -1) return false;

    let rowIndex = -1;
    for (let i = 1; i < workingData.length; i++) {
      if (workingData[i][groupIdx] === email) {
        rowIndex = i;
        break;
      }
    }

    if (remove) {
      if (rowIndex !== -1) {
        workingData[rowIndex][groupIdx] = "";
        for (let i = rowIndex; i < workingData.length - 1; i++) {
          workingData[i][groupIdx] = workingData[i + 1][groupIdx];
        }
        workingData[workingData.length - 1][groupIdx] = "";
      }
    } else {
      if (rowIndex !== -1) return true;

      let added = false;
      for (let i = 1; i < workingData.length; i++) {
        if (!workingData[i][groupIdx]) {
          workingData[i][groupIdx] = email;
          added = true;
          break;
        }
      }
      if (!added) {
        const newRow = new Array(workingData[0].length).fill("");
        newRow[groupIdx] = email;
        workingData.push(newRow);
      }
    }

    const csvOutput = ctx.safeStringify(workingData);
    await ctx.writeAndEmit(path, csvOutput);
    ctx.performBackup("updateGroupMembership");
    return true;
  } catch (e) {
    console.error("[GroupOperations] updateGroupMembership error:", e);
    return false;
  }
}

/**
 * Remove an entire group column from groups.csv
 */
export async function removeGroup(
  ctx: FileContext,
  groupName: string
): Promise<boolean> {
  try {
    const path = join(ctx.rootDir, GROUP_FILES[0]);
    if (!existsSync(path)) return false;

    const contents = await fs.readFile(path, "utf-8");
    const data = (await parseCsvAsync(contents)) as string[][];
    const workingData = data.map((row: string[]) =>
      row.map((c: string) => desanitizeField(c))
    );

    if (workingData.length === 0) return false;

    const groupIdx = workingData[0].indexOf(groupName);
    if (groupIdx === -1) return false;

    for (let i = 0; i < workingData.length; i++) {
      workingData[i].splice(groupIdx, 1);
    }

    const csvOutput = ctx.safeStringify(workingData);
    await ctx.writeAndEmit(path, csvOutput);
    ctx.performBackup("removeGroup");
    return true;
  } catch (e) {
    console.error("[GroupOperations] removeGroup error:", e);
    return false;
  }
}

/**
 * Rename a group column header
 * If newName already exists, merges the groups
 */
export async function renameGroup(
  ctx: FileContext,
  oldName: string,
  newName: string
): Promise<boolean> {
  try {
    const path = join(ctx.rootDir, GROUP_FILES[0]);
    if (!existsSync(path)) return false;

    const contents = await fs.readFile(path, "utf-8");
    const data = (await parseCsvAsync(contents)) as string[][];
    const workingData = data.map((row: string[]) =>
      row.map((c: string) => desanitizeField(c))
    );

    if (workingData.length === 0) return false;

    const groupIdx = workingData[0].indexOf(oldName);
    if (groupIdx === -1) return false;

    if (workingData[0].includes(newName)) {
      const targetIdx = workingData[0].indexOf(newName);
      for (let i = 1; i < workingData.length; i++) {
        const email = workingData[i][groupIdx];
        if (email) {
          if (!workingData[i][targetIdx]) {
            workingData[i][targetIdx] = email;
          }
        }
      }
      for (let i = 0; i < workingData.length; i++) {
        workingData[i].splice(groupIdx, 1);
      }
    } else {
      workingData[0][groupIdx] = newName;
    }

    const csvOutput = ctx.safeStringify(workingData);
    await ctx.writeAndEmit(path, csvOutput);
    ctx.performBackup("renameGroup");
    return true;
  } catch (e) {
    console.error("[GroupOperations] renameGroup error:", e);
    return false;
  }
}

/**
 * Import groups from an external CSV file, merging with existing data
 */
export async function importGroupsWithMapping(
  ctx: FileContext,
  sourcePath: string
): Promise<boolean> {
  try {
    const targetPath = join(ctx.rootDir, GROUP_FILES[0]);

    // Read source first to ensure validity
    const sourceContent = await fs.readFile(sourcePath, "utf-8");
    const sourceDataRaw = await parseCsvAsync(sourceContent);
    const sourceData = sourceDataRaw.map((r) =>
      r.map((c) => desanitizeField(c))
    );
    if (sourceData.length === 0) return false;

    // Check if current groups are dummy data
    if (await ctx.isDummyData(GROUP_FILES[0])) {
      console.log(
        "[GroupOperations] Detected dummy groups. Clearing before import."
      );
      try {
        await fs.unlink(targetPath);
      } catch (e) {
        console.error(
          "[GroupOperations] Failed to delete dummy groups file:",
          e
        );
      }
    }

    const sourceHeader = sourceData[0].map((h: any) => String(h).trim());
    const sourceRows = sourceData.slice(1);

    let targetData: any[][] = [];
    const existingContent = existsSync(targetPath)
      ? await fs.readFile(targetPath, "utf-8")
      : "";

    if (existsSync(targetPath)) {
      const rawTarget = await parseCsvAsync(existingContent);
      targetData = rawTarget.map((r) => r.map((c) => desanitizeField(c)));
    }

    if (targetData.length === 0) {
      targetData.push([]);
    }

    const targetHeader = targetData[0];
    const getTargetGroupIdx = (groupName: string) => {
      let idx = targetHeader.findIndex((h: string) => h === groupName);
      if (idx === -1) {
        targetHeader.push(groupName);
        for (let i = 1; i < targetData.length; i++) {
          targetData[i].push("");
        }
        idx = targetHeader.length - 1;
      }
      return idx;
    };

    // Pre-build empty slot index per column for O(1) insertion lookups
    const emptySlotsByColumn = new Map<number, number[]>();

    for (let col = 0; col < sourceHeader.length; col++) {
      const groupName = sourceHeader[col];
      if (!groupName) continue;

      const targetColIdx = getTargetGroupIdx(groupName);

      // Collect source emails using Set for O(1) duplicate check
      const sourceEmails = new Set<string>();
      for (const row of sourceRows) {
        const email = row[col];
        if (email && String(email).trim()) {
          sourceEmails.add(String(email).trim());
        }
      }

      // Build existing emails Set and empty slots array in a single pass
      const existingEmails = new Set<string>();
      const emptySlots: number[] = [];
      for (let i = 1; i < targetData.length; i++) {
        const email = targetData[i][targetColIdx];
        if (email && String(email).trim()) {
          existingEmails.add(String(email).trim());
        } else {
          emptySlots.push(i);
        }
      }
      emptySlotsByColumn.set(targetColIdx, emptySlots);

      // Insert new emails using pre-computed empty slots (O(1) per insertion)
      let slotIndex = 0;
      for (const email of sourceEmails) {
        if (!existingEmails.has(email)) {
          if (slotIndex < emptySlots.length) {
            // Use pre-computed empty slot
            targetData[emptySlots[slotIndex]][targetColIdx] = email;
            slotIndex++;
          } else {
            // Need to add new row
            const newRow = new Array(targetHeader.length).fill("");
            newRow[targetColIdx] = email;
            targetData.push(newRow);
          }
        }
      }
    }

    const csvOutput = ctx.safeStringify(targetData);
    await ctx.writeAndEmit(targetPath, csvOutput);
    ctx.performBackup("importGroups");
    return true;
  } catch (e) {
    console.error("[GroupOperations] importGroupsWithMapping error:", e);
    return false;
  }
}
