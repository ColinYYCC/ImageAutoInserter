/**
 * macOS 路径服务实现
 * 处理 macOS 特定路径操作
 */

import * as path from 'path';
import * as os from 'os';
import { PathService } from '../interfaces';

export class MacPathService implements PathService {
  join(...paths: string[]): string {
    return path.join(...paths);
  }

  resolve(...paths: string[]): string {
    return path.resolve(...paths);
  }

  normalize(p: string): string {
    if (!p || typeof p !== 'string') {
      console.warn(`[MacPath] 收到无效路径输入: ${typeof p}`);
      return '';
    }
    const normalized = path.normalize(p);
    return normalized.replace(/\\/g, '/');
  }

  isAbsolute(p: string): boolean {
    return path.isAbsolute(p);
  }

  dirname(p: string): string {
    return path.dirname(p);
  }

  basename(p: string): string {
    return path.basename(p);
  }

  extname(p: string): string {
    return path.extname(p);
  }

  async toShortPath(p: string): Promise<string> {
    // macOS 不需要短路径，直接返回原路径
    return p;
  }

  getTempDir(): string {
    return os.tmpdir();
  }

  getHomeDir(): string {
    return os.homedir();
  }

  getDesktopDir(): string {
    return path.join(os.homedir(), 'Desktop');
  }

  getDocumentsDir(): string {
    return path.join(os.homedir(), 'Documents');
  }
}
