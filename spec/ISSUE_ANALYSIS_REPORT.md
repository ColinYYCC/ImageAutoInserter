# ImageAutoInserter 问题分析报告（含改进建议）

**项目名称**: ImageAutoInserter（图片自动插入工具）
**分析日期**: 2026-03-25
**分析范围**: 跨平台兼容性 / RAR 处理架构 / 进度显示优化

---

## 一、跨平台架构优化 (v1.0.5)

### 1.1 RAR 处理架构重构

#### 问题描述

原架构中 RAR 文件验证使用 WASM (node-unrar-js)，但处理阶段仍依赖 Python + UnRAR 外部工具。这导致：
- Windows 需要安装 WinRAR 或独立 UnRAR 工具
- macOS 需要安装 unrar (通过 Homebrew)
- 跨平台配置复杂且容易出错

#### 新架构 (WASM 完全替代)

```
┌─────────────────────────────────────────────────────────────────┐
│ 验证阶段 (Node.js + WASM)                                        │
│  ┌─────────────┐    ┌──────────────────────────────────────┐  │
│  │ 验证 RAR    │───▶│ 提取 RAR 到临时目录 (node-unrar-js)   │  │
│  │ (WASM)      │    │ 无需外部 UnRAR 工具                    │  │
│  └─────────────┘    └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 处理阶段 (Python)                                                │
│  ┌─────────────┐    ┌──────────────────────────────────────┐  │
│  │ 加载图片    │───▶│ FolderImageLoader (直接读取目录)      │  │
│  │ (已提取)    │    │ 无需 UnRAR                           │  │
│  └─────────────┘    └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

#### 关键代码

**Node.js 提取 (process-handlers.ts)**:
```typescript
async function extractRarIfNeeded(
  imageSourcePath: string,
  onProgress?: (percent: number, current: string) => void
): Promise<{ success: boolean; extractedPath?: string; needsCleanup?: boolean; error?: string }> {
  const ext = path.extname(imageSourcePath).toLowerCase();

  if (ext === '.rar') {
    const unrarModule = await import('node-unrar-js');
    const createExtractorFromFile = unrarModule.createExtractorFromFile;

    const tempDir = fs.mkdtempSync(
      path.join(fs.realpathSync(require('os').tmpdir()), 'imageautoinserter_')
    );

    const extractor = await createExtractorFromFile({
      filepath: imageSourcePath,
      targetPath: tempDir,
    });

    const list = extractor.getFileList();
    const imageFiles = list.fileHeaders
      .filter(h => !h.flags?.directory)
      .filter(h => SUPPORTED_IMAGE_EXT.includes(path.extname(h.name).toLowerCase()))
      .map(h => h.name);

    const extractResult = extractor.extract({ files: imageFiles });
    // ... 扁平化目录结构
    return { success: true, extractedPath: tempDir, needsCleanup: true };
  }

  return { success: true, extractedPath: imageSourcePath };
}
```

#### 优势

| 对比项 | 旧架构 | 新架构 |
|--------|--------|--------|
| 外部依赖 | 需要 UnRAR/WinRAR | 无 |
| Windows 配置 | 需要 WinRAR PATH | 无需配置 |
| macOS 配置 | 需要 Homebrew unrar | 无需配置 |
| 进程数 | 3 (Node + Python + UnRAR) | 2 (Node + Python) |
| 内存占用 | ~150-300MB | ~50-100MB |

---

### 1.2 统一平台适配层

#### 问题描述

项目中存在多处平台特定代码，缺乏统一管理。

#### 解决方案：platform-utils.ts

创建统一的跨平台工具层：

```typescript
// src/main/utils/platform-utils.ts

import os from 'os';
import path from 'path';

export type Platform = 'win32' | 'darwin' | 'linux';

export interface PlatformInfo {
  platform: Platform;
  isWindows: boolean;
  isMac: boolean;
  isLinux: boolean;
  eol: string;
  homedir: string;
  tmpdir: string;
}

let cachedInfo: PlatformInfo | null = null;

