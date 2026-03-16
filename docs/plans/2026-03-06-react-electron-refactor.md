# React + Electron 重构实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 ImageAutoInserter 从 PyQt6 重构为 React + Electron 架构，实现 InfoPanel v3.0 分阶段显示方案，达到 WCAG 2.1 AA 95%+ 合规率。

**Architecture:** 采用 Electron 主进程 (Node.js) + 渲染进程 (React + TypeScript) 架构，Python 后端作为子进程运行，通过 IPC 通信。前端使用 shadcn/ui 组件库确保 WCAG 合规，Tailwind CSS 快速样式开发。

**Tech Stack:** 
- 前端：React 18 + TypeScript + Vite
- 桌面框架：Electron
- UI 组件：shadcn/ui (WCAG AA 合规)
- 样式：Tailwind CSS
- 动画：Framer Motion
- 后端：Python (保持现有逻辑)
- 通信：Node.js 子进程 + IPC

**预计工时:** 5-7 天  
**代码量:** ~530 行 (前端) + ~100 行 (IPC 桥接)  
**WCAG 合规率:** 95%+  
**打包体积:** ~100-150MB

---

## 阶段 1: 项目初始化 (Day 1)

### Task 1.1: 创建 Electron + Vite + React 项目结构

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`

**Step 1: 初始化 npm 项目**

```bash
npm init -y
```

**Step 2: 安装核心依赖**

```bash
npm install react react-dom
npm install -D @types/react @types/react-dom
npm install -D typescript vite @vitejs/plugin-react
npm install -D electron electron-builder -E
npm install -D concurrently wait-on cross-env
npm install -D tailwindcss postcss autoprefixer
npm install -D @shadcn/ui
```

**Step 3: 创建 package.json 脚本**

```json
{
  "scripts": {
    "dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "electron:build": "npm run build && electron-builder"
  }
}
```

**Step 4: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
```

**Step 5: 创建 electron/main.ts**

```typescript
import { app, BrowserWindow } from 'electron'
import path from 'path'

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)
```

**Step 6: 创建 tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // WCAG 2.1 AA 合规配色
        text: {
          primary: '#1F2937',    // 对比度 14.7:1
          secondary: '#4B5563',  // 对比度 7.1:1
        },
        success: '#047857',      // 对比度 5.8:1
        warning: '#B45309',      // 对比度 4.6:1
        error: '#DC2626',        // 对比度 5.9:1
      }
    },
  },
  plugins: [],
}
```

**Step 7: 验证项目结构**

```bash
npm run dev
# Expected: Electron 窗口打开，显示 Vite + React 默认页面
```

**Step 8: Commit**

```bash
git add .
git commit -m "feat: initialize Electron + Vite + React project structure"
```

---

### Task 1.2: 配置 shadcn/ui 组件库

**Files:**
- Create: `components.json`
- Modify: `src/index.css`
- Create: `src/lib/utils.ts`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/progress.tsx`

**Step 1: 初始化 shadcn/ui**

```bash
npx shadcn-ui init
```

**Step 2: 配置 components.json**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

**Step 3: 添加核心组件**

```bash
npx shadcn-ui add button
npx shadcn-ui add card
npx shadcn-ui add progress
```

**Step 4: 验证组件导入**

```typescript
// src/App.tsx
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

function App() {
  return (
    <Card className="p-4">
      <Button>Test Button</Button>
    </Card>
  )
}
```

**Step 5: Commit**

```bash
git add .
git commit -m "feat: configure shadcn/ui with WCAG AA compliant components"
```

---

### Task 1.3: 配置 Python 后端子进程通信

**Files:**
- Create: `src/lib/python-bridge.ts`
- Create: `python/requirements.txt`
- Create: `python/main.py`
- Modify: `electron/main.ts`

**Step 1: 创建 Python 桥接模块**

