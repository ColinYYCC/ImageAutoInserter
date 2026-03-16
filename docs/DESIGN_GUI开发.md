# DESIGN_GUI开发

**创建日期**: 2026-03-14  
**状态**: 🔄 A2 - 架构设计阶段  
**目标**: 设计 GUI 测试与打包的架构方案

---

## 1. 架构概览

### 1.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        测试架构                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │   单元测试层     │    │   集成测试层     │    │   E2E测试层  │ │
│  │  (Vitest)       │    │  (Vitest)       │    │  (Playwright)│ │
│  └────────┬────────┘    └────────┬────────┘    └──────┬──────┘ │
│           │                      │                     │        │
│           ▼                      ▼                     ▼        │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │ 组件测试         │    │ 前端-Python通信  │    │ 完整用户流程  │ │
│  │ - FilePicker    │    │ - IPC调用       │    │ - 文件选择   │ │
│  │ - ProcessingPage│    │ - 进程调用       │    │ - 处理流程   │ │
│  │ - Hooks         │    │ - 数据流        │    │ - 结果验证   │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        打包架构                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Electron Builder                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │  Main进程   │  │ Renderer进程│  │  Python脚本      │   │  │
│  │  │  (打包)     │  │  (打包)     │  │  (extraResources)│   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    输出目标                                │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │ macOS (.dmg)│  │Win (.exe)   │  │ Linux (.AppImage)│   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈确认

```yaml
# 测试技术栈
单元测试框架: Vitest ^1.1.0
React测试库: @testing-library/react ^14.1.2
DOM断言库: @testing-library/jest-dom ^6.1.5
浏览器环境: jsdom ^23.0.1
Mock工具: vitest/mock

# 打包技术栈
打包工具: electron-builder ^24.x
代码签名: electron-osx-sign (macOS)
安装程序: electron-winstaller (Windows)
```

---

## 2. 测试架构设计

### 2.1 测试金字塔

```
        /\
       /  \
      / E2E \      <- 少量 (3-5 个场景)
     /─────────\
    /  集成测试  \   <- 中等 (10-15 个测试)
   /───────────────\
  /    单元测试      \ <- 大量 (30+ 个测试)
 /─────────────────────\
```

### 2.2 单元测试架构

#### 测试文件结构

```
tests/
├── unit/                          # 单元测试目录
│   ├── components/               # 组件测试
│   │   ├── FilePicker.test.tsx
│   │   ├── ProcessingPage.test.tsx
│   │   ├── ProgressBar.test.tsx   # 已存在
│   │   ├── ResultView.test.tsx
│   │   └── ErrorDialog.test.tsx
│   ├── hooks/                    # Hook 测试
│   │   ├── useAppState.test.tsx
│   │   ├── useProcessor.test.ts
│   │   └── useFilePicker.test.ts
│   └── utils/                    # 工具函数测试
│       └── errorHandler.test.ts
├── integration/                   # 集成测试目录
│   ├── ipc-communication.test.ts
│   ├── file-selection.test.ts
│   └── processing-flow.test.ts
├── e2e/                          # E2E 测试目录
│   ├── full-workflow.spec.ts
│   ├── error-scenarios.spec.ts
│   └── edge-cases.spec.ts
└── setup.ts                      # 测试配置
```

#### 测试策略

| 组件/模块 | 测试重点 | 测试类型 | Mock策略 |
|-----------|----------|----------|----------|
| FilePicker | 文件选择、验证、UI状态 | 单元测试 | Mock electronAPI |
| ProcessingPage | 进度显示、状态切换 | 单元测试 | Mock 父组件回调 |
| ProgressBar | 动画、百分比显示 | 单元测试 | 无需Mock |
| useAppState | 状态转换、Action处理 | 单元测试 | 无需Mock |
| useProcessor | IPC调用、错误处理 | 单元测试 | Mock window.electronAPI |
| IPC通信 | 消息传递、数据格式 | 集成测试 | 启动真实Electron |
| 文件选择流程 | 端到端流程 | 集成测试 | Mock 对话框 |

### 2.3 测试环境配置

#### Vitest 配置 (vitest.config.ts)

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
})
```

#### 测试 Setup 文件 (tests/setup.ts)

```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Electron API
global.window.electronAPI = {
  selectFile: vi.fn(),
  selectFolder: vi.fn(),
  startProcess: vi.fn(),
  cancelProcess: vi.fn(),
  openFile: vi.fn(),
  onProgress: vi.fn(() => vi.fn()),
  onComplete: vi.fn(() => vi.fn()),
  onError: vi.fn(() => vi.fn()),
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
```

---

## 3. 打包架构设计

### 3.1 构建流程

```
┌─────────────────────────────────────────────────────────────┐
│                      构建流程                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 构建主进程 (Main)                                        │
│     ┌─────────────┐                                         │
│     │ main.ts     │ ──vite build──► dist/main/main.js       │
│     └─────────────┘                                         │
│                                                              │
│  2. 构建 Preload 脚本                                        │
│     ┌─────────────┐                                         │
│     │ preload.ts  │ ──vite build──► dist/main/preload.js    │
│     └─────────────┘                                         │
│                                                              │
│  3. 构建渲染进程 (Renderer)                                  │
│     ┌─────────────┐                                         │
│     │ App.tsx     │ ──vite build──► dist/renderer/          │
│     └─────────────┘                                         │
│                                                              │
│  4. 复制 Python 脚本                                         │
│     ┌─────────────┐                                         │
│     │ src/python/ │ ──copy──► dist/python/                  │
│     │ src/core/   │ ──copy──► dist/python/core/             │
│     └─────────────┘                                         │
│                                                              │
│  5. 打包应用                                                 │
│     ┌─────────────┐                                         │
│     │ electron-   │ ──build──► release/                     │
│     │ builder     │     ├─ ImageAutoInserter.dmg (macOS)    │
│     └─────────────┘     ├─ ImageAutoInserter.exe (Windows)  │
│                         └─ ImageAutoInserter.AppImage (Linux)│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 electron-builder 配置

#### package.json 构建配置

```json
{
  "build": {
    "appId": "com.imageautoinserter.app",
    "productName": "ImageAutoInserter",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "assets/**/*",
      "package.json",
      "!**/*.map",
      "!**/{.git,.github,.trae,project,.dev,docs,tests,Sample}",
      "!**/{__pycache__,.pytest_cache,coverage,node_modules}",
      "!**/*.{md,log,tmp,swo,swp}"
    ],
    "extraResources": [
      {
        "from": "dist/python