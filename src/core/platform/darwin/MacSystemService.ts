/**
 * macOS 系统服务实现
 * 处理 macOS 特定系统操作
 */

import { shell, Notification } from 'electron';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { SystemService, MediaAccessStatus, PlatformInfo } from '../interfaces';

export class MacSystemService implements SystemService {
  getPlatformInfo(): PlatformInfo {
    return {
      platform: 'darwin',
      isWindows: false,
      isMac: true,
      userName: os.userInfo().username,
      homeDir: os.homedir(),
      tmpDir: os.tmpdir(),
      defaultFonts: this.getSystemFonts(),
    };
  }

  getSystemFonts(): string[] {
    const commonFonts = [
      'Arial', 'Helvetica', 'Helvetica Neue', 'Times New Roman', 'Georgia',
      'Verdana', 'Geneva', 'Courier New', 'Monaco', 'Menlo',
      'American Typewriter', 'Apple SD Gothic Neo', 'Avenir', 'Avenir Next',
      'Baskerville', 'Big Caslon', 'Brush Script MT', 'Chalkboard',
      'Comic Sans MS', 'Copperplate', 'Futura', 'Gill Sans', 'Grotesque',
    ];

    try {
      const fontDir = '/System/Library/Fonts';
      if (fs.existsSync(fontDir)) {
        const files = fs.readdirSync(fontDir);
        const fontNames = files
          .filter(f => f.endsWith('.ttf') || f.endsWith('.otf'))
          .map(f => path.basename(f, path.extname(f)));
        return [...new Set([...commonFonts, ...fontNames])];
      }
    } catch {
      console.warn('[MacSystem] 获取字体列表失败');
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
      console.warn('[MacSystem] SSD 检测失败');
      return true;
    }
  }

  async getMediaAccessStatus(): Promise<MediaAccessStatus> {
    try {
      const { systemPreferences } = require('electron');
      const microphone = systemPreferences.getMediaAccessStatus('microphone');
      const camera = systemPreferences.getMediaAccessStatus('camera');

      return {
        microphone: microphone === 'granted',
        camera: camera === 'granted',
        file: true,
      };
    } catch {
      console.warn('[MacSystem] 获取媒体权限失败');
      return {
        microphone: false,
        camera: false,
        file: false,
      };
    }
  }

  async openFileLocation(p: string): Promise<void> {
    try {
      shell.showItemInFolder(p);
    } catch (error) {
      console.warn(`[MacSystem] 打开文件位置失败: ${p}`);
      throw error;
    }
  }

  async showNotification(title: string, body: string): Promise<void> {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  }
}