```typescript
// src/lib/python-bridge.ts
import { spawn, ChildProcess } from 'child_process'
import path from 'path'

export class PythonBridge {
  private process: ChildProcess | null = null

  async start(): Promise<void> {
    const pythonPath = process.env.NODE_ENV === 'development'
      ? 'python3'
      : path.join(process.resourcesPath, 'python', 'python3')

    this.process = spawn(pythonPath, [
      path.join(__dirname, '../python/main.py')
    ])

    this.process.stdout?.on('data', (data) => {
      console.log('Python:', data.toString())
    })

    this.process.stderr?.on('data', (data) => {
      console.error('Python Error:', data.toString())
    })
  }

  async send(command: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.process) {
        reject(new Error('Python process not started'))
        return
      }

      this.process.stdin?.write(JSON.stringify({ command, data }) + '\n')
      
      // 简化实现，实际需处理响应
      resolve(null)
    })
  }

  stop(): void {
    this.process?.kill()
  }
}
```

**Step 2: 创建 Python 入口文件**

```python
# python/main.py
import sys
import json

def process_excel(file_path: str, image_source: str):
    """处理 Excel 文件"""
    # 调用现有处理逻辑
    pass

def main():
    for line in sys.stdin:
        try:
            request = json.loads(line.strip())
            command = request['command']
            data = request['data']
            
            if command == 'process_excel':
                process_excel(data['file_path'], data['image_source'])
            
            # 发送响应
            response = {'status': 'success'}
            print(json.dumps(response), flush=True)
            
        except Exception as e:
            error = {'status': 'error', 'message': str(e)}
            print(json.dumps(error), flush=True)

if __name__ == '__main__':
    main()
```

**Step 3: 创建 requirements.txt**

```
openpyxl>=3.0.0
rarfile>=4.0
Pillow>=9.0.0
```

**Step 4: 修改 electron/main.ts 集成 Python**

```typescript
import { PythonBridge } from '../src/lib/python-bridge'

const pythonBridge = new PythonBridge()

app.whenReady().then(async () => {
  await pythonBridge.start()
  createWindow()
})

app.on('will-quit', () => {
  pythonBridge.stop()
})
```

**Step 5: Commit**

```bash
git add .
git commit -m "feat: integrate Python backend via IPC"
```

---

## 阶段 2: InfoPanel v3.0 组件实施 (Day 2-3)

### Task 2.1: 实现 FilePreviewCard 组件

**Files:**
- Create: `src/components/infopanel/FilePreviewCard.tsx`
- Create: `src/types/file.ts`

**Step 1: 定义文件信息类型**

```typescript
// src/types/file.ts
export interface FileInfo {
  name: string
  size: number
  rows: number
  columns: number
  lastModified?: Date
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
```

**Step 2: 创建 FilePreviewCard 组件**

```typescript
// src/components/infopanel/FilePreviewCard.tsx
import { Card } from "@/components/ui/card"
import { FileInfo } from "@/types/file"
import { FileIcon } from "lucide-react"

interface FilePreviewCardProps {
  file: FileInfo | null
}

export function FilePreviewCard({ file }: FilePreviewCardProps) {
  if (!file) {
    return (
      <Card className="p-6 min-h-[120px] flex items-center justify-center">
        <p className="text-text-secondary">请拖拽 Excel 文件到此处</p>
      </Card>
    )
  }

  return (
    <Card className="p-6" role="region" aria-label="文件预览">
      <div className="flex items-center gap-3">
        <FileIcon className="w-8 h-8 text-text-primary" aria-hidden="true" />
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            {file.name}
          </h3>
          <p className="text-sm text-text-secondary" aria-label="文件信息">
            {formatFileSize(file.size)} · {file.columns} 列 · 约 {file.rows} 行
          </p>
          {file.lastModified && (
            <p className="text-xs text-text-secondary">
              最后修改：{file.lastModified.toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
```

**Step 3: 添加单元测试**