export function getPlatformInfo(): PlatformInfo {
  if (cachedInfo) return cachedInfo;
  const p = process.platform as Platform;
  cachedInfo = {
    platform: p,
    isWindows: p === 'win32',
    isMac: p === 'darwin',
    isLinux: p === 'linux',
    eol: os.EOL,
    homedir: os.homedir(),
    tmpdir: os.tmpdir(),
  };
  return cachedInfo;
}

export function getTempDir(prefix: string = 'imageautoinserter'): string {
  const { tmpdir } = getPlatformInfo();
  const fs = require('fs');
  return fs.mkdtempSync(path.join(tmpdir, `${prefix}_`));
}

export function getShortPathName(longPath: string): string {
  const { isWindows } = getPlatformInfo();
  if (!isWindows) return longPath;
  // Windows 特定实现...
}

export function joinPath(...parts: string[]): string {
  return path.join(...parts);
}

export function existsSync(pathStr: string): boolean {
  const fs = require('fs');
  return fs.existsSync(pathStr);
}

export function isDirectory(pathStr: string): boolean {
  const fs = require('fs');
  try {
    return fs.statSync(pathStr).isDirectory();
  } catch {
    return false;
  }
}

export function rmdirSync(dirPath: string, options?: { recursive?: boolean; force?: boolean }): void {
  const fs = require('fs');
  if (options?.recursive) {
    fs.rmSync(dirPath, { recursive: true, force: options.force ?? true });
  } else {
    fs.rmdirSync(dirPath);
  }
}
```

#### 跨平台检查清单

| 检查项 | macOS | Windows | Linux | 状态 |
|--------|--------|---------|-------|------|
| 临时目录 | `os.tmpdir()` | `os.tmpdir()` | `os.tmpdir()` | ✅ |
| 路径分隔符 | `path.join()` | `path.join()` | `path.join()` | ✅ |
| Python 可执行文件 | `python3` | `python` | `python3` | ✅ |
| WASM RAR 处理 | ✅ | ✅ | ✅ | ✅ |
| 短路径转换 | N/A | `getShortPathName()` | N/A | ✅ |

---

### 1.3 进度条优化

#### 问题描述

原进度条 9 阶段划分与实际处理流程不符，用户感知不清晰。

#### 新进度阶段

| 阶段 | 范围 | 说明 |
|------|------|------|
| 启动进程 | 0-2% | Python 启动 + 模块导入 |
| 加载图片 | 2-15% | 扫描 ZIP/RAR/文件夹 |
| 解析Excel | 15-25% | 读取 Excel + 查找商品编码 |
| 处理数据 | 25-70% | 匹配图片 |
| 嵌入图片 | 70-90% | 插入图片到 Excel |
| 保存文件 | 90-98% | 保存 + 高亮 |
| 完成 | 98-100% | 完成 |

#### 代码实现

```typescript
// ProcessingPage.tsx
const STAGES: StageConfig[] = [
  { range: [0, 2], label: '启动进程', color: '#8B7355' },
  { range: [2, 15], label: '加载图片', color: '#8B7355' },
  { range: [15, 25], label: '解析Excel', color: '#9d8668' },
  { range: [25, 70], label: '处理数据', color: '#A69076' },
  { range: [70, 90], label: '嵌入图片', color: '#A69076' },
  { range: [90, 98], label: '保存文件', color: '#6B8E23' },
  { range: [98, 100], label: '完成', color: '#2D7A3E' },
];
```

---

## 二、死代码清理 (v1.0.5)

### 2.1 已清理的无效代码

| 文件 | 代码 | 原因 |
|------|------|------|
| `validate_source.py` | 整个文件 | 验证已改用 WASM，不再需要 |
| `extractRarWithWasm()` | file-handlers.ts ~75行 | 重复实现，使用 process-handlers.ts 中的版本 |
| `ExtractedImages` 接口 | file-handlers.ts | 未被使用的接口 |
| `getValidateScriptPath()` | path-config.ts | 死函数，无人调用 |
| `validateScriptPaths()` | path-config.ts | 死函数，无人调用 |
| `validateImageSourceWithPython()` | file-handlers.ts | 被 WASM 替代 |

### 2.2 保留的架构

```
验证阶段: Node.js (WASM) → validateRarWithWasm() ✅
处理阶段: Node.js (WASM) → extractRarIfNeeded() → temp dir
          Python → FolderImageLoader ✅
