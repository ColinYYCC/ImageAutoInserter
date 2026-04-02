import { dialog, systemPreferences } from 'electron';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { isMac, isWindows } from '../platform';

export async function checkAndRequestFileAccess(filePath?: string): Promise<boolean> {
  if (isWindows()) {
    return checkWindowsFileAccess(filePath);
  }

  if (isMac()) {
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
    await dialog.showMessageBox({
      type: 'warning',
      title: '文件权限不足',
      message: '无法访问该文件',
      detail: '请检查文件是否被其他程序占用，或尝试以管理员身份运行应用程序。',
      buttons: ['确定'],
    });
    return false;
  }
}

async function checkMacOSFileAccess(filePath?: string): Promise<boolean> {
  if (filePath) {
    try {
      await fs.promises.access(filePath, fs.constants.R_OK | fs.constants.W_OK);
      return true;
    } catch {
      const result = await dialog.showMessageBox({
        type: 'info',
        title: '权限说明',
        message: '首次使用需要文件访问权限',
        detail: '本应用需要访问您选择的 Excel 文件和图片文件夹。请在接下来的系统对话框中点击"允许"。',
        buttons: ['我知道了', '取消'],
        defaultId: 0,
      });

      if (result.response === 1) {
        return false;
      }
    }
  }

  if (typeof systemPreferences.getMediaAccessStatus === 'function') {
    try {
      const mediaStatus = systemPreferences.getMediaAccessStatus('file://' as 'microphone' | 'camera' | 'screen');
      if (mediaStatus === 'denied' || mediaStatus === 'restricted') {
        await dialog.showMessageBox({
          type: 'warning',
          title: '权限不足',
          message: '磁盘访问权限被拒绝',
          detail: '请在系统偏好设置 > 安全性与隐私 > 隐私 > 完全磁盘访问权限中添加本应用。',
          buttons: ['确定'],
        });
        return false;
      }
    } catch {
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

    if (isWindows()) {
      await dialog.showMessageBox({
        type: 'warning',
        title: '无法访问文件',
        message: '没有权限访问该位置',
        detail: '请检查文件是否被其他程序占用，或尝试以管理员身份运行应用程序。',
        buttons: ['确定'],
      });
    } else {
      await dialog.showMessageBox({
        type: 'warning',
        title: '无法访问文件',
        message: '没有权限访问该位置',
        detail: '请在系统偏好设置中授予应用程序完全磁盘访问权限。',
        buttons: ['确定'],
      });
    }

    return true;
  }

  if (errorMessage.includes('enoent') || errorMessage.includes('no such file') || errorMessage.includes('not found')) {
    await dialog.showMessageBox({
      type: 'error',
      title: '文件不存在',
      message: '找不到指定的文件',
      detail: '请检查文件路径是否正确，文件是否已被移动或删除。',
      buttons: ['确定'],
    });

    return true;
  }

  return false;
}

export function getRecommendedWorkingDir(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, 'Documents');
}
