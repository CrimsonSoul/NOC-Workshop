import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const releaseDir = path.join(projectRoot, 'release');
const resourcesDir = path.join(projectRoot, 'resources');

async function ensureReleaseExists() {
  try {
    await fs.access(releaseDir);
  } catch {
    throw new Error('Release output not found; run the Windows build first.');
  }
}

async function collectExecutables() {
  const entries = await fs.readdir(releaseDir);
  return entries.filter((entry) => entry.toLowerCase().endsWith('.exe'));
}

async function copyDataFolder() {
  const dataDir = path.join(releaseDir, 'data');
  await fs.mkdir(dataDir, { recursive: true });

  let resourceEntries = [];
  try {
    resourceEntries = await fs.readdir(resourcesDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read resources directory: ${message}`);
  }

  const dataFiles = resourceEntries.filter((entry) =>
    entry.match(/\.(csv|xlsx)$/i)
  );

  await Promise.all(
    dataFiles.map((entry) =>
      fs.copyFile(path.join(resourcesDir, entry), path.join(dataDir, entry))
    )
  );
}

async function cleanRelease(executables) {
  const keep = new Set(['data', ...executables]);
  const entries = await fs.readdir(releaseDir);

  await Promise.all(
    entries
      .filter((entry) => !keep.has(entry))
      .map((entry) => fs.rm(path.join(releaseDir, entry), { recursive: true, force: true }))
  );
}

async function main() {
  await ensureReleaseExists();
  const executables = await collectExecutables();

  if (executables.length === 0) {
    throw new Error('No Windows executable found in the release output.');
  }

  await copyDataFolder();
  await cleanRelease(executables);
  console.log(`Windows release trimmed to executables and data folder. Kept: ${executables.join(', ')}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
