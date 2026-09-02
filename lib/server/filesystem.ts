import path from 'path';
import fs from 'fs';
import { eventBus } from './event-bus';
import { getOutputDir, ensureDir } from './settings';

export function createZip(
  files: { path: string; name: string }[],
  zipName: string,
  outputDir?: string
): Promise<{ success: boolean; zipPath?: string; error?: string }> {
  return new Promise((resolve) => {
    const dir = outputDir || getOutputDir();
    ensureDir(dir);
    const zipPath = path.join(dir, zipName);

    try {
      // Use eval to bypass webpack's static analysis for this server-only dependency
      const archiverModule = eval('require("archiver")');
      const output = fs.createWriteStream(zipPath);
      const archive = archiverModule('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        eventBus.log('SUCCESS', `ZIP created: ${zipName} (${archive.pointer()} bytes)`);
        resolve({ success: true, zipPath });
      });

      archive.on('error', (err) => {
        eventBus.log('ERROR', `ZIP creation failed: ${err.message}`);
        resolve({ success: false, error: err.message });
      });

      archive.pipe(output);

      for (const file of files) {
        if (fs.existsSync(file.path)) {
          archive.file(file.path, { name: file.name });
        } else {
          eventBus.log('WARNING', `File not found for ZIP: ${file.path}`);
        }
      }

      archive.finalize();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      eventBus.log('ERROR', `ZIP creation error: ${msg}`);
      resolve({ success: false, error: msg });
    }
  });
}

export function openFile(filePath: string): { success: boolean; error?: string } {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }
    const { exec } = require('child_process');
    const platform = process.platform;
    let cmd: string;
    if (platform === 'win32') {
      cmd = `start "" "${filePath}"`;
    } else if (platform === 'darwin') {
      cmd = `open "${filePath}"`;
    } else {
      cmd = `xdg-open "${filePath}"`;
    }
    exec(cmd, (err: Error | null) => {
      if (err) {
        eventBus.log('ERROR', `Failed to open file: ${err.message}`);
      }
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function openFolder(folderPath: string): { success: boolean; error?: string } {
  try {
    if (!fs.existsSync(folderPath)) {
      return { success: false, error: 'Folder not found' };
    }
    const { exec } = require('child_process');
    const platform = process.platform;
    let cmd: string;
    if (platform === 'win32') {
      cmd = `explorer "${folderPath}"`;
    } else if (platform === 'darwin') {
      cmd = `open "${folderPath}"`;
    } else {
      cmd = `xdg-open "${folderPath}"`;
    }
    exec(cmd, (err: Error | null) => {
      if (err) {
        eventBus.log('ERROR', `Failed to open folder: ${err.message}`);
      }
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function deleteFile(filePath: string): { success: boolean; error?: string } {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function findDownloadedFile(outputDir: string, baseName: string): string | null {
  try {
    const files = fs.readdirSync(outputDir);
    // Try exact match first, then prefix match
    const exact = files.find((f) => f.startsWith(baseName));
    if (exact) return path.join(outputDir, exact);
    return null;
  } catch {
    return null;
  }
}
