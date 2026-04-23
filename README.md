# ImageAutoInserter

图片自动插入工具 - 根据商品编码自动将图片嵌入 Excel 表格

## 功能特点

- 自动匹配商品编码，批量插入图片到 Excel
- 支持文件夹、ZIP、RAR 格式的图片来源
- 并行图片加载 + 智能线程调度（自动检测 CPU/存储类型，计算最优并行度）
- 实时进度显示（7 阶段细粒度处理）
- 跨平台支持：macOS (ARM64/x64) / Windows (x86-64)
- WASM 驱动的 RAR 处理（无需外部 UnRAR 工具）
- 统一的平台适配架构
- 异步文件操作（不阻塞主线程）

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Zustand |
| 构建 | Vite 5 + electron-builder |
| 桌面 | Electron 41 |
| 后端 | Python 3.8+ (openpyxl, Pillow) |
| RAR 处理 | node-unrar-js (WASM) |

## 项目结构

```
ImageAutoInserter/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── main.ts             # 入口
│   │   ├── preload.ts          # 预加载脚本
│   │   ├── path-config.ts      # 统一路径管理模块
│   │   ├── platform/           # 统一平台适配层
│   │   │   └── index.ts        # PlatformAdapter 单例
│   │   ├── handlers/           # IPC 处理器
│   │   │   ├── file-handlers.ts
│   │   │   ├── process-handlers.ts
│   │   │   └── update-handlers.ts
│   │   ├── servers/            # 服务器管理
│   │   │   ├── window-manager.ts
│   │   │   └── dev-server-manager.ts
│   │   └── utils/             # 工具函数
│   │       ├── async-file.ts       # 异步文件操作
│   │       ├── async-logger.ts     # 异步日志系统
│   │       ├── logging.ts          # 日志封装
│   │       └── path-validator.ts   # 路径验证
│   ├── renderer/                # React 渲染进程
│   │   ├── components/         # UI 组件
│   │   ├── hooks/             # 状态管理
│   │   └── App.tsx
│   ├── core/                  # Python 核心模块
│   │   ├── models/            # 数据模型
│   │   ├── loaders/           # 文件加载器 (folder/zip/rar)
│   │   ├── utils/             # 核心工具模块
│   │   │   └── system_info.py # 智能线程调度（CPU/内存/存储检测）
│   │   ├── matchers/           # 图片匹配引擎
│   │   ├── pipeline/           # 处理编排
│   │   └── reports/            # 报告生成
│   ├── python/                 # Python GUI 模块
│   └── shared/                 # 共享类型定义
├── tests/                      # 测试文件
├── spec/                       # 规范文档
└── public/                     # 静态资源
    └── assets/
        └── fonts/              # 中英文字体
```

## 开发命令

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建包体
npm run build

# 打包应用（Windows/macOS）
npm run dist

# 仅打包 macOS
npm run dist -- --mac

# 仅打包 Windows
npm run dist -- --win

# 运行测试
npm test              # 单元测试
npx playwright test   # E2E 测试
```

## 架构说明

### 跨平台架构

项目采用统一的 `PlatformAdapter` 模式管理跨平台差异：

```
platform/index.ts
├── 平台检测
│   ├── isWindows()      # Windows 平台判断
│   └── isMac()          # macOS 平台判断
├── 路径配置
│   ├── joinPath()       # 跨平台路径拼接
│   ├── toLongPath()     # Windows 长路径处理
│   └── normalizePath()  # 路径标准化
├── Python 配置
│   ├── Python 搜索路径   # 覆盖多版本安装位置
│   └── 环境变量 PATH    # 跨平台分隔符
└── 资源路径
    ├── getAssetsPath()  # /assets 前缀
    ├── fontUrl()        # /assets/fonts/...
    └── imageUrl()       # /assets/images/...
