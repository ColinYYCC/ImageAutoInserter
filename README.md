# ImageAutoInserter

图片自动插入工具 - 根据商品编码自动将图片嵌入 Excel 表格

## 功能特点

- 自动匹配商品编码，批量插入图片到 Excel
- 支持文件夹、ZIP、RAR 格式的图片来源
- 实时进度显示（7 阶段细粒度处理）
- 跨平台支持：macOS (ARM64/x64) / Windows (x86-64)
- WASM 驱动的 RAR 处理（无需外部 UnRAR 工具）
- 统一的平台适配架构
- 异步文件操作（不阻塞主线程）
- Mac 安全书签机制（持久化文件夹访问权限）

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
│   │       ├── path-validator.ts   # 路径验证
│   │       ├── security-bookmark.ts # Mac 安全书签管理
│   │       └── permissions.ts      # 权限处理
│   ├── renderer/                # React 渲染进程
│   │   ├── components/         # UI 组件
│   │   ├── hooks/             # 状态管理
│   │   └── App.tsx
│   ├── core/                  # Python 核心模块
│   │   ├── models/            # 数据模型
│   │   ├── loaders/           # 文件加载器 (folder/zip/rar)
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
│  ┌─────────────┐    ┌──────────────────────────────────────┐  │
│  │ 加载图片    │───▶│ FolderImageLoader                    │  │
│  │ (ZIP/文件夹)│    │ (无需 UnRAR)                          │  │
│  └─────────────┘    └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 进度阶段

| 阶段 | 范围 | 说明 |
|------|------|------|
| 启动进程 | 0-2% | Python 启动 + 模块导入 |
| 加载图片 | 2-15% | 扫描 ZIP/RAR/文件夹 |
| 解析Excel | 15-25% | 读取 Excel + 查找商品编码 |
| 处理数据 | 25-92% | 匹配图片 + 嵌入图片 |
| 保存文件 | 92-98% | 保存 + 高亮 |
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
| 权限管理 | ✅ 安全书签 | ✅ 普通用户权限 | Mac 持久化授权 / Windows 无 UAC 弹窗 |

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

### v1.1.1 (2026-04-06)

#### 安全修复
- 修复 npm 安全漏洞：升级 xlsx 到 0.20.3（修复 Prototype Pollution 和 ReDoS）
- 升级 electron 到 41.1.0（修复 Use-after-free 漏洞）
- 修复 lodash 和 @xmldom/xmldom 漏洞

#### 代码质量改进
- 添加 ESLint 和 Prettier 配置文件
- 设置测试覆盖率阈值（80%）
- 修复代码质量问题：将 print 改为 logger

#### 文档完善
- 添加 CONTRIBUTING.md（贡献指南）
- 添加 CODE_OF_CONDUCT.md（行为准则）
- 添加 LICENSE（ISC 开源许可证）

### v1.1.0 (2026-04-06)

#### 新功能
- Mac 安全书签机制：持久化用户授权的文件夹访问权限，避免重复授权
- 权限管理优化：统一 macOS 和 Windows 的权限处理逻辑

#### Bug 修复
- 修复 Mac 权限配置问题：移除 `entitlements.mac.plist` 中的硬编码路径
- 修复 Windows UAC 弹窗：移除 `requireAdministrator`，改为普通用户权限

#### 架构改进
- 新增 `security-bookmark.ts`：Mac 安全书签管理器
- 更新 `permissions.ts`：集成安全书签机制，改进文件访问权限检查
- 更新 `file-handlers.ts`：启用 `securityScopedBookmarks`，自动保存书签
- 更新 `main.ts`：启动时恢复书签，退出时清理访问权限

#### 用户体验提升
- Mac 用户：选择文件夹后权限被持久化保存，应用重启后自动恢复
- Windows 用户：不再需要管理员权限，避免不必要的 UAC 弹窗

### v1.0.6 (2026-03-30)

#### 新功能
- 图片嵌入效果优化：使用 TwoCellAnchor + editAs='oneCell'，图片随单元格调整大小并保留原图

