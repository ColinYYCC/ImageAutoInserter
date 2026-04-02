# ImageAutoInserter 项目规格说明书

**项目名称**: ImageAutoInserter（图片自动插入工具）
**版本**: 1.0.7
**更新日期**: 2026-03-28
**文档类型**: 项目规格说明书

---

## 一、项目概述

### 1.1 项目简介

ImageAutoInserter 是一款基于 Electron + Python 混合架构的桌面应用程序，主要功能是根据商品编码自动将图片嵌入 Excel 表格的指定单元格中。

### 1.2 核心功能

| 功能 | 描述 | 优先级 |
|------|------|--------|
| Excel 图片插入 | 根据商品编码自动匹配并插入图片 | P0 |
| 多格式支持 | 支持文件夹、ZIP、RAR、7Z 格式的图片来源 | P0 |
| 实时进度显示 | 9 个细粒度处理阶段 + 平滑动画 | P1 |
| 自动更新 | 支持 GitHub  releases 自动检查和下载更新 | P2 |
| 跨平台支持 | macOS (ARM64) / Windows (x86-64) | P1 |

---

## 二、技术架构

### 2.1 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 18.2.0 |
| 状态管理 | Zustand | 4.5.0 |
| 构建工具 | Vite | 5.0.0 |
| 桌面框架 | Electron | 27.0.0 |
| 后端语言 | Python | 3.8+ |
| Excel 处理 | xlsx (js) / openpyxl (Python) | - |
| 图片处理 | Pillow (Python) | - |
| 压缩处理 | 7zip-min / adm-zip / unrar-promise | - |
| 测试框架 | Vitest + Playwright | 1.1.0 / 1.58.2 |

### 2.2 项目结构

```
ImageAutoInserter/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── main.ts              # 入口文件
│   │   ├── preload.ts           # 预加载脚本
│   │   ├── path-config.ts       # 统一路径管理模块
│   │   ├── servers/             # 服务器管理模块
│   │   │   ├── dev-server-manager.ts  # Vite 开发服务器管理
│   │   │   └── window-manager.ts      # 窗口管理
│   │   ├── handlers/            # IPC 处理器模块
│   │   │   ├── file-handlers.ts        # 文件选择/验证
│   │   │   ├── process-handlers.ts     # 处理流程控制
│   │   │   ├── excel-validation-handler.ts  # Excel 验证
│   │   │   └── update-handlers.ts      # 自动更新
│   │   ├── utils/               # 工具函数
│   │   │   ├── async-file.ts        # 异步文件操作
│   │   │   ├── async-logger.ts      # 异步日志系统
│   │   │   ├── logging.ts           # 日志封装
│   │   │   ├── path-validator.ts    # 路径验证
│   │   │   └── permissions.ts       # 权限管理
│   │   └── platform/               # 统一平台适配层
│   │       └── index.ts             # PlatformAdapter 单例
│   ├── renderer/                # React 渲染进程
│   │   ├── components/          # UI 组件
│   │   │   ├── FilePicker.tsx
│   │   │   ├── ProcessingPage.tsx
│   │   │   ├── ResultView.tsx
│   │   │   ├── AdvancedProgressBar.tsx
│   │   │   └── ...
│   │   ├── hooks/               # 状态管理
│   │   │   ├── useAppStore.ts   # Zustand 状态存储
│   │   │   ├── useAppState.ts   # 状态 Hook
│   │   │   ├── useProcessor.ts  # 处理 Hook
│   │   │   └── useFilePicker.ts  # 文件选择 Hook
│   │   ├── App.tsx              # 根组件
│   │   └── main.tsx             # 渲染进程入口
│   ├── core/                    # Python 核心模块
│   │   ├── models/              # 数据模型
│   │   │   └── __init__.py
│   │   ├── loaders/             # 文件加载器
│   │   │   ├── base_loader.py   # 基础加载器
│   │   │   ├── folder_loader.py # 文件夹加载
│   │   │   ├── zip_loader.py    # ZIP 加载
│   │   │   └── rar_loader.py    # RAR 加载
│   │   ├── matchers/            # 图片匹配引擎
│   │   │   └── image_matcher.py
│   │   ├── pipeline/            # 处理编排
│   │   │   └── orchestrator.py
│   │   ├── reports/             # 报告生成
│   │   │   ├── report_models.py
│   │   │   ├── report_storage.py
│   │   │   └── report_cleanup.py
│   │   ├── process_engine.py    # 入口（导出）
│   │   ├── excel_processor.py   # Excel 处理
│   │   ├── image_processor.py   # 图片处理
│   │   └── ...
│   ├── shared/                  # 共享类型定义
│   └── utils/                   # Python 工具模块
├── tests/                       # 测试文件
│   ├── e2e/                     # E2E 测试
│   └── *.test.ts / test_*.py   # 单元测试
└── package.json
```