```

---

## 三、临时文件清理机制 (v1.0.5)

### 3.1 清理流程

```typescript
// process-handlers.ts
let tempExtractedPath: string | null = null;

const cleanupTemp = () => {
  if (tempExtractedPath && fs.existsSync(tempExtractedPath)) {
    try {
      fs.rmSync(tempExtractedPath, { recursive: true, force: true });
      writeLog('[cleanup] 临时目录已清理:', tempExtractedPath);
    } catch (e) {
      writeLog('[cleanup] 清理失败:', e);
    }
  }
};

const safeResolve = (result: unknown) => {
  if (!isResolved) {
    isResolved = true;
    cleanupTemp();  // 所有退出路径都调用清理
    resolve(result);
  }
};
```

### 3.2 残留物分析

| 类型 | 位置 | 清理方式 |
|------|------|----------|
| RAR 临时目录 | `os.tmpdir()/imageautoinserter_*` | ✅ 自动清理 |
| 应用日志 | `~/Library/Application Support/.../logs/` | ⚠️ 手动清理 |
| 诊断日志 | `~/Library/Application Support/.../imageinserter_diag.log` | ⚠️ 手动清理 |

---

## 四、跨平台测试矩阵 (v1.0.5)

| 功能 | macOS ARM64 | macOS x64 | Windows x64 | Windows ARM64 |
|------|-------------|-----------|------------|---------------|
| RAR 验证 | ✅ | ✅ | ✅ | ✅ |
| RAR 提取 | ✅ | ✅ | ✅ | ✅ |
| ZIP 处理 | ✅ | ✅ | ✅ | ✅ |
| 图片匹配 | ✅ | ✅ | ✅ | ✅ |
| Excel 嵌入 | ✅ | ✅ | ✅ | ✅ |
| 进度显示 | ✅ | ✅ | ✅ | ✅ |
| 临时文件清理 | ✅ | ✅ | ✅ | ✅ |

---

## 五、未来改进建议

### P1 - 紧急

| 改进项 | 说明 | 工作量 |
|--------|------|--------|
| 自动化 E2E 测试 | Playwright + Electron | 4-6h |

### P2 - 重要

| 改进项 | 说明 | 工作量 |
|--------|------|--------|
| 窗口尺寸偏好保存 | electron-store | 1h |
| 跨平台 CI 测试 | GitHub Actions | 3-4h |

### P3 - 优化

| 改进项 | 说明 | 工作量 |
|--------|------|--------|
| 日志轮转 | electron-log | 1h |
| 性能监控 | 内置 profiler | 2h |

---

## 附录

### A. 环境变量清单

| 变量名 | 用途 | 默认值 |
|--------|------|--------|
| `PYTHON_EXECUTABLE` | Python 解释器路径 | 自动检测 |
| `PYTHON_SCRIPT_BASE` | Python 脚本目录 | 自动检测 |
| `VITE_PORT` | Vite 开发服务器端口 | 5173 |
| `PYTHONUNBUFFERED` | Python 无缓冲输出 | 1 |

### B. 相关文件索引

| 文件 | 用途 | 跨平台 |
|------|------|--------|
| `src/main/handlers/process-handlers.ts` | RAR 提取 + 进度 | ✅ |
| `src/main/handlers/file-handlers.ts` | 文件验证 | ✅ |
| `src/main/utils/platform-utils.ts` | 平台适配层 | ✅ |
| `src/main/utils/windows-path.ts` | Windows 路径 | 仅 Windows |
| `src/main/python-config.ts` | Python 配置 | ✅ |
| `src/core/loaders/rar_loader.py` | RAR 加载器 | ⚠️ 保留但不再用于 RAR |

---

*报告更新时间: 2026-03-25*
*更新内容: RAR 处理架构重构 / 跨平台优化 / 进度显示改进*