#### Bug 修复
- 修复"返回重试"按钮不回到主页的问题：`App.tsx` 统一使用 `useAppStore` 的 `reset` 方法
- 删除冗余的 `useAppState` React Context，简化状态管理架构

#### 安全加固
- 修复命令注入风险：所有 `execSync` 调用改用 `execFileSync` + 参数数组
- 统一平台判断：所有 `process.platform` 判断改用 `isWindows()` / `isMac()` 封装函数
- 类型安全强化：`PythonProcessResult` 接口替代 `any` 类型

#### 路径管理重构
- 创建统一的路径管理模块 `path-config.ts`，集中管理所有路径
- 新增 20+ 个路径管理函数，覆盖日志、临时文件、资源、缓存等路径
- 所有业务模块统一通过 `path-config.ts` 获取路径
- 消除硬编码路径，确保开发/生产环境路径一致性
- 新增路径缓存机制，避免重复计算路径

#### 跨平台文件选择优化
- 统一 macOS 和 Windows 的图片来源选择行为
- 图片来源支持选择文件夹、ZIP、RAR、7Z 压缩文件
- 选择后进行严格的文件类型验证，非允许格式会被拒绝
- 优化 `validate-file` 处理器，明确区分图片来源和 Excel 文件验证逻辑

#### 架构重构
- 创建统一的 `platform/index.ts` 平台适配层，整合所有跨平台逻辑
- 新增 `async-file.ts` 异步文件操作模块，消除同步文件阻塞风险
- 新增 `async-logger.ts` 异步日志系统，日志写入不阻塞主线程
- 移除 Linux 平台支持，专注 Windows/macOS 双平台优化

#### 跨平台改进
- Python 搜索路径扩展至 D/E 盘，支持 Anaconda/Miniconda/py launcher
- Windows Store Python 支持（通过 `where` 命令搜索）
- 统一资源路径管理 (`getAssetsPath()`, `fontUrl()` 等)
- 修复 `showOpenDialog` 的 `openFile`/`openDirectory` 互斥问题

#### 稳定性提升
- 日志系统从同步写入改为队列异步写入
- 报告管理器异步化，避免文件操作阻塞 UI
- 路径配置使用异步目录创建检查

### v1.0.5 (2026-03-25)

#### 架构优化
- RAR 提取改用 WASM (node-unrar-js)，完全移除对外部 UnRAR 工具的依赖
- 进度条从 9 阶段优化为 7 阶段，更符合实际处理流程
- 添加统一的跨平台工具层 (platform-utils.ts)

#### 跨平台改进
- 所有临时文件使用 `os.tmpdir()`，自动适配各平台
- 路径操作统一使用 `path.join()`，无需手动处理分隔符
- Windows 路径处理与非 Windows 平台完全隔离

#### 清理优化
- RAR 提取后自动扁平化目录结构，确保 Python 能正确扫描
- 任务完成后自动清理临时目录，无残留文件
- 移除大量死代码 (validate_source.py 等)

#### 安全升级
- Electron 升级到 41.0.3，修复 Heap Buffer Overflow 和 ASAR Integrity Bypass 漏洞
- xlsx 库替换为 exceljs，消除 Prototype Pollution 和 ReDoS 漏洞

#### 问题修复
- 修复 RAR 文件验证失败时仍返回 valid:true 的问题
- 修复 7z 文件无验证直接放行的问题
- 修复 reset 函数重置后保留文件状态的问题
- 修复取消操作后状态转换不正确的问题
- 修复 Python 进度解析正则表达式混用 ASCII/Unicode 连字符的问题
- 修复内存缓存无清理机制的问题

### v1.0.4 (2026-03-22)

- 重构项目结构，模块职责分离
- 优化进度显示组件
- 修复跨平台兼容性问题

### v1.0.3 (2026-03)

- 重新设计进度条组件

### v1.0.0

- 初始版本发布
- 支持自动更新功能
