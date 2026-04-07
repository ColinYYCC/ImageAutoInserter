import os from 'os';
import path from 'path';
import fs from 'fs';
import { platform } from '../../core/platform';
import { securityBookmarkManager } from './security-bookmark';

export async function checkAndRequestFileAccess(filePath?: string): Promise<boolean> {
  if (platform.isWindows()) {
    return checkWindowsFileAccess(filePath);
  }

  if (platform.isMac()) {
    return checkMacOSFileAccess(filePath);
  }

  return true;
}

async function checkWindowsFileAccess(filePath?: string): Promise<boolean> {
  if (!filePath) return true;

  try {
    await fs.promises.access(filePath, fs.constants.R_OK | fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function checkMacOSFileAccess(filePath?: string): Promise<boolean> {
  if (filePath) {
    try {
      await fs.promises.access(filePath, fs.constants.R_OK | fs.constants.W_OK);
      return true;
    } catch {
      const hasBookmark = await securityBookmarkManager.requestFolderAccess(path.dirname(filePath));
      if (hasBookmark) {
        try {
          await fs.promises.access(filePath, fs.constants.R_OK | fs.constants.W_OK);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }

  return true;
}

export async function handleFileAccessError(error: Error): Promise<boolean> {
  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('permission denied') ||
      errorMessage.includes('eacces') ||
      errorMessage.includes('operation not permitted') ||
      errorMessage.includes(' access denied ')) {

    return true;
  }

  if (errorMessage.includes('enoent') || errorMessage.includes('no such file') || errorMessage.includes('not found')) {
    return true;
  }

  return false;
}

export function getRecommendedWorkingDir(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, 'Documents');
}

export async function checkFolderAccessSilent(folderPath: string): Promise<boolean> {
  try {
    const testFile = path.join(folderPath, `.access_test_${Date.now()}`);
    await fs.promises.writeFile(testFile, 'test');
    await fs.promises.unlink(testFile);
    return true;
  } catch {
    return false;
  }
}

export async function ensureFolderAccess(folderPath: string): Promise<boolean> {
  const hasAccess = await checkFolderAccessSilent(folderPath);
  if (hasAccess) {
    return true;
  }

  if (platform.isMac()) {
    const bookmarkAccess = await securityBookmarkManager.requestFolderAccess(folderPath);
    if (bookmarkAccess) {
      const recheck = await checkFolderAccessSilent(folderPath);
      if (recheck) {
        return true;
      }
    }
  }

  return false;
}
