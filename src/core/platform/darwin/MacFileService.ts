/**
 * macOS 文件服务实现
 * 处理 macOS 特定文件系统操作
 */

import * as fs from 'fs';
import { promisify } from 'util';
import { FileService } from '../interfaces';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const readdirAsync = promisify(fs.readdir);
const mkdirAsync = promisify(fs.mkdir);
const unlinkAsync = promisify(fs.unlink);

export class MacFileService implements FileService {
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
      console.warn(`[MacFile] 读取文件失败: ${p}`);
      throw error;
    }
  }

  async writeFile(p: string, data: string, encoding: BufferEncoding = 'utf-8'): Promise<void> {
    try {
      await writeFileAsync(p, data, encoding);
      console.info(`[MacFile] 写入文件成功: ${p}`);
    } catch (error) {
      console.warn(`[MacFile] 写入文件失败: ${p}`);
      throw error;
    }
  }

  async readdir(p: string): Promise<string[]> {
    try {
      return await readdirAsync(p);
    } catch (error) {
      console.warn(`[MacFile] 读取目录失败: ${p}`);
      throw error;
    }
  }

  async mkdir(p: string): Promise<void> {
    try {
      await mkdirAsync(p, { recursive: true });
      console.info(`[MacFile] 创建目录成功: ${p}`);
    } catch (error) {
      console.warn(`[MacFile] 创建目录失败: ${p}`);
      throw error;
    }
  }

  async unlink(p: string): Promise<void> {
    try {
      await unlinkAsync(p);
      console.info(`[MacFile] 删除文件成功: ${p}`);
    } catch (error) {
      console.warn(`[MacFile] 删除文件失败: ${p}`);
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
