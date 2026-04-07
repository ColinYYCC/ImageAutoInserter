/**
 * Windows 系统服务实现
 * 处理 Windows 特定系统操作
 */

import { shell, Notification } from 'electron';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { SystemService, MediaAccessStatus, PlatformInfo } from '../interfaces';

export class WindowsSystemService implements SystemService {
  getPlatformInfo(): PlatformInfo {
    return {
      platform: 'win32',
      isWindows: true,
      isMac: false,
      userName: os.userInfo().username,
      homeDir: os.homedir(),
      tmpDir: os.tmpdir(),
      defaultFonts: this.getSystemFonts(),
    };
  }

  getSystemFonts(): string[] {
    const commonFonts = [
      'Arial', 'Calibri', 'Cambria', 'Comic Sans MS', 'Consolas',
      'Courier New', 'Georgia', 'Impact', 'Lucida Console',
      'Microsoft Sans Serif', 'Segoe UI', 'Tahoma', 'Times New Roman',
      'Trebuchet MS', 'Verdana',
    ];

    try {
      const fontDir = 'C:\\Windows\\Fonts';
      if (fs.existsSync(fontDir)) {
        const files = fs.readdirSync(fontDir);
        const fontNames = files
          .filter(f => f.endsWith('.ttf') || f.endsWith('.otf'))
          .map(f => path.basename(f, path.extname(f)));
        return [...new Set([...commonFonts, ...fontNames])];
      }
    } catch {
      console.warn('[WindowsSystem] 获取字体列表失败');
    }

    return commonFonts;
  }

  async isSsd(): Promise<boolean> {
    try {
      const tempDir = os.tmpdir();
      const testFile = path.join(tempDir, 'ssd_test_tmp');
      const testSize = 100 * 1024 * 1024;

      const startTime = Date.now();
      fs.writeFileSync(testFile, Buffer.alloc(testSize));
      const writeTime = Date.now() - startTime;
      fs.unlinkSync(testFile);

      const writeSpeedMbps = (testSize / (1024 * 1024)) / (writeTime / 1000);
      return writeSpeedMbps > 50;
    } catch {
      console.warn('[WindowsSystem] SSD 检测失败');
      return true;
    }
  }

  async getMediaAccessStatus(): Promise<MediaAccessStatus> {
    return {
      microphone: false,
      camera: false,
      file: false,
    };
  }

  async openFileLocation(p: string): Promise<void> {
    try {
      shell.showItemInFolder(p);
    } catch (error) {
      console.warn(`[WindowsSystem] 打开文件位置失败: ${p}`);
      throw error;
    }
  }

  async showNotification(title: string, body: string): Promise<void> {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  }
}