```typescript
// tests/components/FilePreviewCard.test.tsx
import { render, screen } from '@testing-library/react'
import { FilePreviewCard } from '@/components/infopanel/FilePreviewCard'

describe('FilePreviewCard', () => {
  it('shows placeholder when no file', () => {
    render(<FilePreviewCard file={null} />)
    expect(screen.getByText('请拖拽 Excel 文件到此处')).toBeInTheDocument()
  })

  it('displays file information', () => {
    const file = {
      name: 'test.xlsx',
      size: 245000,
      rows: 120,
      columns: 3
    }
    render(<FilePreviewCard file={file} />)
    expect(screen.getByText('test.xlsx')).toBeInTheDocument()
    expect(screen.getByText('245.1 KB · 3 列 · 约 120 行')).toBeInTheDocument()
  })
})
```

**Step 4: 运行测试**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm test -- FilePreviewCard
# Expected: All tests pass
```

**Step 5: Commit**

```bash
git add .
git commit -m "feat: implement FilePreviewCard component with WCAG compliance"
```

---

### Task 2.2: 实现 ProgressPanel 组件

**Files:**
- Create: `src/components/infopanel/ProgressPanel.tsx`
- Create: `src/types/progress.ts`

**Step 1: 定义进度信息类型**

```typescript
// src/types/progress.ts
export interface ProgressInfo {
  currentRow: number
  totalRows: number
  currentAction: string
  productCode: string
  estimatedRemaining: number // seconds
}

export function calculateProgress(info: ProgressInfo): number {
  return Math.round((info.currentRow / info.totalRows) * 100)
}

export function formatTime(seconds: number): string {
  if (seconds < 60) return `约${seconds}秒`
  return `约${Math.floor(seconds / 60)}分${seconds % 60}秒`
}
```

**Step 2: 创建 ProgressPanel 组件**

```typescript
// src/components/infopanel/ProgressPanel.tsx
import { Progress } from "@/components/ui/progress"
import { ProgressInfo, calculateProgress, formatTime } from "@/types/progress"

interface ProgressPanelProps {
  info: ProgressInfo
}

export function ProgressPanel({ info }: ProgressPanelProps) {
  const percentage = calculateProgress(info)

  return (
    <div className="space-y-4" role="region" aria-label="处理进度" aria-live="polite">
      <div className="space-y-2">
        <Progress value={percentage} className="h-2" />
        <p className="text-sm text-text-secondary text-center">
          {percentage}% ({info.currentRow}/{info.totalRows})
        </p>
      </div>
      
      <div className="text-center">
        <p className="text-text-primary" aria-label="当前处理">
          {info.currentAction}
        </p>
        <p className="text-sm text-text-secondary" aria-label="剩余时间">
          {formatTime(info.estimatedRemaining)}
        </p>
      </div>
    </div>
  )
}
```

**Step 3: 添加动画效果 (Framer Motion)**

```bash
npm install framer-motion
```

```typescript
import { motion, AnimatePresence } from 'framer-motion'

<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>
  <Progress value={percentage} />
</motion.div>
```

**Step 4: 添加单元测试**

```typescript
// tests/components/ProgressPanel.test.tsx
import { render, screen } from '@testing-library/react'
import { ProgressPanel } from '@/components/infopanel/ProgressPanel'

describe('ProgressPanel', () => {
  it('displays progress information', () => {
    const info = {
      currentRow: 80,
      totalRows: 120,
      currentAction: '正在处理 C2341231242...',
      productCode: 'C2341231242',
      estimatedRemaining: 10
    }
    render(<ProgressPanel info={info} />)
    expect(screen.getByText('67% (80/120)')).toBeInTheDocument()
    expect(screen.getByText('正在处理 C2341231242...')).toBeInTheDocument()
    expect(screen.getByText('约 10 秒')).toBeInTheDocument()
  })
})
```

**Step 5: Commit**

```bash
git add .
git commit -m "feat: implement ProgressPanel with real-time updates and animations"
```

---

### Task 2.3: 实现 StatisticsCard 组件

**Files:**
- Create: `src/components/infopanel/StatisticsCard.tsx`
- Create: `src/types/statistics.ts`

**Step 1: 定义统计信息类型**

```typescript
// src/types/statistics.ts
export interface StatisticsInfo {
  total: number
  success: number
  failed: number
}

