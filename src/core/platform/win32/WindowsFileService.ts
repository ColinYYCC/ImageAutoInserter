/**
 * Windows 文件服务实现
 * 处理 Windows 特定文件系统操作
 */

import * as fs from 'fs';
import { promisify } from 'util';
import { FileService } from '../interfaces';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const readdirAsync = promisify(fs.readdir);
const mkdirAsync = promisify(fs.mkdir);
const unlinkAsync = promisify(fs.unlink);

export class WindowsFileService implements FileService {
  exists(p: string): boolean {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  }

  isDirectory(p: string): boolean {
    try {
      return fs.statSync(p).isDirectory();
    } catch {
      return false;
    }
  }

  isFile(p: string): boolean {
    try {
      return fs.statSync(p).isFile();
    } catch {
      return false;
    }
  }

  async readFile(p: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    try {
      return await readFileAsync(p, encoding);
    } catch (error) {
      console.warn(`[WindowsFile] 读取文件失败: ${p}`);
      throw error;
    }
  }

  async writeFile(p: string, data: string, encoding: BufferEncoding = 'utf-8'): Promise<void> {
    try {
      await writeFileAsync(p, data, encoding);
      console.info(`[WindowsFile] 写入文件成功: ${p}`);
    } catch (error) {
      console.warn(`[WindowsFile] 写入文件失败: ${p}`);
      throw error;
    }
  }

  async readdir(p: string): Promise<string[]> {
    try {
      return await readdirAsync(p);
    } catch (error) {
      console.warn(`[WindowsFile] 读取目录失败: ${p}`);
      throw error;
    }
  }

  async mkdir(p: string): Promise<void> {
    try {
      await mkdirAsync(p, { recursive: true });
      console.info(`[WindowsFile] 创建目录成功: ${p}`);
    } catch (error) {
      console.warn(`[WindowsFile] 创建目录失败: ${p}`);
      throw error;
    }
  }

  async unlink(p: string): Promise<void> {
    try {
      await unlinkAsync(p);
      console.info(`[WindowsFile] 删除文件成功: ${p}`);
    } catch (error) {
      console.warn(`[WindowsFile] 删除文件失败: ${p}`);
      throw error;
    }
  }

  realpath(p: string): string {
    try {
      return fs.realpathSync(p);
    } catch {
      return p;
    }
  }
}