### 2.3 IPC 通信架构

```
┌─────────────────┐     IPC      ┌─────────────────┐
│   Renderer      │ ──────────▶ │     Main        │
│   (React UI)    │             │   (Electron)   │
│                 │ ◀────────── │                 │
└─────────────────┘             └────────┬────────┘
                                          │ spawn
                                          ▼
                                 ┌─────────────────┐
                                 │    Python       │
                                 │  (Child Process)│
                                 └─────────────────┘
```

### 2.4 状态管理架构

```
┌─────────────────────────────────────────────────────────┐
│                    React Renderer                       │
│  ┌─────────────┐    ┌─────────────┐    ┌────────────┐ │
│  │ useAppState │ ◀─ │ useAppStore │    │  Zustand   │ │
│  │   (Hook)    │    │   (Store)   │ ◀─ │  (State)   │ │
│  └─────────────┘    └─────────────┘    └────────────┘ │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                    Electron Main                        │
│  ┌─────────────┐    ┌─────────────┐    ┌───────────┐ │
│  │ file-handlers│   │process-handlers│  │python-bridge│
│  └─────────────┘    └─────────────┘    └───────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 三、功能规格

### 3.1 用户工作流程

```
┌──────────────────────────────────────────────────────────────┐
│                        用户操作流程                           │
├──────────────────────────────────────────────────────────────┤
│  1. 选择图片来源 ──▶ 2. 选择 Excel ──▶ 3. 开始处理 ──▶ 4. 完成 │
│        │                │                │                │
│        ▼                ▼                ▼                ▼
│   支持文件夹/        支持 .xlsx      9阶段进度条        结果展示
│   ZIP/RAR/7Z        文件验证         实时更新           打开文件
└──────────────────────────────────────────────────────────────┘
```

### 3.2 核心功能模块

#### 3.2.1 主进程模块 (Electron Main)

| 模块 | 职责 | 文件 |
|------|------|------|
| 路径管理 | 统一路径管理 | `path-config.ts` |
| 服务器管理 | Vite 开发服务器启动/停止 | `servers/dev-server-manager.ts` |
| 窗口管理 | 窗口创建/控制 | `servers/window-manager.ts` |
| 文件处理 | 文件选择/路径处理 | `handlers/file-handlers.ts` |
| 进程处理 | Python 进程启动/通信 | `handlers/process-handlers.ts` |
| Excel 验证 | Excel 文件验证 | `handlers/excel-validation-handler.ts` |
| 更新管理 | 自动更新检查/下载 | `handlers/update-handlers.ts` |

#### 3.2.2 渲染进程模块 (React)

| 模块 | 职责 | 文件 |
|------|------|------|
| 状态存储 | Zustand 全局状态 | `hooks/useAppStore.ts` |
| 状态 Hook | 状态操作封装 | `hooks/useAppState.ts` |
| 文件选择 | 文件选择交互 | `hooks/useFilePicker.ts` |
| 处理 Hook | 处理流程控制 | `hooks/useProcessor.ts` |

#### 3.2.3 Python 核心模块

| 模块 | 职责 | 文件 |
|------|------|------|
| 数据模型 | 数据结构定义 | `core/models.py` |
| 文件加载 | 多格式文件加载 | `core/loaders/*.py` |
| 图片匹配 | 商品编码匹配 | `core/matchers/image_matcher.py` |
| 处理编排 | 处理流程控制 | `core/pipeline/orchestrator.py` |
| 报告生成 | 结果报告输出 | `core/reports/*.py` |

### 3.3 数据流

```
图片来源 ──▶ 解压/扫描 ──▶ 图片缓存 ──▶ 匹配引擎 ──▶ Excel 写入 ──▶ 输出文件
              │                         │
              ▼                         ▼
         进度上报                    错误处理
```

### 3.4 配置项

| 配置项 | 类型 | 默认值 | 环境变量 |
|--------|------|--------|----------|
| Python 解释器 | string | python3 / python | PYTHON_EXECUTABLE |
| 日志级别 | string | info | LOG_LEVEL |
| 窗口宽度 | number | 1100 | - |
| 窗口高度 | number | 800 | - |
| Vite 端口 | number | 5173 | VITE_PORT |

---

## 四、界面规格

### 4.1 页面结构

| 页面 | 组件 | 描述 |
|------|------|------|
| 欢迎页 | WelcomeGuide | 初始引导界面 |
| 处理页 | ProcessingPage | 包含文件选择和进度显示 |
| 结果页 | ResultView | 处理结果展示 |

### 4.2 UI 组件

| 组件 | 类型 | 描述 |
|------|------|------|
| FilePicker | 容器组件 | 文件选择区域 |
| ProgressBar | 进度组件 | 9阶段细粒度进度条 |
| AdvancedProgressBar | 进度组件 | 带 shimmer 动画的进度条 |
| RobotLoader | 加载动画 | 处理中机器人动画 |
| ErrorDialog | 对话框 | 错误信息展示 |
| UpdateNotification | 通知组件 | 自动更新提示 |

### 4.3 样式规范

| 属性 | 规范 |
|------|------|
| 字体 | NotoSansSC / DINAlternate-Bold |
| 主题色 | #4A90D9 (主色) / #6C757D (次要) |
| 圆角 | 8px (按钮) / 12px (卡片) |
| 阴影 | 0 2px 8px rgba(0,0,0,0.1) |

---

## 五、性能规格

### 5.1 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 启动时间 | < 3s | 从点击到界面可交互 |
| 文件验证 | < 500ms | 单个文件验证响应 |
| 处理速度 | > 100 商品/分钟 | 取决于图片数量和文件 I/O |
| 内存占用 | < 500MB | 正常使用峰值 |

### 5.2 进度阶段定义

| 阶段 | 百分比范围 | 描述 |
|------|------------|------|
| 0 | 0-5% | 初始化 |
| 1 | 5-15% | 解压文件 |
| 2 | 15-25% | 扫描图片 |
| 3 | 25-35% | 读取 Excel |
| 4 | 35-45% | 匹配图片 |
| 5 | 45-65% | 插入图片 |
| 6 | 65-75% | 保存文件 |
| 7 | 75-95% | 清理资源 |
| 8 | 95-100% | 完成 |

---

## 六、安全规格

### 6.1 输入验证

- 所有文件路径必须验证存在性
- Excel 文件必须验证格式和内容
- 压缩包必须验证完整性
- 禁止执行用户提供的可执行文件

### 6.2 路径安全

- 禁止路径穿越攻击 (../)
- 禁止执行包含特殊字符的路径
- Windows 路径使用反斜杠转义

### 6.3 日志安全

- 禁止记录敏感文件路径
- 禁止记录用户数据内容
- 日志文件限制大小 (max 10MB)

---

## 七、测试规格

### 7.1 测试类型

| 类型 | 工具 | 覆盖目标 |
|------|------|----------|
| 单元测试 | Vitest | 工具函数、组件逻辑 |
| 集成测试 | Python unittest | Excel/Image 处理模块 |
| E2E 测试 | Playwright | 完整用户流程 |

### 7.2 测试结果

| 测试类型 | 测试数 | 状态 |
|----------|--------|------|
| Python 单元测试 | 58 | ✅ 全部通过 |
| TypeScript 单元测试 | 13 | ✅ 全部通过 |
| E2E 测试 | 30+ | ✅ 核心流程通过 |

### 7.3 E2E 测试场景

| 场景 | 优先级 | 状态 |
|------|--------|------|
| 完整用户工作流 | P1 | ✅ 已实现 |
| 文件验证流程 | P1 | ✅ 已实现 |
| 错误处理和恢复 | P1 | ✅ 已实现 |
| 跨平台路径处理 | P1 | ✅ 已实现 |
| 处理取消功能 | P2 | ✅ 已实现 |
| 多文件连续处理 | P2 | ✅ 已实现 |

---

## 八、发布规格

### 8.1 发布平台

| 平台 | 格式 | 架构 |
|------|------|------|
| macOS | .dmg | ARM64 (Apple Silicon) |
| macOS | .dmg | x86-64 |
| Windows | .exe (NSIS) | x86-64 |

### 8.2 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.7 | 2026-03-28 | 路径管理重构，统一路径管理模块 |
| 1.0.6 | 2026-03-27 | 跨平台架构重构，异步文件操作 |
| 1.0.5 | 2026-03-25 | WASM RAR 处理，安全升级 |
| 1.0.4 | 2026-03-24 | 重构项目结构，模块职责分离 |
| 1.0.3 | 2026-03 | 重新设计进度条组件 |
| 1.0.2 | - | 修复 Electron 子进程问题 |
| 1.0.1 | - | 修复 Apple Silicon 兼容性 |
| 1.0.0 | - | 初始版本发布 |

### 8.3 自动更新

- 使用 electron-updater
- 通过 GitHub Releases 检查更新
- 支持后台下载和用户提示

---

## 九、重构记录

### 9.1 路径管理重构 (2026-03-28)

项目采用统一的路径管理模块 `path-config.ts`，集中管理所有路径：

| 路径类型 | 管理函数 | 说明 |
|----------|----------|------|
| 日志路径 | getLogDirectory(), getLogFilePath() | 日志文件统一管理 |
| 临时目录 | getTempDirectory(), getReportTempDirectory() | 临时文件管理 |
| 资源路径 | getPythonScriptPath(), getPreloadScriptPath() | 应用资源路径 |
| 缓存路径 | getCacheDirectory(), getVitePortCachePath() | 缓存文件管理 |
| 系统路径 | getDesktopPath(), getDocumentsPath() | 系统目录访问 |

**路径管理规范：**
- 所有业务模块通过 `path-config.ts` 获取路径
- 禁止直接调用 `app.getPath()` 或 `process.resourcesPath`
- 路径统一管理确保开发/生产环境一致性

### 9.2 跨平台架构 (2026-03-27)

项目采用统一的 `PlatformAdapter` 模式管理跨平台差异：

| 功能 | macOS | Windows |
|------|-------|---------|
| 平台检测 | ✅ | ✅ |
| Python 搜索 | Homebrew | 多位置 + where 命令 |
| 进程终止 | SIGTERM | taskkill |
| 路径处理 | / | \\ + 长路径 |
| 日志系统 | 异步 | 异步 |

### 9.3 异步文件操作 (2026-03-27)

高频文件操作使用异步模式，避免阻塞主线程：

| 模块 | 功能 |
|------|------|
| async-file.ts | safeWriteFile, safeAppendFile, safeReadTextFile |
| async-logger.ts | 异步日志写入，日志轮转 |

### 9.4 重构概述 (2026-03-24)

本次重构将单一的大型模块拆分为职责明确的小模块，提升代码可维护性和可测试性。

### 9.5 TypeScript 重构

| 原文件 | 行数 | 拆分后 |
|--------|------|--------|
| main.ts | 636 → 112 | servers/, handlers/ |
| ipc-handlers.ts | 846 → 82 | handlers/*.ts |
| - | - | servers/dev-server-manager.ts |
| - | - | servers/window-manager.ts |

### 9.6 Python 重构

| 原文件 | 行数 | 拆分后 |
|--------|------|--------|
| process_engine.py | 713 → 24 | models/, loaders/, matchers/, pipeline/, reports/ |

### 9.7 React 重构

| 变更 | 说明 |
|------|------|
| 引入 Zustand | 替换 useState 为全局状态管理 |
| useAppStore.ts | Zustand store 定义 |
| useAppState.ts | 状态操作 Hook 封装 |
| useProcessor.ts | 处理流程 Hook |

---

## 十、文档历史

| 版本 | 日期 | 修改内容 |
|------|------|----------|
| 1.0.0 | - | 初始版本发布 |
| 1.0.1 | - | 修复 Apple Silicon 兼容性 |
| 1.0.2 | - | 修复 Electron 子进程问题 |
| 1.0.3 | 2026-03 | 重新设计进度条组件 |
| 1.1.0 | 2026-03-24 | 完善 spec 文档 |
| 1.1.1 | 2026-03-24 | 更新重构后的项目结构 |
| 1.1.2 | 2026-03-28 | 添加路径管理模块文档 |

---

*文档创建时间: 2026-03-24*
*最后更新: 2026-03-28*
*版本: 1.0.7*