```

### 路径管理架构

项目采用统一的路径管理模块 `path-config.ts`，集中管理所有路径相关逻辑：

```
path-config.ts
├── 日志路径
│   ├── getLogDirectory()      # 日志目录
│   ├── getLogFilePath()       # 日志文件路径
│   └── getDiagLogFilePath()   # 诊断日志路径
├── 临时目录
│   ├── getTempDirectory()     # 临时目录
│   ├── getReportTempDirectory()  # 报告临时目录
│   └── getProcessTempDirectory() # 进程临时目录
├── 资源路径
│   ├── getPythonScriptPath()  # Python 脚本路径
│   ├── getPythonBinaryPath()  # Python 二进制路径
│   ├── getPreloadScriptPath() # Preload 脚本路径
│   └── getRendererHtmlPath()  # 渲染器 HTML 路径
├── 缓存路径
│   ├── getCacheDirectory()    # 缓存目录
│   ├── getCacheFilePath()     # 缓存文件路径
│   └── getVitePortCachePath() # Vite 端口缓存路径
└── 系统路径
    ├── getUserDataPath()      # 用户数据路径
    ├── getDocumentsPath()     # 文档路径
    ├── getDesktopPath()       # 桌面路径
    └── getDownloadsPath()     # 下载路径
```

**路径管理规范：**
- 所有业务模块通过 `path-config.ts` 获取路径，禁止直接调用 `app.getPath()` 或 `process.resourcesPath`
- 路径统一管理确保开发/生产环境一致性
- 路径变更时只需修改 `path-config.ts`，无需改动业务代码

### 异步文件操作

所有高频文件操作使用异步模式，避免阻塞主线程：

```
async-file.ts
├── safeWriteFile()    # 安全异步写入（带错误处理）
├── safeAppendFile()   # 安全异步追加
├── safeReadTextFile() # 安全异步读取
└── asyncFileManager   # 文件操作队列管理

async-logger.ts
├── 异步日志写入        # 不阻塞主线程
├── 日志轮转           # 按日期/大小自动轮转
└── 多级别支持         # DEBUG/INFO/WARN/ERROR
```

### 处理流程

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
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 加载图片 (并行模式)                                       │  │
│  │  ┌──────────────────┐  ┌────────────────────────────┐  │  │
│  │  │ 智能线程调度      │  │ ThreadPoolExecutor 并行读取 │  │  │
│  │  │ (system_info.py) │─▶│ SSD: 3x物理核心 / HDD: 半核心│  │  │
│  │  │ CPU/内存/存储检测  │  │ 少量文件(≤4)自动串行       │  │  │
│  │  └──────────────────┘  └────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 进度阶段

| 阶段 | 范围 | 说明 |
|------|------|------|
| 启动进程 | 0-2% | Python 启动 + 模块导入 |
| 加载图片 | 2-15% | 扫描 ZIP/RAR/文件夹 |
| 解析Excel | 15-25% | 读取 Excel + 查找商品编码 |
| 处理数据 | 25-70% | 匹配图片 |
| 嵌入图片 | 70-90% | 插入图片到 Excel |
| 保存文件 | 90-98% | 保存 + 高亮 |
| 完成 | 98-100% | 完成 |

### 跨平台支持

| 功能 | macOS | Windows | 说明 |
|------|-------|---------|------|
| 平台检测 | ✅ | ✅ | PlatformAdapter 统一管理 |
| RAR 验证 | ✅ WASM | ✅ WASM | 无外部依赖 |
| RAR 提取 | ✅ WASM | ✅ WASM | 无外部依赖 |
| ZIP 处理 | ✅ Python | ✅ Python | 原生支持 |
| Python 搜索 | ✅ Homebrew | ✅ 多位置 | 覆盖常见安装路径 |
| 进程终止 | ✅ SIGTERM | ✅ taskkill | 平台适配 |
| 路径处理 | ✅ `/` | ✅ `\\` + 长路径 | 自动适配 |
| 日志系统 | ✅ 异步 | ✅ 异步 | 不阻塞主线程 |

## 下载

请访问 [Releases](https://github.com/ColinYYCC/ImageAutoInserter/releases) 页面下载最新版本。

## 使用说明

1. 选择图片来源（文件夹、ZIP 或 RAR 文件）
2. 选择 Excel 文件
3. 点击"开始处理"
4. 等待处理完成

## 系统要求

- macOS 10.14+ / Windows 10+
- Python 3.8+

## 更新日志

### v1.0.0

- 初始版本发布
- 支持自动更新功能
- Excel 图片自动插入功能
- 多格式压缩包支持 (ZIP/RAR/7Z)
- 文件夹作为图片来源
- 实时进度显示 (7 阶段)
- 跨平台支持 (macOS/Windows)
- 安全加固：命令注入修复、类型安全、平台判断统一
- 路径管理重构，统一路径管理模块
- RAR 提取改用 WASM，完全移除外部 UnRAR 依赖