export function calculateSuccessRate(info: StatisticsInfo): number {
  if (info.total === 0) return 0
  return Math.round((info.success / info.total) * 100)
}
```

**Step 2: 创建 StatisticsCard 组件**

```typescript
// src/components/infopanel/StatisticsCard.tsx
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  StatisticsInfo, 
  calculateSuccessRate 
} from "@/types/statistics"
import { CheckCircle2, XCircle } from "lucide-react"

interface StatisticsCardProps {
  info: StatisticsInfo
  onViewErrors: () => void
  onOpenOutput: () => void
}

export function StatisticsCard({ 
  info, 
  onViewErrors, 
  onOpenOutput 
}: StatisticsCardProps) {
  const successRate = calculateSuccessRate(info)

  return (
    <Card className="p-6" role="region" aria-label="处理结果">
      <div className="text-center mb-6">
        <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-2" />
        <h3 className="text-xl font-semibold text-text-primary">
          处理完成
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-success">{info.success}</p>
          <p className="text-sm text-text-secondary">成功</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-error">{info.failed}</p>
          <p className="text-sm text-text-secondary">失败</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-text-primary">{successRate}%</p>
          <p className="text-sm text-text-secondary">成功率</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button 
          onClick={onViewErrors}
          variant="outline"
          className="flex-1"
          aria-label="查看错误报告"
        >
          <XCircle className="w-4 h-4 mr-2" />
          查看错误报告
        </Button>
        <Button 
          onClick={onOpenOutput}
          className="flex-1"
          aria-label="打开输出文件"
        >
          打开输出文件
        </Button>
      </div>
    </Card>
  )
}
```

**Step 3: 添加单元测试**

```typescript
// tests/components/StatisticsCard.test.tsx
import { render, screen } from '@testing-library/react'
import { StatisticsCard } from '@/components/infopanel/StatisticsCard'

describe('StatisticsCard', () => {
  it('displays statistics correctly', () => {
    const info = { total: 120, success: 95, failed: 25 }
    const onViewErrors = vi.fn()
    const onOpenOutput = vi.fn()

    render(
      <StatisticsCard 
        info={info} 
        onViewErrors={onViewErrors}
        onOpenOutput={onOpenOutput}
      />
    )

    expect(screen.getByText('95')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('79%')).toBeInTheDocument()
    expect(screen.getByText('查看错误报告')).toBeInTheDocument()
  })
})
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: implement StatisticsCard with success rate display"
```

---

### Task 2.4: 实现 InfoPanel 协调器

**Files:**
- Create: `src/components/infopanel/InfoPanel.tsx`
- Create: `src/hooks/useProcessing.ts`

**Step 1: 定义阶段枚举**

```typescript
// src/components/infopanel/types.ts
export enum ProcessingStage {
  PREPARE = 'prepare',
  PROCESSING = 'processing',
  COMPLETE = 'complete'
}
```

**Step 2: 创建处理状态 Hook**

```typescript
// src/hooks/useProcessing.ts
import { useState, useCallback } from 'react'
import { ProcessingStage } from '@/components/infopanel/types'
import { FileInfo } from '@/types/file'
import { ProgressInfo } from '@/types/progress'
import { StatisticsInfo } from '@/types/statistics'

