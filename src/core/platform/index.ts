/**
 * 跨平台抽象层统一导出
 */

// 重新导出所有类型和接口
export type { Platform, PlatformServices, PathService, ProcessService, FileService, SystemService } from './interfaces';

// 重新导出注册表和便捷访问
export {
  platformRegistry,
  platform,
  pathService,
  processService,
  fileService,
  systemService,
} from './registry';

// 导出平台特定实现（供测试使用）
export { WindowsPathService } from './win32/WindowsPathService';
export { WindowsProcessService } from './win32/WindowsProcessService';
export { WindowsFileService } from './win32/WindowsFileService';
export { WindowsSystemService } from './win32/WindowsSystemService';

export { MacPathService } from './darwin/MacPathService';
export { MacProcessService } from './darwin/MacProcessService';
export { MacFileService } from './darwin/MacFileService';
export { MacSystemService } from './darwin/MacSystemService';
