/**
 * 平台服务接口定义
 * 定义跨平台抽象层的核心接口
 */

import { ChildProcess } from 'child_process';

export type PlatformType = 'win32' | 'darwin';

export interface Platform {
  readonly name: PlatformType;
  readonly isWindows: boolean;
  readonly isMac: boolean;
}

export interface PlatformInfo {
  platform: PlatformType;
  isWindows: boolean;
  isMac: boolean;
  userName: string;
  homeDir: string;
  tmpDir: string;
  defaultFonts: string[];
}

/**
 * 路径服务接口
 * 统一管理跨平台路径操作
 */
export interface PathService {
  /**
   * 连接路径片段
   */
  join(...paths: string[]): string;

  /**
   * 解析为绝对路径
   */
  resolve(...paths: string[]): string;

  /**
   * 标准化路径格式
   */
  normalize(p: string): string;

  /**
   * 判断是否为绝对路径
   */
  isAbsolute(p: string): boolean;

  /**
   * 获取目录部分
   */
  dirname(p: string): string;

  /**
   * 获取文件名部分
   */
  basename(p: string): string;

  /**
   * 获取扩展名部分
   */
  extname(p: string): string;

  /**
   * 获取短路径（Windows 8.3 格式，用于兼容含空格的路径）
   * macOS 上直接返回原路径
   */
  toShortPath(p: string): Promise<string>;

  /**
   * 获取临时目录
   */
  getTempDir(): string;

  /**
   * 获取用户主目录
   */
  getHomeDir(): string;

  /**
   * 获取桌面目录
   */
  getDesktopDir(): string;

  /**
   * 获取文档目录
   */
  getDocumentsDir(): string;
}

/**
 * 进程服务接口
 * 统一管理跨平台进程操作
 */
export interface SpawnOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeout?: number;
}

export interface ProcessService {
  /**
   * Python 可执行文件路径
   */
  readonly pythonExecutable: string;

  /**
   * Shell 执行文件路径
   */
  readonly shellExecutable: string;

  /**
   * 启动 Python 进程
   */
  spawnPython(scriptPath: string, args: string[], options: SpawnOptions): ChildProcess;

  /**
   * 终止进程
   */
  terminateProcess(pid: number): Promise<void>;

  /**
   * 检查进程是否在运行
   */
  isProcessRunning(pid: number): boolean;
}

/**
 * 文件服务接口
 * 统一管理跨平台文件系统操作
 */
export interface FileService {
  /**
   * 检查文件/目录是否存在
   */
  exists(p: string): boolean;

  /**
   * 判断是否为目录
   */
  isDirectory(p: string): boolean;

  /**
   * 判断是否为文件
   */
  isFile(p: string): boolean;

  /**
   * 读取文件内容
   */
  readFile(p: string, encoding: BufferEncoding): Promise<string>;

  /**
   * 写入文件内容
   */
  writeFile(p: string, data: string, encoding: BufferEncoding): Promise<void>;

  /**
   * 读取目录内容
   */
  readdir(p: string): Promise<string[]>;

  /**
   * 创建目录
   */
  mkdir(p: string): Promise<void>;

  /**
   * 删除文件
   */
  unlink(p: string): Promise<void>;

  /**
   * 解析符号链接获取真实路径
   */
  realpath(p: string): string;
}

/**
 * 系统服务接口
 * 统一管理跨平台系统操作
 */
export interface MediaAccessStatus {
  microphone: boolean;
  camera: boolean;
  file: boolean;
}

export interface SystemService {
  /**
   * 获取平台信息
   */
  getPlatformInfo(): PlatformInfo;

  /**
   * 获取系统字体列表
   */
  getSystemFonts(): string[];

  /**
   * 检测是否为 SSD
   */
  isSsd(): Promise<boolean>;

  /**
   * 获取媒体访问权限状态
   */
  getMediaAccessStatus(): Promise<MediaAccessStatus>;

  /**
   * 打开文件所在位置（Finder/资源管理器）
   */
  openFileLocation(p: string): Promise<void>;

  /**
   * 显示系统通知
   */
  showNotification(title: string, body: string): Promise<void>;
}

/**
 * 平台服务容器
 * 组合所有平台服务
 */
export interface PlatformServices {
  path: PathService;
  process: ProcessService;
  file: FileService;
  system: SystemService;
}