export function useProcessing() {
  const [stage, setStage] = useState<ProcessingStage>(ProcessingStage.PREPARE)
  const [file, setFile] = useState<FileInfo | null>(null)
  const [progress, setProgress] = useState<ProgressInfo | null>(null)
  const [statistics, setStatistics] = useState<StatisticsInfo | null>(null)

  const startProcessing = useCallback(async () => {
    setStage(ProcessingStage.PROCESSING)
    // 调用 Python 后端处理
  }, [])

  const updateProgress = useCallback((info: ProgressInfo) => {
    setProgress(info)
  }, [])

  const completeProcessing = useCallback((stats: StatisticsInfo) => {
    setStatistics(stats)
    setStage(ProcessingStage.COMPLETE)
  }, [])

  return {
    stage,
    file,
    progress,
    statistics,
    setFile,
    startProcessing,
    updateProgress,
    completeProcessing
  }
}
```

**Step 3: 创建 InfoPanel 协调器组件**

```typescript
// src/components/infopanel/InfoPanel.tsx
import { FilePreviewCard } from './FilePreviewCard'
import { ProgressPanel } from './ProgressPanel'
import { StatisticsCard } from './StatisticsCard'
import { ProcessingStage } from './types'
import { useProcessing } from '@/hooks/useProcessing'
import { Button } from '@/components/ui/button'

export function InfoPanel() {
  const {
    stage,
    file,
    progress,
    statistics,
    setFile,
    startProcessing,
    updateProgress,
    completeProcessing
  } = useProcessing()

  const handleFileDrop = (file: FileInfo) => {
    setFile(file)
  }

  const handleViewErrors = () => {
    // 打开错误报告
  }

  const handleOpenOutput = () => {
    // 打开输出文件
  }

  return (
    <div className="space-y-4">
      {stage === ProcessingStage.PREPARE && (
        <>
          <FilePreviewCard file={file} />
          <Button 
            onClick={startProcessing}
            disabled={!file}
            className="w-full"
          >
            开始处理
          </Button>
        </>
      )}

      {stage === ProcessingStage.PROCESSING && progress && (
        <ProgressPanel info={progress} />
      )}

      {stage === ProcessingStage.COMPLETE && statistics && (
        <StatisticsCard 
          info={statistics}
          onViewErrors={handleViewErrors}
          onOpenOutput={handleOpenOutput}
        />
      )}
    </div>
  )
}
```

**Step 4: 集成拖拽功能**

```bash
npm install react-dropzone
```

```typescript
import { useDropzone } from 'react-dropzone'

function DropZone({ onFileDrop }) {
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    onDrop: (acceptedFiles) => {
      // 解析文件信息
      onFileDrop(parseFile(acceptedFiles[0]))
    }
  })

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <p>拖拽 Excel 文件到此处</p>
    </div>
  )
}
```

**Step 5: Commit**

```bash
git add .
git commit -m "feat: implement InfoPanel coordinator with stage management"
```

---

## 阶段 3: WCAG 2.1 AA 合规实施 (Day 4)

### Task 3.1: 配置自动化 WCAG 检测工具

**Files:**
- Create: `tests/accessibility.test.ts`
- Modify: `vite.config.ts`

**Step 1: 安装 axe-core**

```bash
npm install -D @axe-core/react axe-core
```

**Step 2: 配置开发环境自动检测**

```typescript
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

