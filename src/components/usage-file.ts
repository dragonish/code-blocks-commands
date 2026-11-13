import { App, normalizePath } from "obsidian";
import { isUsedCountEntry } from "./usage";

/** Name of the file holding usage counters when they are stored separately. */
export const USAGE_FILE_NAME = "usage.json";

/**
 * Resolve the in-vault path of the usage file. Deriving the path from
 * `vault.configDir` keeps it correct when the configuration folder is renamed.
 */
export function getUsageFilePath(app: App, pluginId: string): string {
  return normalizePath(
    `${app.vault.configDir}/plugins/${pluginId}/${USAGE_FILE_NAME}`,
  );
}

/**
 * Parse the usage file contents.
 * @returns The counters, or `null` when the contents are unusable so callers
 * can fall back to the records kept in `data.json`.
 */
function parseUsage(raw: string): UsedCount | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error("Failed to parse the usage file.", error);
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const entries = Object.entries(parsed);
  const usedCount: UsedCount = {};
  for (const [markup, value] of entries) {
    if (!markup || !isUsedCountEntry(value) || !(value.count > 0)) {
      continue;
    }
    usedCount[markup] = {
      count: value.count,
      lastUsed: value.lastUsed > 0 ? value.lastUsed : 0,
    };
  }

  //? A file that exists but holds nothing recognizable is treated as corrupt,
  //? otherwise the records in data.json would be silently discarded.
  if (entries.length > 0 && Object.keys(usedCount).length === 0) {
    return null;
  }
  return usedCount;
}

export async function readUsageFile(
  app: App,
  path: string,
): Promise<UsedCount | null> {
  const adapter = app.vault.adapter;
  try {
    if (!(await adapter.exists(path))) {
      return null;
    }
    return parseUsage(await adapter.read(path));
  } catch (error) {
    console.error(`Failed to read the usage file at ${path}.`, error);
    return null;
  }
}

/**
 * @returns Whether the counters were written. Failures are logged instead of
 * thrown so a read-only vault cannot break the plugin lifecycle.
 */
export async function writeUsageFile(
  app: App,
  path: string,
  usedCount: UsedCount,
): Promise<boolean> {
  const adapter = app.vault.adapter;
  try {
    const folder = path.slice(0, path.lastIndexOf("/"));
    if (folder && !(await adapter.exists(folder))) {
      await adapter.mkdir(folder);
    }
    await adapter.write(path, JSON.stringify(usedCount, null, 2));
    return true;
  } catch (error) {
    console.error(`Failed to write the usage file at ${path}.`, error);
    return false;
  }
}

/**
 * Merge two counter maps, keeping the newer record of each markup. Used when
 * both `data.json` and the usage file hold counters, which can happen after a
 * failed write or a crash between the two writes.
 */
export function mergeUsageCount(a: UsedCount, b: UsedCount): UsedCount {
  const merged: UsedCount = { ...a };
  for (const [markup, entry] of Object.entries(b)) {
    const existing = merged[markup];
    if (
      !existing ||
      entry.lastUsed > existing.lastUsed ||
      (entry.lastUsed === existing.lastUsed && entry.count > existing.count)
    ) {
      merged[markup] = entry;
    }
  }
  return merged;
}

export async function removeUsageFile(app: App, path: string): Promise<void> {
  const adapter = app.vault.adapter;
  try {
    if (await adapter.exists(path)) {
      await adapter.remove(path);
    }
  } catch (error) {
    console.error(`Failed to remove the usage file at ${path}.`, error);
  }
}
