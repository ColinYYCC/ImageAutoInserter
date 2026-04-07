/**
 * Windows 路径服务实现
 * 处理 Windows 特定路径操作
 */

import * as path from 'path';
import * as os from 'os';
import { PathService } from '../interfaces';

// Windows 路径无效字符
const INVALID_PATH_CHARS = /[<>"|?*\x00-\x1f]/;

// 安全的 Windows 路径格式（支持 Unicode 中文字符）
const SAFE_PATH_PATTERN = /^([a-zA-Z]:[\\/])(?:[^\0<>"|?*\x00-\x1f]+[\/\\])*[^\0<>"|?*\x00-\x1f]*$/;

export class WindowsPathService implements PathService {
  join(...paths: string[]): string {
    return path.join(...paths);
  }

  resolve(...paths: string[]): string {
    return path.resolve(...paths);
  }

  normalize(p: string): string {
    if (!p || typeof p !== 'string') {
      console.warn(`[WindowsPath] 收到无效路径输入: ${typeof p}`);
      return '';
    }
    const normalized = path.normalize(p);
    return normalized.replace(/\//g, '\\');
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
    if (!p || typeof p !== 'string') {
      return p;
    }

    if (INVALID_PATH_CHARS.test(p)) {
      console.warn(`[Security] 路径包含无效字符: ${p}`);
      return p;
    }

    if (!SAFE_PATH_PATTERN.test(p)) {
      console.warn(`[Security] 路径格式不符合安全规范，尝试获取短路径: ${p}`);
    }

    try {
      const { execFileSync } = require('child_process');
      const result = execFileSync('cmd', ['/c', `for %I in ("${p}") do @echo %~sfI`], {
        encoding: 'utf-8',
        timeout: 5000,
        shell: false,
      });
      const shortPath = result.trim();
      if (shortPath && shortPath !== p) {
        console.info(`[WindowsPath] 获取短路径成功: ${p} -> ${shortPath}`);
        return shortPath;
      }
      return p;
    } catch {
      console.warn(`[WindowsPath] 获取短路径失败: ${p}`);
      return p;
    }
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