if (process.env.NODE_ENV === 'development') {
  import('@axe-core/react').then((axe) => {
    axe.default(React, ReactDOM, 1000)
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

**Step 3: 创建 WCAG 测试套件**

```typescript
// tests/accessibility.test.ts
import { axe, toHaveNoViolations } from 'jest-axe'
import { render } from '@testing-library/react'
import { InfoPanel } from '@/components/infopanel/InfoPanel'

expect.extend(toHaveNoViolations)

describe('WCAG 2.1 AA Compliance', () => {
  it('InfoPanel has no accessibility violations', async () => {
    const { container } = render(<InfoPanel />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('All buttons have accessible names', () => {
    const { getAllByRole } = render(<InfoPanel />)
    const buttons = getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toHaveAccessibleName()
    })
  })

  it('Color contrast meets WCAG AA', () => {
    // 使用 stylelint-a11y 或手动验证
    // 所有颜色对比度≥4.5:1
  })
})
```

**Step 4: 配置 Lighthouse CI**

```bash
npm install -g @lhci/cli
```

```yaml
# .lighthouserc.yml
ci:
  collect:
    url:
      - http://localhost:5173
  assert:
    assertions:
      categories:accessibility: ['warn', {'minScore': 0.95}]
  upload:
    target: temporary-public-storage
```

**Step 5: Commit**

```bash
git add .
git commit -m "test: add automated WCAG accessibility testing with axe-core"
```

---

### Task 3.2: 实现焦点管理和键盘导航

**Files:**
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/card.tsx`
- Create: `src/hooks/useFocusTrap.ts`

**Step 1: 增强按钮焦点状态**

```typescript
// src/components/ui/button.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background min-h-[44px] min-w-[44px]", // WCAG 2.5.8
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

**Step 2: 实现焦点陷阱 Hook**

```typescript
// src/hooks/useFocusTrap.ts
import { useEffect, useRef } from 'react'

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus()
          e.preventDefault()
        }
      }
    }

    container.addEventListener('keydown', handleTabKey)
    firstElement.focus()

    return () => {
      container.removeEventListener('keydown', handleTabKey)
    }
  }, [isActive])

  return containerRef
}
```

**Step 3: 验证键盘导航**

```typescript
// tests/keyboard-navigation.test.ts
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('Keyboard Navigation', () => {
  it('supports Tab key navigation', async () => {
    const user = userEvent.setup()
    render(<InfoPanel />)
    
    await user.tab()
    expect(document.activeElement).toHaveAttribute('aria-label', '文件预览')
    
    await user.tab()
    expect(document.activeElement).toHaveTextContent('开始处理')
  })

  it('supports Enter key activation', async () => {
    const user = userEvent.setup()
    render(<InfoPanel />)
    
    const button = screen.getByRole('button', { name: '开始处理' })
    button.focus()
    
    await user.keyboard('{Enter}')
    // 验证按钮被点击
  })
})
```

**Step 4: Commit**

```bash
git add .
git commit -m "a11y: implement focus management and keyboard navigation"
```

---

### Task 3.3: 实现屏幕阅读器支持

**Files:**
- Modify: `src/components/infopanel/*.tsx`
- Create: `src/components/a11y/LiveRegion.tsx`

**Step 1: 添加 ARIA 标签**

```typescript
// 所有组件都已添加 aria-label, aria-labelledby, role 等
// 验证所有图标按钮都有 accessible name
<IconClose aria-label="关闭面板" />
```

**Step 2: 创建实时通知区域**

```typescript
// src/components/a11y/LiveRegion.tsx
interface LiveRegionProps {
  message: string
  priority?: 'polite' | 'assertive'
}

export function LiveRegion({ message, priority = 'polite' }: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}
```

**Step 3: 在进度更新中使用**

```typescript
// src/components/infopanel/ProgressPanel.tsx
import { LiveRegion } from '@/components/a11y/LiveRegion'

<LiveRegion 
  message={`处理进度 ${percentage}%, 当前第${info.currentRow}行`}
  priority="polite"
/>
```

**Step 4: 测试屏幕阅读器**

```bash
# Windows: 安装并测试 NVDA
# macOS: 使用 VoiceOver
# 手动测试所有交互元素
```

**Step 5: Commit**

```bash
git add .
git commit -m "a11y: add screen reader support with ARIA labels and live regions"
```

---

## 阶段 4: 集成测试和发布 (Day 5-7)

### Task 4.1: 端到端集成测试

**Files:**
- Create: `tests/e2e/processing.test.ts`
- Create: `playwright.config.ts`

**Step 1: 安装 Playwright**

```bash
npm install -D @playwright/test
```

**Step 2: 创建端到端测试**

```typescript
// tests/e2e/processing.test.ts
import { test, expect } from '@playwright/test'

test('complete processing workflow', async ({ page }) => {
  await page.goto('/')
  
  // 上传文件
  await page.setInputFiles('input[type=file]', 'test-data/sample.xlsx')
  
  // 验证文件预览显示
  await expect(page.getByText('sample.xlsx')).toBeVisible()
  
  // 点击开始
  await page.getByRole('button', { name: '开始处理' }).click()
  
  // 验证进度显示
  await expect(page.getByRole('region', { name: '处理进度' })).toBeVisible()
  
  // 等待完成
  await expect(page.getByText('处理完成')).toBeVisible({ timeout: 30000 })
  
  // 验证统计信息
  await expect(page.getByText('成功')).toBeVisible()
  await expect(page.getByText('失败')).toBeVisible()
})
```

**Step 3: 运行测试**

```bash
npx playwright test
```

**Step 4: Commit**

```bash
git add .
git commit -m "test: add end-to-end integration tests with Playwright"
```

---

### Task 4.2: 打包和发布配置

**Files:**
- Create: `electron-builder.config.js`
- Create: `.github/workflows/release.yml`

**Step 1: 配置 electron-builder**

```javascript
// electron-builder.config.js
module.exports = {
  appId: 'com.imagenautoinserter.app',
  productName: 'ImageAutoInserter',
  directories: {
    output: 'release'
  },
  files: [
    'dist/**/*',
    'electron/**/*',
    'python/**/*'
  ],
  extraResources: [
    {
      from: 'python',
      to: 'python',
      filter: ['**/*']
    }
  ],
  win: {
    target: 'nsis',
    icon: 'build/icon.ico'
  },
  mac: {
    target: 'dmg',
    icon: 'build/icon.icns'
  }
}
```

**Step 2: 配置 GitHub Actions 自动发布**

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest]

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Build Electron app
        run: npm run electron:build
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Release
        uses: softprops/action-gh-release@v1
        with:
          files: release/**/*
```

**Step 3: 测试打包**

```bash
npm run electron:build
# Expected: 生成安装包
```

**Step 4: Commit**

```bash
git add .
git commit -m "build: configure electron-builder and GitHub Actions for release"
```

---

## 验收标准

### 功能验收
- [ ] FilePreviewCard 正常显示文件信息
- [ ] ProgressPanel 实时更新进度
- [ ] StatisticsCard 准确显示统计
- [ ] 分阶段显示逻辑正确
- [ ] 拖拽功能正常
- [ ] Python 后端通信正常

### WCAG 2.1 AA 验收
- [ ] axe-core 检测无违规项
- [ ] Lighthouse 无障碍评分≥95
- [ ] 所有颜色对比度≥4.5:1
- [ ] 所有交互元素有焦点状态
- [ ] 所有触摸目标≥44x44px
- [ ] 所有图标按钮有 accessibleName
- [ ] 键盘导航正常
- [ ] 屏幕阅读器支持完整

### 代码质量验收
- [ ] 代码量≤530 行 (前端)
- [ ] 组件职责单一
- [ ] 单元测试覆盖率≥80%
- [ ] 端到端测试通过
- [ ] TypeScript 类型检查通过
- [ ] ESLint 无错误

### 性能验收
- [ ] 启动时间<3 秒
- [ ] 内存占用<200MB
- [ ] UI 渲染流畅 (60fps)
- [ ] 打包体积<150MB

---

## 风险评估和缓解

### 风险 1: Python 通信不稳定
**缓解方案**:
- 实现重试机制
- 添加超时处理
- 完善的错误日志

### 风险 2: WCAG 合规率不足 95%
**缓解方案**:
- 早期引入 axe-core 自动检测
- 定期运行 Lighthouse
- 手动测试屏幕阅读器

### 风险 3: 打包体积过大
**缓解方案**:
- 使用 Webpack Bundle Analyzer 分析
- Tree-shaking 移除未用代码
- 考虑 Tauri 作为备选

---

**计划完成!** 

**下一步执行选项:**

**1. Subagent-Driven (本会话)** - 我调度新鲜子代理逐个任务实施，任务间审查，快速迭代  
**2. 并行会话 (独立)** - 在新会话中使用 executing-plans 批量执行，设置检查点

**选择哪个方案？**
