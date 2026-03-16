# ImageAutoInserter 项目规格说明书

> **版本**: v2.0  
> **创建日期**: 2026-03-12  
> **最后更新**: 2026-03-12  
> **状态**: 生产就绪  
> **适用范围**: 桌面端应用程序（Windows/macOS）

---

## 目录

1. [项目概述](#项目概述)
2. [技术架构](#技术架构)
3. [核心功能](#核心功能)
4. [项目结构](#项目结构)
5. [组件规格](#组件规格)
6. [数据流与状态管理](#数据流与状态管理)
7. [API 接口规格](#api-接口规格)
8. [测试规格](#测试规格)
9. [部署与构建](#部署与构建)
10. [已知问题与限制](#已知问题与限制)

---

## 项目概述

### 项目简介

ImageAutoInserter 是一款自动化工具，专门用于将商品图片批量嵌入到 Excel 表格中。通过智能识别商品编码，自动匹配对应的图片并嵌入到指定位置，大幅提升验图工作效率。

### 核心价值

- **自动化**: 无需手动操作，自动匹配和插入图片
- **准确性**: 精确识别商品编码和图片
- **高效性**: 快速处理大量数据
- **易用性**: 现代化图形界面，简单直观

### 目标用户

- **主要用户**: 办公室文员、电商运营人员
- **使用场景**: 批量处理商品图片插入 Excel
- **技术能力**: 基本电脑操作能力

### 平台支持

- Windows 10/11 (x64, ia32)
- macOS 12+ (x64, arm64)

---

## 技术架构

### 整体架构

```
┌─────────────────────────────────────────────────────┐
│              Electron 应用框架                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────┐      IPC      ┌─────────────┐│
│  │  渲染进程        │◄────────────►│  主进程      ││
│  │  (React + TS)   │              │  (Node.js)  ││
│  └─────────────────┘              └──────┬──────┘│
│                                          │        │
│                                          │ spawn  │
│                                          ▼        │
│                                   ┌─────────────┐│
│                                   │  Python     ││
│                                   │  子进程     ││
│                                   │  (核心逻辑) ││
│                                   └─────────────┘│
└─────────────────────────────────────────────────────┘
```

### 技术栈

#### 前端 (渲染进程)

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.2.0 | UI 框架 |
| TypeScript | 5.3.3 | 类型安全 |
| Vite | 5.0.0 | 构建工具 |
| CSS Modules | - | 样式隔离 |

#### 桌面框架 (主进程)

| 技术 | 版本 | 用途 |
|------|------|------|
| Electron | 27.0.0 | 桌面应用框架 |
| Node.js | - | 运行时环境 |
| electron-store | 8.1.0 | 本地存储 |

#### 后端 (核心逻辑)

| 技术 | 版本 | 用途 |
|------|------|------|
| Python | 3.8+ | 核心处理逻辑 |
| openpyxl | 3.x | Excel 处理 |
| Pillow | 10.x | 图片处理 |
| rarfile | 4.x | RAR 压缩包支持 |

### 架构分层

```
┌─────────────────────────────────────────┐
│  表现层 (Presentation Layer)             │
│  - React 组件                            │
│  - 状态管理 Hooks                        │
│  - 样式系统                              │
├─────────────────────────────────────────┤
│  应用层 (Application Layer)              │
│  - IPC 通信                              │
│  - 进程管理                              │
│  - 文件系统访问                          │
├─────────────────────────────────────────┤
│  业务层 (Business Layer)                 │
│  - 图片匹配逻辑                          │
│  - Excel 处理逻辑                        │
│  - 错误处理机制                          │
├─────────────────────────────────────────┤
│  基础设施层 (Infrastructure Layer)       │
│  - 文件 I/O                              │
│  - 图片处理                              │
│  - 压缩包处理                            │
└─────────────────────────────────────────┘
```

---

## 核心功能

### 功能 1：图片提取与匹配

**描述**: 从文件夹或压缩包中提取图片，并根据商品编码进行匹配。

**输入**:
- 图片源路径（文件夹/ZIP/RAR/7Z）
- 图片命名格式：`{商品编码}-{序号}.{格式}`

**输出**:
- 图片数据列表（ImageInfo[]）
- 商品编码到图片的映射关系

**处理流程**:
```
1. 识别图片源类型（文件夹/ZIP/RAR）
   ↓
2. 遍历并提取图片文件
   ↓
3. 解析文件名，提取商品编码和序号
   ↓
4. 加载图片到内存（流式加载）
   ↓
5. 建立 ImageMatcher 索引
```

**支持格式**:
- 图片: JPG, JPEG, PNG
- 压缩包: ZIP, RAR, 7Z

**关键特性**:
- 完全内存处理，不解压到临时文件
- 流式加载，内存优化
- 缓存管理（最大 50MB）

### 功能 2：Excel 表格处理

**描述**: 读取 Excel 文件，识别表头，添加 Picture 列，嵌入图片。

**输入**:
- Excel 文件路径（.xlsx）
- 图片匹配器（ImageMatcher）

**输出**:
- 带图片的 Excel 文件（{原文件名}_含图.xlsx）

**处理流程**:
```
1. 读取 Excel 文件
   ↓
2. 查找包含「商品编码」列的工作表
   ↓
3. 动态识别表头位置
   ↓
4. 检查并添加 Picture 列（1-10）
   ↓
5. 逐行处理，匹配图片
   ↓
6. 嵌入图片到单元格
   ↓
7. 高亮未匹配的商品编码
   ↓
8. 保存输出文件
```

**关键特性**:
- 动态表头识别（表头不一定在第一行）
- 智能列位置查找
- Picture 字段变体支持（24 种）
- 图片尺寸固定为 180×138 像素

### 功能 3：进度显示与错误处理

**描述**: 实时显示处理进度，提供详细的错误信息。

**进度信息**:
- 当前处理进度（百分比）
- 当前处理动作
- 当前商品编码
- 预估剩余时间

**错误处理**:
- 错误分类（FILE_NOT_FOUND, PERMISSION_DENIED, MEMORY_ERROR 等）
- 详细错误信息（包含 traceback）
- 友好的解决方案提示
- 错误报告生成

---

## 项目结构

### 目录结构

```
ImageAutoInserter/
├── src/                          # 源代码
│   ├── main/                     # Electron 主进程
│   │   ├── main.ts              # 主进程入口
│   │   ├── preload.ts           # 预加载脚本
│   │   ├── ipc-handlers.ts      # IPC 处理器
│   │   └── utils/               # 工具函数
│   │       └── permissions.ts   # 权限处理
│   │
│   ├── renderer/                 # 渲染进程（React）
│   │   ├── App.tsx              # 应用主组件
│   │   ├── main.tsx             # 渲染进程入口
│   │   ├── components/          # UI 组件
│   │   │   ├── FilePicker.tsx   # 文件选择器
│   │   │   ├── ProcessingPage.tsx # 处理页面
│   │   │   ├── ProgressBar.tsx  # 进度条
│   │   │   ├── ResultView.tsx   # 结果视图
│   │   │   ├── ErrorDialog.tsx  # 错误对话框
│   │   │   ├── WelcomeGuide.tsx # 欢迎引导
│   │   │   └── Icons.tsx        # 图标组件
│   │   ├── hooks/               # React Hooks
│   │   │   ├── useAppState.tsx  # 状态管理
│   │   │   ├── useFilePicker.ts # 文件选择逻辑
│   │   │   ├── useProcessor.ts  # 处理逻辑
│   │   │   └── useTheme.ts      # 主题管理
│   │   └── utils/               # 工具函数
│   │       └── errorHandler.ts  # 错误处理
│   │
│   ├── core/                     # Python 核心逻辑
│   │   ├── process_engine.py    # 处理引擎
│   │   ├── excel_processor.py   # Excel 处理器
│   │   ├── image_processor.py   # 图片处理器
│   │   └── picture_variant.py   # Picture 变体识别
│   │
│   ├── python/                   # Python 接口层
│   │   ├── gui_processor.py     # GUI 版本处理器
│   │   └── processor.py         # CLI 版本处理器
│   │
│   ├── shared/                   # 共享类型定义
│   │   └── types.ts             # TypeScript 类型
│   │
│   └── utils/                    # Python 工具
│       ├── config.py            # 配置管理
│       ├── path_manager.py      # 路径管理
│       └── text_formatter.py    # 文本格式化
│
├── tests/                        # 测试文件
│   ├── setup.ts                 # 测试配置
│   └── ProgressBar.test.tsx     # 组件测试
│
├── docs/                         # 文档
│   ├── architecture/            # 架构文档
│   ├── guides/                  # 使用指南
│   └── test-reports/            # 测试报告
│
├── Sample/                       # 示例文件
│   └── xxx/                     # 示例图片
│
├── dist/                         # 构建输出
├── release/                      # 发布包
├── package.json                  # 项目配置
├── vite.main.config.ts          # 主进程构建配置
├── vite.renderer.config.ts      # 渲染进程构建配置
└── vitest.config.ts             # 测试配置
```

### 文件职责说明

| 文件/目录 | 职责 | 关键功能 |
|----------|------|---------|
| `src/main/main.ts` | 主进程入口 | 创建窗口、生命周期管理 |
| `src/main/ipc-handlers.ts` | IPC 通信 | 文件选择、进程管理、验证 |
| `src/renderer/App.tsx` | 应用主组件 | 状态管理、页面切换 |
| `src/renderer/components/` | UI 组件 | 文件选择、进度显示、结果展示 |
| `src/renderer/hooks/` | 状态管理 | 应用状态、文件选择、处理逻辑 |
| `src/core/process_engine.py` | 处理引擎 | 完整处理流程、错误处理 |
| `src/core/excel_processor.py` | Excel 处理 | 表头识别、列添加、图片嵌入 |
| `src/core/image_processor.py` | 图片处理 | 图片加载、匹配、缓存管理 |
| `src/python/gui_processor.py` | GUI 接口 | JSON 通信、进度更新 |

---

## 组件规格

### 1. FilePicker 组件

**位置**: `src/renderer/components/FilePicker.tsx`

**职责**: 文件选择器，支持 Excel 文件和图片源选择。

**Props**:
```typescript
interface FilePickerProps {
  step: number;                    // 步骤编号
  label: string;                   // 标签文本
  iconType: 'folder' | 'excel';    // 图标类型
  accept: string;                  // 接受的文件类型
  value: FileInfo | null;          // 当前选择的文件
  onChange: (file: FileInfo) => void; // 文件变更回调
  isFolder?: boolean;              // 是否为文件夹选择
  disabled?: boolean;              // 是否禁用
  hint?: string;                   // 提示文本
  showDetails?: boolean;           // 是否显示详情
  onValidationChange?: (valid: boolean) => void; // 验证状态变更
}
```

**状态**:
- 文件信息显示（名称、大小、类型）
- 验证状态（有效/无效）
- 错误提示

**交互**:
- 点击打开文件选择对话框
- 拖拽文件到组件
- 显示文件验证结果

### 2. ProcessingPage 组件

**位置**: `src/renderer/components/ProcessingPage.tsx`

**职责**: 处理页面，显示进度和结果。

**Props**:
```typescript
interface ProcessingPageProps {
  progress: number;                // 进度百分比
  current: string;                 // 当前动作
  total?: number;                  // 总行数
  result?: ProcessingResult;       // 处理结果
  error?: AppError;               // 错误信息
  onCancel: () => void;           // 取消回调
  onOpenFile: () => void;         // 打开文件回调
  onReset: () => void;            // 重置回调
}
```

**显示状态**:
- 处理中：进度条、当前动作、剩余时间
- 完成：成功/失败统计、打开文件按钮
- 错误：错误信息、解决方案、重试按钮

### 3. ProgressBar 组件

**位置**: `src/renderer/components/ProgressBar.tsx`

**职责**: 进度条显示。

**Props**:
```typescript
interface ProgressBarProps {
  progress: number;                // 进度百分比 (0-100)
  label?: string;                  // 标签文本
  showPercentage?: boolean;        // 是否显示百分比
}
```

**特性**:
- 平滑动画过渡
- 颜色渐变（根据进度）
- 响应式宽度

### 4. ResultView 组件

**位置**: `src/renderer/components/ResultView.tsx`

**职责**: 结果展示。

**Props**:
```typescript
interface ResultViewProps {
  result: ProcessingResult;        // 处理结果
  onOpenFile: () => void;         // 打开文件回调
  onReset: () => void;            // 重置回调
}
```

**显示内容**:
- 成功/失败/跳过统计
- 成功率
- 输出文件路径
- 操作按钮

### 5. ErrorDialog 组件

**位置**: `src/renderer/components/ErrorDialog.tsx`

**职责**: 错误对话框显示。

**Props**:
```typescript
interface ErrorDialogProps {
  error: AppError;                // 错误信息
  onRetry?: () => void;           // 重试回调
  onDismiss: () => void;          // 关闭回调
}
```

**显示内容**:
- 错误类型
- 错误消息
- 解决方案
- 操作按钮

---

## 数据流与状态管理

### 应用状态定义

```typescript
type AppState = 
  | { phase: 'IDLE'; excelFile?: FileInfo; imageSource?: FileInfo }
  | { phase: 'READY'; excelFile: FileInfo; imageSource: FileInfo }
  | { phase: 'PROCESSING'; excelFile: FileInfo; imageSource: FileInfo; progress: number; current: string; total?: number }
  | { phase: 'COMPLETE'; result: ProcessingResult; excelFile?: FileInfo; imageSource?: FileInfo }
  | { phase: 'ERROR'; error: AppError; excelFile?: FileInfo; imageSource?: FileInfo };
```

### 状态转换图

```
┌──────┐
│ IDLE │
└──┬───┘
   │ 选择文件
   ▼
┌───────┐
│ READY │
└───┬───┘
    │ 开始处理
    ▼
┌────────────┐
│ PROCESSING │
└───┬───┬────┘
    │   │
    │   └─ 取消 ──► IDLE
    │
    ▼
┌──────────┬──────────┐
│ COMPLETE │  ERROR   │
└──────────┴──────────┘
    │            │
    └─────┬──────┘
          ▼
        RESET ──► IDLE
```

### 数据流向

```
用户操作
   ↓
React 组件
   ↓
useAppState Hook
   ↓
IPC 调用 (window.electronAPI)
   ↓
Electron 主进程 (ipc-handlers.ts)
   ↓
Python 子进程 (gui_processor.py)
   ↓
核心处理引擎 (process_engine.py)
   ↓
进度/结果回调
   ↓
IPC 消息 (progress/complete/error)
   ↓
React 状态更新
   ↓
UI 更新
```

### Action 类型

```typescript
type AppAction =
  | { type: 'SELECT_EXCEL'; payload: FileInfo }
  | { type: 'SELECT_IMAGES'; payload: FileInfo }
  | { type: 'CLEAR_EXCEL' }
  | { type: 'CLEAR_IMAGES' }
  | { type: 'START' }
  | { type: 'PROGRESS'; payload: { percent: number; current: string; total?: number } }
  | { type: 'COMPLETE'; payload: ProcessingResult }
  | { type: 'ERROR'; payload: AppError }
  | { type: 'RESET' };
```

---

## API 接口规格

### IPC 接口（主进程 ←→ 渲染进程）

#### 1. select-file

**描述**: 打开文件选择对话框。

**请求**:
```typescript
{
  title: string;      // 对话框标题
  isFolder: boolean;  // 是否选择文件夹
}
```

**响应**:
```typescript
FileInfo | null
```

#### 2. validate-file

**描述**: 验证文件格式和可访问性。

**请求**:
```typescript
{
  filePath: string;  // 文件路径
  accept: string;    // 接受的类型（如：.xlsx,.zip）
}
```

**响应**:
```typescript
{
  valid: boolean;
  error?: string;
}
```

#### 3. validate-image-source

**描述**: 验证图片源是否包含支持的图片格式。

**请求**:
```typescript
{
  sourcePath: string;  // 图片源路径
}
```

**响应**:
```typescript
{
  valid: boolean;
  error?: string;
  resolution?: string;
  supportedCount?: number;
  totalFiles?: number;
}
```

#### 4. validate-excel-columns

**描述**: 验证 Excel 文件是否包含"商品编码"列。

**请求**:
```typescript
{
  filePath: string;  // Excel 文件路径
}
```

**响应**:
```typescript
{
  valid: boolean;
  error?: string;
  resolution?: string;
}
```

#### 5. start-process

**描述**: 开始处理流程。

**请求**:
```typescript
{
  excelPath: string;       // Excel 文件路径
  imageSourcePath: string; // 图片源路径
}
```

**响应**:
```typescript
{
  success: boolean;
  result?: ProcessingResult;
  error?: AppError;
}
```

#### 6. cancel-process

**描述**: 取消处理流程。

**请求**: 无

**响应**:
```typescript
{
  success: boolean;
  error?: string;
}
```

#### 7. open-file

**描述**: 打开文件（使用系统默认程序）。

**请求**:
```typescript
{
  filePath: string;  // 文件路径
}
```

**响应**:
```typescript
{
  success: boolean;
  error?: string;
}
```

### Python 接口（主进程 ←→ Python 子进程）

#### 进度消息

```json
{
  "type": "progress",
  "payload": {
    "percent": 67.5,
    "current": "正在处理 C000641234100...",
    "total": 120,
    "current_row": 80
  }
}
```

#### 完成消息

```json
{
  "type": "complete",
  "payload": {
    "total": 120,
    "success": 95,
    "failed": 25,
    "successRate": 79.17,
    "outputPath": "/path/to/output.xlsx",
    "errors": [...]
  }
}
```

#### 错误消息

```json
{
  "type": "error",
  "payload": {
    "type": "FILE_NOT_FOUND",
    "message": "文件未找到：/path/to/file.xlsx",
    "resolution": "请检查文件路径是否正确"
  }
}
```

---

## 测试规格

### 测试框架

- **测试运行器**: Vitest
- **测试库**: React Testing Library
- **覆盖率工具**: @vitest/coverage-v8

### 测试类型

#### 1. 单元测试

**范围**: Python 核心逻辑

- 图片处理器测试
- Excel 处理器测试
- 商品编码匹配测试
- Picture 变体识别测试

**覆盖率目标**: > 80%

#### 2. 组件测试

**范围**: React 组件

- FilePicker 组件测试
- ProgressBar 组件测试
- ProcessingPage 组件测试
- ResultView 组件测试

**测试内容**:
- 组件渲染
- 用户交互
- 状态变化
- 边界条件

#### 3. 集成测试

**范围**: 完整处理流程

- 文件选择 → 处理 → 结果展示
- 错误处理流程
- 取消处理流程

#### 4. 端到端测试

**范围**: 用户场景

- 完整的用户工作流
- 多平台测试（Windows/macOS）

### 测试命令

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行测试 UI
npm run test:ui

# 运行单次测试
npm run test:run
```

---

## 部署与构建

### 构建命令

```bash
# 开发模式
npm run dev

# 构建所有模块
npm run build

# 构建主进程
npm run build:main

# 构建预加载脚本
npm run build:preload

# 构建渲染进程
npm run build:renderer

# 预览构建结果
npm run preview
```

### 构建配置

#### 主进程构建 (vite.main.config.ts)

- 入口: `src/main/main.ts`
- 输出: `dist/main/main.js`
- 格式: CommonJS
- 外部依赖: electron

#### 预加载脚本构建 (vite.preload.config.ts)

- 入口: `src/main/preload.ts`
- 输出: `dist/main/preload.js`
- 格式: CommonJS

#### 渲染进程构建 (vite.renderer.config.ts)

- 入口: `src/renderer/main.tsx`
- 输出: `dist/renderer/`
- 格式: ESM
- 插件: React

### 发布配置

```json
{
  "build": {
    "appId": "com.imageautoinserter.app",
    "productName": "ImageAutoInserter",
    "directories": {
      "output": "release"
    },
    "mac": {
      "category": "public.app-category.productivity",
      "target": [
        { "target": "dmg", "arch": ["x64", "arm64"] }
      ]
    },
    "win": {
      "target": [
        { "target": "nsis", "arch": ["x64", "ia32"] }
      ]
    }
  }
}
```

### 环境要求

**开发环境**:
- Node.js 18+
- Python 3.8+
- npm 或 yarn

**运行环境**:
- Windows 10/11 或 macOS 12+
- Python 3.8+（打包时需包含）

---

## 已知问题与限制

### 已知问题

1. **大文件处理**
   - 问题: 超过 100MB 的 Excel 文件可能导致处理缓慢
   - 解决方案: 显示警告，建议拆分文件

2. **内存占用**
   - 问题: 处理大量高分辨率图片时内存占用较高
   - 解决方案: 流式加载、缓存管理（最大 50MB）

3. **跨平台路径**
   - 问题: Windows 和 macOS 路径分隔符不同
   - 解决方案: 使用 pathlib 处理路径

### 功能限制

1. **Excel 格式**
   - 仅支持 .xlsx 格式
   - 不支持 .xls 旧格式

2. **图片格式**
   - 仅支持 JPG、JPEG、PNG
   - 不支持 GIF、BMP 等格式

3. **商品编码**
   - 必须精确匹配「商品编码」
   - 不接受变体（产品编码、SKU 等）

4. **单文件处理**
   - 当前版本一次处理一个 Excel 文件

### 性能限制

- 处理速度: 约 100 行/30 秒
- 最大图片数: 每个商品最多 10 张图片
- 最大缓存: 50MB

---

## 附录

### A. 错误代码速查表

| 错误代码 | 描述 | 解决方案 |
|---------|------|---------|
| FILE_NOT_FOUND | 文件未找到 | 检查文件路径 |
| PERMISSION_DENIED | 权限不足 | 检查文件权限 |
| INVALID_FORMAT | 格式无效 | 检查文件格式 |
| MEMORY_ERROR | 内存不足 | 关闭其他应用 |
| PROCESS_ERROR | 处理错误 | 查看详细日志 |
| SYSTEM_ERROR | 系统错误 | 重启应用 |

### B. Picture 字段变体列表

**支持的变体（24 种）**:

**英文**:
- Picture, Pictures
- Photo, Photos
- Image, Images
- Figure, Figures

**缩写**:
- Img
- Fig.

**中文**:
- 图片
- 照片
- 图像
- 图

### C. 关键文件路径

| 文件 | 路径 | 说明 |
|------|------|------|
| 主进程入口 | `src/main/main.ts` | Electron 主进程 |
| 渲染进程入口 | `src/renderer/main.tsx` | React 应用 |
| 预加载脚本 | `src/main/preload.ts` | IPC 桥接 |
| IPC 处理器 | `src/main/ipc-handlers.ts` | IPC 接口 |
| 处理引擎 | `src/core/process_engine.py` | 核心逻辑 |
| GUI 处理器 | `src/python/gui_processor.py` | Python 接口 |

---

**文档结束**
