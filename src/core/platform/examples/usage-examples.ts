/**
 * 跨平台抽象层使用示例
 * 演示如何使用统一的平台服务 API
 */

// ============ 基础导入 ============
import {
  platform,
  pathService,
  processService,
  fileService,
  systemService,
} from '../index';

// ============ 平台检测示例 ============
export function examplePlatformDetection(): void {
  console.log('===== 平台检测示例 =====');

  // 方式 1：使用 platform 对象
  if (platform.isWindows()) {
    console.log('当前运行在 Windows 系统');
  } else if (platform.isMac()) {
    console.log('当前运行在 macOS 系统');
  }

  // 方式 2：获取完整平台信息
  const platformInfo = systemService.getPlatformInfo();
  console.log('平台信息:', {
    name: platformInfo.platform,
    用户名: platformInfo.userName,
    主目录: platformInfo.homeDir,
    临时目录: platformInfo.tmpDir,
  });
}

// ============ 路径处理示例 ============
export async function examplePathOperations(): Promise<void> {
  console.log('===== 路径处理示例 =====');

  // 路径连接 - 自动适配平台分隔符
  const fullPath = pathService.join('home', 'user', 'Documents', 'file.xlsx');
  console.log('连接路径:', fullPath);

  // 路径标准化 - Windows 使用 \，macOS 使用 /
  const normalized = pathService.normalize('home/user/../Documents/./file.xlsx');
  console.log('标准化路径:', normalized);

  // 获取短路径（Windows 专用，macOS 直接返回原路径）
  const longPath = 'C:\\Users\\测试用户\\Documents\\文件.xlsx';
  const shortPath = await pathService.toShortPath(longPath);
  console.log('短路径:', shortPath);

  // 获取系统目录
  console.log('临时目录:', pathService.getTempDir());
  console.log('用户主目录:', pathService.getHomeDir());
  console.log('桌面目录:', pathService.getDesktopDir());
  console.log('文档目录:', pathService.getDocumentsDir());

  // 路径解析
  console.log('目录部分:', pathService.dirname(fullPath));
  console.log('文件名:', pathService.basename(fullPath));
  console.log('扩展名:', pathService.extname(fullPath));
}

// ============ 进程管理示例 ============
export function exampleProcessManagement(): void {
  console.log('===== 进程管理示例 =====');

  // 获取 Python 可执行文件路径
  console.log('Python 路径:', processService.pythonExecutable);

  // 启动 Python 进程
  const scriptPath = '/path/to/script.py';
  const args = ['--input', 'data.xlsx', '--output', 'result.xlsx'];

  const pythonProcess = processService.spawnPython(scriptPath, args, {
    cwd: '/path/to/working/directory',
    env: {
      PYTHONPATH: '/custom/path',
    },
    timeout: 60000,
  });

  // 处理进程输出
  pythonProcess.stdout?.on('data', (data) => {
    console.log('Python 输出:', data.toString());
  });

  pythonProcess.stderr?.on('data', (data) => {
    console.error('Python 错误:', data.toString());
  });

  pythonProcess.on('close', (code) => {
    console.log('进程退出，代码:', code);
  });

  // 检查进程状态
  const isRunning = processService.isProcessRunning(pythonProcess.pid || 0);
  console.log('进程是否运行:', isRunning);

  // 终止进程（异步）
  // await processService.terminateProcess(pythonProcess.pid || 0);
}

// ============ 文件操作示例 ============
export async function exampleFileOperations(): Promise<void> {
  console.log('===== 文件操作示例 =====');

  const filePath = '/path/to/file.xlsx';

  // 检查文件存在
  const exists = fileService.exists(filePath);
  console.log('文件存在:', exists);

  // 检查类型
  const isFile = fileService.isFile(filePath);
  const isDir = fileService.isDirectory(filePath);
  console.log('是文件:', isFile, '是目录:', isDir);

  // 解析符号链接
  const realPath = fileService.realpath(filePath);
  console.log('真实路径:', realPath);

  // 读取文件
  try {
    const content = await fileService.readFile(filePath, 'utf-8');
    console.log('文件内容长度:', content.length);
  } catch (error) {
    console.error('读取失败:', error);
  }

  // 写入文件
  try {
    await fileService.writeFile('/path/to/output.txt', 'Hello, World!', 'utf-8');
    console.log('写入成功');
  } catch (error) {
    console.error('写入失败:', error);
  }

  // 目录操作
  try {
    const files = await fileService.readdir('/path/to/directory');
    console.log('目录内容:', files);
  } catch (error) {
    console.error('读取目录失败:', error);
  }

  // 创建目录
  try {
    await fileService.mkdir('/path/to/new/directory');
    console.log('创建目录成功');
  } catch (error) {
    console.error('创建目录失败:', error);
  }

  // 删除文件
  try {
    await fileService.unlink('/path/to/file.txt');
    console.log('删除文件成功');
  } catch (error) {
    console.error('删除文件失败:', error);
  }
}

// ============ 系统服务示例 ============
export async function exampleSystemServices(): Promise<void> {
  console.log('===== 系统服务示例 =====');

  // SSD 检测
  const isSsd = await systemService.isSsd();
  console.log('是否为 SSD:', isSsd);

  // 获取系统字体
  const fonts = systemService.getSystemFonts();
  console.log('系统字体数量:', fonts.length);
  console.log('部分字体:', fonts.slice(0, 5));

  // 媒体权限状态（macOS 专用）
  const mediaStatus = await systemService.getMediaAccessStatus();
  console.log('媒体权限:', mediaStatus);

  // 打开文件所在位置
  await systemService.openFileLocation('/path/to/file.xlsx');

  // 显示系统通知
  await systemService.showNotification('处理完成', 'Excel 文件已成功处理');
}

// ============ 完整工作流示例 ============
export async function exampleCompleteWorkflow(): Promise<void> {
  console.log('===== 完整工作流示例 =====');

  // 1. 检测平台
  const isWindows = platform.isWindows();
  console.log('平台:', isWindows ? 'Windows' : 'macOS');

  // 2. 准备路径
  const inputPath = pathService.join(pathService.getDocumentsDir(), 'input.xlsx');
  const outputPath = pathService.join(pathService.getDocumentsDir(), 'output.xlsx');

  // 3. Windows 上处理中文路径
  const safeInputPath = isWindows
    ? await pathService.toShortPath(inputPath)
    : inputPath;

  console.log('安全输入路径:', safeInputPath);

  // 4. 检查文件存在
  if (!fileService.exists(safeInputPath)) {
    console.error('输入文件不存在');
    return;
  }

  // 5. 启动处理进程
  const scriptPath = pathService.join(
    pathService.getHomeDir(),
    'app',
    'scripts',
    'process.py'
  );

  const proc = processService.spawnPython(scriptPath, [safeInputPath, outputPath], {
    cwd: pathService.dirname(scriptPath),
    timeout: 300000, // 5 分钟超时
  });

  // 6. 等待完成
  await new Promise<void>((resolve) => {
    proc.on('close', () => resolve());
  });

  // 7. 验证输出
  if (fileService.exists(outputPath)) {
    console.log('处理成功，输出文件:', outputPath);
    await systemService.showNotification('处理完成', '文件已成功处理');
    await systemService.openFileLocation(outputPath);
  } else {
    console.error('处理失败');
  }
}

// 导出所有示例
export const examples = {
  platformDetection: examplePlatformDetection,
  pathOperations: examplePathOperations,
  processManagement: exampleProcessManagement,
  fileOperations: exampleFileOperations,
  systemServices: exampleSystemServices,
  completeWorkflow: exampleCompleteWorkflow,
};
