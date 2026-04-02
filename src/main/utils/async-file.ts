import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const appendFile = promisify(fs.appendFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);
const readdir = promisify(fs.readdir);

export interface AsyncFileOptions {
  encoding?: BufferEncoding;
  flag?: string;
  mode?: number;
}

class AsyncFileManager {
  private writeQueue: Map<string, Promise<void>> = new Map();

  async ensureDir(dirPath: string): Promise<void> {
    try {
      await access(dirPath, fs.constants.F_OK);
    } catch {
      await mkdir(dirPath, { recursive: true });
    }
  }

  async writeFile(filePath: string, content: string, options?: AsyncFileOptions): Promise<void> {
    await this.ensureDir(path.dirname(filePath));

    const writePromise = writeFile(filePath, content, {
      encoding: options?.encoding || 'utf-8',
      flag: options?.flag || 'w',
      mode: options?.mode,
    });

    this.writeQueue.set(filePath, writePromise);
    await writePromise;
    this.writeQueue.delete(filePath);
  }

  async appendFile(filePath: string, content: string, options?: AsyncFileOptions): Promise<void> {
    await this.ensureDir(path.dirname(filePath));

    const appendPromise = appendFile(filePath, content, {
      encoding: options?.encoding || 'utf-8',
    });

    if (this.writeQueue.has(filePath)) {
      await this.writeQueue.get(filePath);
    }

    this.writeQueue.set(filePath, appendPromise);
    await appendPromise;
    this.writeQueue.delete(filePath);
  }

  async readJsonFile<T>(filePath: string): Promise<T | null> {
    try {
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  async writeJsonFile(filePath: string, data: unknown, pretty = false): Promise<void> {
    const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    await this.writeFile(filePath, content);
  }

  async readTextFile(filePath: string): Promise<string | null> {
    try {
      return await readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      await unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async deleteDir(dirPath: string, recursive = false): Promise<boolean> {
    try {
      if (recursive) {
        await rmdir(dirPath, { recursive: true });
      } else {
        await rmdir(dirPath);
      }
      return true;
    } catch {
      return false;
    }
  }

  async listDir(dirPath: string): Promise<string[]> {
    try {
      return await readdir(dirPath);
    } catch {
      return [];
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async flush(filePath: string): Promise<void> {
    if (this.writeQueue.has(filePath)) {
      await this.writeQueue.get(filePath);
    }
  }

  async flushAll(): Promise<void> {
    const promises = Array.from(this.writeQueue.values());
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }
}

export const asyncFileManager = new AsyncFileManager();

export async function safeWriteFile(filePath: string, content: string): Promise<void> {
  try {
    await asyncFileManager.writeFile(filePath, content);
  } catch (error) {
    console.error(`Failed to write file ${filePath}:`, error);
  }
}

export async function safeAppendFile(filePath: string, content: string): Promise<void> {
  try {
    await asyncFileManager.appendFile(filePath, content);
  } catch (error) {
    console.error(`Failed to append to file ${filePath}:`, error);
  }
}

export async function safeReadJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    return await asyncFileManager.readJsonFile<T>(filePath);
  } catch (error) {
    console.error(`Failed to read JSON file ${filePath}:`, error);
    return null;
  }
}

export async function safeReadTextFile(filePath: string): Promise<string | null> {
  try {
    return await asyncFileManager.readTextFile(filePath);
  } catch (error) {
    console.error(`Failed to read text file ${filePath}:`, error);
    return null;
  }
}
