# GUI 重构项目术语表

> **版本**: v1.0  
> **创建日期**: 2026-03-08  
> **状态**: 初稿  
> **适用范围**: ImageAutoInserter GUI v3.0  
> **相关文档**: [spec.md](../../../specs/gui-design-spec.md) | [wireframe.md](./wireframe.md) | [mockup.md](./mockup.md)

---

## 目录

1. [间距系统](#间距系统)
2. [圆角系统](#圆角系统)
3. [字体排印系统](#字体排印系统)
4. [色彩系统](#色彩系统)
5. [状态术语](#状态术语)
6. [组件术语](#组件术语)
7. [IPC 通信术语](#ipc-通信术语)
8. [测试术语](#测试术语)
9. [缩写说明](#缩写说明)
10. [CSS 变量使用示例](#css-变量使用示例)

---

## 间距系统 (Spacing System)

基于 **4px 基准** 的间距系统，确保所有间距值为 4 的倍数，保持视觉节奏一致。

| 术语 (中文) | 术语 (英文) | 值 | CSS 变量名 | 使用场景 | 代码示例 |
|------------|------------|-----|-----------|---------|---------|
| 间距 -1 | space-1 | 4px | `--space-1` | 图标与文字间距、小元素内边距 | `gap: var(--space-1);` |
| 间距 -2 | space-2 | 8px | `--space-2` | 按钮内边距、标签间距 | `padding: var(--space-2);` |
| 间距 -3 | space-3 | 12px | `--space-3` | 卡片内边距、组件间距 | `gap: var(--space-3);` |
| 间距 -4 | space-4 | 16px | `--space-4` | 标准内边距、段落间距 | `padding: var(--space-4);` |
| 间距 -6 | space-6 | 24px | `--space-6` | 大卡片内边距、区块间距 | `padding: var(--space-6);` |
| 间距 -8 | space-8 | 32px | `--space-8` | 主容器内边距、大间距 | `margin: var(--space-8);` |
| 间距 -12 | space-12 | 48px | `--space-12` | 超大区块间距 | `margin-bottom: var(--space-12);` |
| 间距 -16 | space-16 | 64px | `--space-16` | 页面级间距 | `padding: var(--space-16);` |

**使用原则**:
- ✅ 所有 margin/padding/gap 必须使用 4 的倍数
- ✅ 优先使用 CSS 变量，避免硬编码数值
- ✅ 保持垂直节奏一致（使用相同的间距值）

**参考**: [spec.md - 间距系统](../../../specs/gui-design-spec.md#间距系统 4px 基准)

---

## 圆角系统 (Radius System)

使用 **等比数列** 的圆角系统，确保视觉层次清晰、一致。

| 术语 (中文) | 术语 (英文) | 值 | CSS 变量名 | 使用场景 | 代码示例 |
|------------|------------|-----|-----------|---------|---------|
| 小圆角 | radius-sm | 8px | `--radius-sm` | 按钮、标签、小元素 | `border-radius: var(--radius-sm);` |
| 中圆角 | radius-md | 12px | `--radius-md` | 卡片、面板、输入框 | `border-radius: var(--radius-md);` |
| 大圆角 | radius-lg | 18px | `--radius-lg` | 大卡片、模态框 | `border-radius: var(--radius-lg);` |
| 超大圆角 | radius-xl | 24px | `--radius-xl` | 主容器、全屏元素 | `border-radius: var(--radius-xl);` |

**圆角序列**: 8px → 12px → 18px → 24px（等比递增）

**使用原则**:
- ✅ 相同层级的元素使用相同的圆角
- ✅ 嵌套元素的圆角应外层 > 内层
- ✅ 避免圆角跳跃（如 8px → 20px）

**参考**: [spec.md - 圆角系统](../../../specs/gui-design-spec.md#圆角系统等比数列)

---

## 字体排印系统 (Typography System)

基于 **1.25 倍率**（黄金比例）的字体层级系统，确保视觉层次清晰。

### 字体大小

| 术语 (中文) | 术语 (英文) | 值 | CSS 变量名 | 使用场景 | 代码示例 |
|------------|------------|-----|-----------|---------|---------|
| 超小字 | text-xs | 12px | `--text-xs` | 辅助说明、注释 | `font-size: var(--text-xs);` |
| 小字 | text-sm | 14px | `--text-sm` | 正文、描述文字 | `font-size: var(--text-sm);` |
| 正文 | text-base | 17.5px | `--text-base` | 小标题、标准文字 | `font-size: var(--text-base);` |
| 大字 | text-lg | 22px | `--text-lg` | 中标题 | `font-size: var(--text-lg);` |
| 超大字 | text-xl | 27.5px | `--text-xl` | 大标题 | `font-size: var(--text-xl);` |
| 展示字 | text-2xl | 34px | `--text-2xl` | 展示标题、主标题 | `font-size: var(--text-2xl);` |

### 字重

| 术语 (中文) | 术语 (英文) | 值 | CSS 变量名 | 使用场景 | 代码示例 |
|------------|------------|-----|-----------|---------|---------|
| 常规 | font-normal | 400 | `--font-normal` | 正文 | `font-weight: var(--font-normal);` |
| 中等 | font-medium | 500 | `--font-medium` | 强调文字 | `font-weight: var(--font-medium);` |
| 半粗体 | font-semibold | 600 | `--font-semibold` | 小标题 | `font-weight: var(--font-semibold);` |
| 粗体 | font-bold | 700 | `--font-bold` | 主标题 | `font-weight: var(--font-bold);` |

### 行高

| 术语 (中文) | 术语 (英文) | 值 | CSS 变量名 | 使用场景 | 代码示例 |
|------------|------------|-----|-----------|---------|---------|
| 紧凑 | leading-tight | 1.25 | `--leading-tight` | 标题、紧凑布局 | `line-height: var(--leading-tight);` |
| 标准 | leading-normal | 1.5 | `--leading-normal` | 正文 | `line-height: var(--leading-normal);` |
| 宽松 | leading-relaxed | 1.75 | `--leading-relaxed` | 大段文字、说明 | `line-height: var(--leading-relaxed);` |

**字体层级关系**:
```
text-xs (12px) × 1.25 = text-sm (14px) × 1.25 = text-base (17.5px) × 1.25 = text-lg (22px) × 1.25 = text-xl (27.5px) × 1.25 = text-2xl (34px)
```

**参考**: [spec.md - 字体层级系统](../../../specs/gui-design-spec.md#字体层级系统 125 倍率)

---

## 色彩系统 (Color System)

### 主色系 (Primary Colors)

以 **方案 3: Blue Trust（蓝色商务）** 为默认配色方案。

| 术语 (中文) | 术语 (英文) | 色值 | CSS 变量名 | 使用场景 | 代码示例 |
|------------|------------|------|-----------|---------|---------|
| 主色 | primary | #2563EB | `--primary` | 主按钮、链接、焦点状态 | `background: var(--primary);` |
| 浅主色 | primary-light | #3B82F6 | `--primary-light` | 悬停状态、渐变 | `background: var(--primary-light);` |
| 深主色 | primary-dark | #1D4ED8 | `--primary-dark` | 按下状态、深色渐变 | `background: var(--primary-dark);` |
| 强调色 | accent | #F97316 | `--accent` | 通知标记、重要提示 | `color: var(--accent);` |

### 背景色系 (Background Colors)

| 术语 (中文) | 术语 (英文) | 色值 | CSS 变量名 | 使用场景 | 代码示例 |
|------------|------------|------|-----------|---------|---------|
| 主背景 | bg-primary | #F8FAFC | `--bg-primary` | 页面背景 | `background: var(--bg-primary);` |
| 次级背景 | bg-secondary | #FFFFFF | `--bg-secondary` | 卡片背景 | `background: var(--bg-secondary);` |
| 第三背景 | bg-tertiary | #F1F5F9 | `--bg-tertiary` | 分组背景 | `background: var(--bg-tertiary);` |

### 文字色系 (Text Colors)

| 术语 (中文) | 术语 (英文) | 色值 | CSS 变量名 | 对比度 | 使用场景 | 代码示例 |
|------------|------------|------|-----------|--------|---------|---------|
| 主文字 | text-primary | #0F172A | `--text-primary` | 15:1 | 主标题、正文 | `color: var(--text-primary);` |
| 次级文字 | text-secondary | #334155 | `--text-secondary` | 7.2:1 | 副标题、描述 | `color: var(--text-secondary);` |
| 第三文字 | text-tertiary | #64748B | `--text-tertiary` | 4.8:1 | 辅助说明 | `color: var(--text-tertiary);` |

### 边框色系 (Border Colors)

| 术语 (中文) | 术语 (英文) | 色值 | CSS 变量名 | 使用场景 | 代码示例 |
|------------|------------|------|-----------|---------|---------|
| 浅边框 | border-light | #E2E8F0 | `--border-light` | 分组线、弱边框 | `border: 1px solid var(--border-light);` |
| 标准边框 | border | #CBD5E1 | `--border` | 标准边框 | `border: 1px solid var(--border);` |
| 强调边框 | border-emphasis | #94A3B8 | `--border-emphasis` | 强调边框 | `border: 2px solid var(--border-emphasis);` |

### 功能色系 (Functional Colors)

| 术语 (中文) | 术语 (英文) | 色值 | CSS 变量名 | 使用场景 | 代码示例 |
|------------|------------|------|-----------|---------|---------|
| 成功色 | success | #10B981 | `--success` | 成功状态、完成标记 | `color: var(--success);` |
| 错误色 | error | #EF4444 | `--error` | 错误状态、删除操作 | `color: var(--error);` |
| 警告色 | warning | #F59E0B | `--warning` | 警告提示、注意 | `color: var(--warning);` |
| 信息色 | info | #3B82F6 | `--info` | 信息提示、链接 | `color: var(--info);` |

### 其他配色方案

**方案 1: Indigo Modern（靛紫现代）**
```css
--primary: #7C3AED;        /* 纯正紫色 */
--accent: #F59E0B;         /* 琥珀色（互补色） */
--bg-primary: #F5F3FF;     /* violet-50 */
```

**方案 2: Dark Professional（深色专业）**
```css
--primary: #E2E8F0;        /* 柔和蓝灰 */
--accent: #60A5FA;         /* 柔和蓝色 */
--bg-primary: #0F172A;     /* 深蓝黑 */
```

**方案 4: Cyan Fresh（青蓝清新）**
```css
--primary: #0891B2;        /* 清新青蓝 */
--accent: #F97316;         /* 珊瑚橙 */
--bg-primary: #ECFEFF;     /* cyan-50 */
```

**参考**: [spec.md - 色彩系统](../../../specs/gui-design-spec.md#色彩系统)

---

## 状态术语 (State Terminology)

应用状态机定义用户界面的不同状态。

| 术语 (中文) | 术语 (英文) | 常量名 | 描述 | 触发条件 | 界面特征 |
|------------|------------|--------|------|---------|---------|
| 初始状态 | IDLE | `IDLE` | 应用启动后的初始状态 | 应用启动 | 显示文件选择卡片，按钮禁用 |
| 就绪状态 | READY | `READY` | 文件已选择，可以开始处理 | 两个文件都选择完成 | 显示文件信息，"开始处理"按钮激活 |
| 处理中状态 | PROCESSING | `PROCESSING` | 正在处理文件 | 用户点击"开始处理" | 显示进度条，文件卡片只读 |
| 完成状态 | COMPLETE | `COMPLETE` | 处理完成 | 进度达到 100% | 显示统计卡片，成功/失败数量 |
| 错误状态 | ERROR | `ERROR` | 处理过程发生错误 | 捕获到异常 | 显示错误对话框，返回 IDLE |

### 状态转换图

```
┌──────────────┐
│    IDLE      │◄─────────────────────────┐
│  (初始状态)  │                          │
└──────┬───────┘                          │
       │ 选择文件                         │ 关闭错误
       ▼                                  │
┌──────────────┐                          │
│    READY     │                          │
│  (文件已选择)│                          │
└──────┬───────┘                          │
       │ 开始处理                         │
       ▼                                  │
┌──────────────┐     处理完成             │
│  PROCESSING  │─────────────────┐        │
│  (处理中)    │                 │        │
└──────┬───────┘                 ▼        │
       │ 发生错误         ┌──────────────┐│
       ▼                  │   COMPLETE   ││
┌──────────────┐          │  (处理完成)  ││
│    ERROR     │          └──────┬───────┘│
│  (错误状态)  │                 │ 重置   │
└──────────────┘                 └────────┘
```

**参考**: [wireframe.md - 状态转换图](./wireframe.md#附录状态转换图)

---

## 组件术语 (Component Terminology)

### 核心组件

| 术语 (中文) | 术语 (英文) | 组件名 | 描述 | 属性 | 事件 |
|------------|------------|--------|------|------|------|
| 文件选择器 | FilePicker | `FilePicker` | 用于选择 Excel 或图片源的卡片组件 | `file`, `type`, `onSelect`, `onClear` | `select`, `clear` |
| 进度条 | ProgressBar | `ProgressBar` | 显示处理进度的进度条组件 | `value`, `max`, `showLabel` | `cancel` |
| 结果视图 | ResultView | `ResultView` | 显示处理完成后的统计信息 | `stats`, `onViewErrors`, `onOpenFile` | `viewErrors`, `openFile` |
| 错误对话框 | ErrorDialog | `ErrorDialog` | 显示错误信息的模态对话框 | `error`, `stackTrace`, `onClose` | `close` |
| 信息面板 | InfoPanel | `InfoPanel` | 显示文件详细信息的面板 | `fileInfo`, `type` | - |
| 统计卡片 | StatisticsCard | `StatisticsCard` | 显示统计数据的卡片 | `label`, `value`, `color` | - |

### 组件详细规格

#### FilePicker

```typescript
interface FilePickerProps {
  file: FileInfo | null;           // 文件信息
  type: 'excel' | 'image';         // 文件类型
  onSelect: () => void;            // 选择文件回调
  onClear?: () => void;            // 清除文件回调
}

// 尺寸规格
尺寸：320px × 280px
内边距：32px
预览区域：304px × 120px
按钮：160px × 40px
```

#### ProgressBar

```typescript
interface ProgressBarProps {
  value: number;                   // 当前进度值
  max: number;                     // 最大值
  showLabel: boolean;              // 是否显示百分比标签
  onCancel: () => void;            // 取消处理回调
}

// 尺寸规格
高度：8px
圆角：4px (50%)
总宽度：100% (父容器宽度)
```

#### ResultView

```typescript
interface ResultViewProps {
  stats: ProcessingStats;          // 处理统计信息
  onViewErrors: () => void;        // 查看错误回调
  onOpenFile: () => void;          // 打开文件回调
}

// 统计卡片网格
布局：grid-cols-2 gap-4
卡片尺寸：156px × 100px
```

**参考**: [spec.md - 组件设计规范](../../../specs/gui-design-spec.md#组件设计规范)

---

## IPC 通信术语 (IPC Terminology)

Electron 主进程与渲染进程之间的进程间通信（Inter-Process Communication）。

| 术语 (中文) | 术语 (英文) | 通道名 | 方向 | 数据类型 | 描述 | 使用示例 |
|------------|------------|--------|------|---------|------|---------|
| 选择文件 | select-file | `select-file` | R→M | `{ type: 'excel' \| 'image' }` | 渲染进程请求打开文件选择器 | `ipcRenderer.invoke('select-file', { type: 'excel' })` |
| 开始处理 | start-process | `start-process` | R→M | `{ excelPath, imageSource }` | 渲染进程请求开始处理 | `ipcRenderer.send('start-process', { excelPath, imageSource })` |
| 进度更新 | progress | `progress` | M→R | `{ current, total, currentSku }` | 主进程发送进度更新 | `ipcMain.on('progress', (event, data) => {})` |
| 处理完成 | complete | `complete` | M→R | `{ success, failed, total, successRate }` | 主进程通知处理完成 | `ipcMain.on('complete', (event, stats) => {})` |
| 处理错误 | error | `error` | M→R | `{ message, stack, sku }` | 主进程发送错误信息 | `ipcMain.on('error', (event, error) => {})` |
| 取消处理 | cancel | `cancel` | R→M | `void` | 渲染进程请求取消处理 | `ipcRenderer.send('cancel')` |
| 打开文件 | open-file | `open-file` | R→M | `{ path: string }` | 渲染进程请求用 Excel 打开文件 | `ipcRenderer.invoke('open-file', { path })` |
| 显示错误 | show-error | `show-error` | R→M | `{ error: Error }` | 渲染进程请求显示错误对话框 | `ipcRenderer.invoke('show-error', { error })` |

### IPC 通信流程

```
┌─────────────────┐                    ┌─────────────────┐
│  渲染进程 (React) │                    │    主进程 (Node)   │
└────────┬────────┘                    └────────┬────────┘
         │                                      │
         │  invoke('select-file')               │
         │─────────────────────────────────────>│
         │                                      │ 打开文件选择器
         │                                      │
         │  resolve: { filePath }               │
         │<─────────────────────────────────────│
         │                                      │
         │  send('start-process', data)         │
         │─────────────────────────────────────>│
         │                                      │ 开始处理
         │                                      │
         │  on('progress', callback)            │
         │<─────────────────────────────────────│
         │   { current: 85, total: 127 }        │
         │                                      │
         │  on('complete', callback)            │
         │<─────────────────────────────────────│
         │   { success: 125, failed: 2 }        │
         │                                      │
```

**缩写说明**:
- **R→M**: Renderer to Main（渲染进程到主进程）
- **M→R**: Main to Renderer（主进程到渲染进程）

**参考**: [data-flow.md - IPC 通信架构](../../../architecture/data-flow.md)

---

## 测试术语 (Testing Terminology)

### 测试类型

| 术语 (中文) | 术语 (英文) | 描述 | 测试范围 | 执行速度 | 示例 |
|------------|------------|------|---------|---------|------|
| 单元测试 | Unit Test | 测试单个函数或组件 | 最小代码单元 | 快 (<1s) | `test_file_picker_onSelect()` |
| 集成测试 | Integration Test | 测试多个组件的协作 | 组件间交互 | 中 (1-5s) | `test_ipc_progress_flow()` |
| 端到端测试 | E2E Test | 测试完整用户流程 | 整个应用 | 慢 (>5s) | `test_full_process_workflow()` |
| 视觉回归测试 | Visual Regression Test | 检测 UI 视觉变化 | 界面渲染 | 中 (2-10s) | `test_button_screenshot()` |
| 性能测试 | Performance Test | 测试性能指标 | 关键路径 | 慢 (>10s) | `test_startup_time()` |
| 可访问性测试 | Accessibility Test | 测试无障碍功能 | ARIA、键盘导航 | 快 (<2s) | `test_keyboard_navigation()` |

### 测试阶段 (TDD)

| 术语 (中文) | 术语 (英文) | 阶段名 | 描述 | 目标 | 验收标准 |
|------------|------------|--------|------|------|---------|
| 红色阶段 | RED | RED | 编写失败的测试 | 定义预期功能 | 测试必须失败 |
| 绿色阶段 | GREEN | GREEN | 编写最少代码让测试通过 | 实现功能 | 测试必须通过 |
| 重构阶段 | REFACTOR | REFACTOR | 优化代码但保持测试通过 | 提高代码质量 | 测试保持通过 |

### 测试质量指标

| 术语 (中文) | 术语 (英文) | 指标名 | 计算方式 | 目标值 | 说明 |
|------------|------------|--------|---------|--------|------|
| 测试覆盖率 | Test Coverage | `coverage` | (已测试行数 / 总行数) × 100% | ≥80% | 代码被测试覆盖的比例 |
| 断言数量 | Assertion Count | `assertions` | 每个测试的断言数 | 1-3 | 每个测试的断言数量 |
| 测试通过率 | Pass Rate | `passRate` | (通过测试数 / 总测试数) × 100% | 100% | 所有测试必须通过 |
| 测试执行时间 | Execution Time | `duration` | 运行所有测试的时间 | <60s | CI 环境下的总执行时间 |

### 测试文件命名规范

```
tests/
├── unit/                          # 单元测试
│   ├── test_file_picker.py        # FilePicker 组件测试
│   ├── test_progress_bar.py       # ProgressBar 组件测试
│   └── test_theme_loader.py       # ThemeLoader 测试
├── integration/                   # 集成测试
│   ├── test_ipc_communication.py  # IPC 通信测试
│   └── test_state_machine.py      # 状态机测试
└── e2e/                           # E2E 测试
    ├── test_workflow.py           # 完整工作流测试
    └── test_error_handling.py     # 错误处理测试
```

**参考**: [tasks.md - 测试任务分解](../../../plans/tasks.md)

---

## 缩写说明 (Abbreviations)

| 缩写 | 全称 (英文) | 全称 (中文) | 说明 | 使用场景 |
|------|------------|------------|------|---------|
| GUI | Graphical User Interface | 图形用户界面 | 相对于 CLI（命令行界面） | GUI 版本、GUI 设计 |
| CLI | Command Line Interface | 命令行界面 | 文本界面的应用程序 | CLI 版本、CLI 工具 |
| IPC | Inter-Process Communication | 进程间通信 | Electron 主进程与渲染进程通信 | IPC 通道、IPC 消息 |
| R→M | Renderer to Main | 渲染进程到主进程 | Electron IPC 方向 | R→M 消息、R→M 调用 |
| M→R | Main to Renderer | 主进程到渲染进程 | Electron IPC 方向 | M→R 通知、M→R 事件 |
| SKU | Stock Keeping Unit | 库存量单位 | 商品编码 | SKU 编码、商品 SKU |
| CSS | Cascading Style Sheets | 层叠样式表 | 网页样式语言 | CSS 变量、CSS 规则 |
| QSS | Qt Style Sheets | Qt 样式表 | PyQt6 的样式系统 | QSS 文件、QSS 样式 |
| A11y | Accessibility | 可访问性 | "Accessibility" 的谐音（11 个字母） | A11y 测试、A11y 支持 |
| WCAG | Web Content Accessibility Guidelines | 网页内容无障碍指南 | W3C 的无障碍标准 | WCAG AA、WCAG AAA |
| AAA | Level AAA | AAA 级别 | WCAG 最高级别（对比度≥7:1） | AAA 标准、达到 AAA |
| AA | Level AA | AA 级别 | WCAG 中级别（对比度≥4.5:1） | AA 标准、达到 AA |
| TDD | Test-Driven Development | 测试驱动开发 | 先测试后实现的开发方法 | TDD 流程、TDD 循环 |
| RED | Red Phase | 红色阶段 | TDD 的第一阶段（测试失败） | RED 阶段、RED 验证 |
| GREEN | Green Phase | 绿色阶段 | TDD 的第二阶段（测试通过） | GREEN 阶段、GREEN 验证 |
| REFACTOR | Refactor Phase | 重构阶段 | TDD 的第三阶段（优化代码） | REFACTOR 阶段 |
| E2E | End to End | 端到端 | 测试完整用户流程 | E2E 测试、E2E 用例 |
| CI/CD | Continuous Integration/Continuous Deployment | 持续集成/持续部署 | 自动化构建和部署 | CI/CD 流程、CI/CD 管道 |
| MVP | Minimum Viable Product | 最小可行产品 | 具备核心功能的最简版本 | MVP 版本、MVP 功能 |
| UI | User Interface | 用户界面 | 用户与应用程序交互的界面 | UI 设计、UI 组件 |
| UX | User Experience | 用户体验 | 用户使用产品的整体体验 | UX 设计、UX 优化 |

---

## CSS 变量使用示例

### 完整使用示例

```css
/* 文件选择卡片 */
.file-picker-card {
  /* 间距系统 */
  padding: var(--space-6);              /* 24px */
  margin-bottom: var(--space-4);        /* 16px */
  gap: var(--space-3);                  /* 12px */
  
  /* 圆角系统 */
  border-radius: var(--radius-md);      /* 12px */
  
  /* 色彩系统 */
  background-color: var(--bg-secondary);
  border: 2px dashed var(--border);
  
  /* 字体排印系统 */
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: var(--leading-normal);
}

/* 主按钮 */
.primary-button {
  /* 间距系统 */
  padding: var(--space-2) var(--space-6);  /* 8px 24px */
  
  /* 圆角系统 */
  border-radius: var(--radius-sm);         /* 8px */
  
  /* 色彩系统 */
  background: linear-gradient(
    135deg,
    var(--primary) 0%,
    var(--primary-dark) 100%
  );
  color: white;
  
  /* 字体排印系统 */
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  
  /* 过渡动画 */
  transition: all var(--duration-normal) var(--ease-out);
}

/* 进度条 */
.progress-bar {
  /* 间距系统 */
  height: var(--space-2);             /* 8px */
  
  /* 圆角系统 */
  border-radius: var(--radius-sm);    /* 8px */
  
  /* 色彩系统 */
  background-color: var(--bg-tertiary);
  
  /* 进度块 */
  &__chunk {
    background: linear-gradient(
      90deg,
      var(--primary) 0%,
      var(--primary-light) 100%
    );
    border-radius: var(--radius-sm);
  }
}

/* 统计卡片 */
.statistics-card {
  /* 布局 */
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);                /* 16px */
  
  /* 卡片样式 */
  &__card {
    padding: var(--space-4);          /* 16px */
    border-radius: var(--radius-md);  /* 12px */
    background: linear-gradient(
      135deg,
      var(--bg-tertiary) 0%,
      var(--bg-secondary) 100%
    );
    
    /* 字体排印 */
    &__label {
      font-size: var(--text-sm);
      color: var(--text-tertiary);
      font-weight: var(--font-normal);
    }
    
    &__value {
      font-size: var(--text-2xl);
      font-weight: var(--font-bold);
      color: var(--success);          /* 成功状态 */
    }
  }
}
```

### 状态相关样式

```css
/* IDLE 状态 */
.state-idle .file-picker {
  border-style: dashed;
  border-color: var(--border);
}

/* READY 状态 */
.state-ready .file-picker {
  border-style: solid;
  border-color: var(--primary);
  background-color: rgba(37, 99, 235, 0.05);
}

/* PROCESSING 状态 */
.state-processing .file-picker {
  border-style: solid;
  border-color: var(--border);
  opacity: 0.6;
  pointer-events: none;  /* 禁用交互 */
}

/* COMPLETE 状态 */
.state-complete .statistics-card {
  animation: fade-in 0.3s var(--ease-out);
}

/* ERROR 状态 */
.state-error .error-dialog {
  border-color: var(--error);
  background-color: rgba(239, 68, 68, 0.05);
}
```

### 响应式适配

```css
/* 移动端适配 */
@media (max-width: 640px) {
  .container {
    padding: var(--space-4);          /* 16px */
  }
  
  .file-picker-card {
    padding: var(--space-4);          /* 16px */
  }
  
  .primary-button {
    width: 100%;
    padding: var(--space-3);          /* 12px */
  }
}

/* 平板适配 */
@media (min-width: 641px) and (max-width: 1024px) {
  .container {
    padding: var(--space-6);          /* 24px */
  }
}

/* 桌面端适配 */
@media (min-width: 1025px) {
  .container {
    padding: var(--space-8);          /* 32px */
    max-width: 800px;
  }
}
```

**参考**: [spec.md - CSS 变量定义](../../../specs/gui-design-spec.md#规范化设计系统)

---

## 交叉引用

### 相关文档

- **设计规范**: [gui-design-spec.md](../../../specs/gui-design-spec.md) - 完整的设计规格说明
- **线框图**: [wireframe.md](./wireframe.md) - 界面布局和组件尺寸
- **高保真原型**: [mockup.md](./mockup.md) - 视觉效果和交互设计
- **数据流**: [data-flow.md](../../../architecture/data-flow.md) - IPC 通信架构
- **任务分解**: [tasks.md](../../../plans/tasks.md) - 实施任务列表
- **检查清单**: [checklist.md](../../../testing/ui-redesign-checklist.md) - 质量验收标准

### 术语索引

按字母顺序排列的术语索引：

**A**: [A11y](#缩写说明), [AA](#缩写说明), [AAA](#缩写说明)  
**C**: [CLI](#缩写说明), [CSS](#缩写说明)  
**E**: [E2E](#测试术语), [ERROR](#状态术语)  
**G**: [GREEN](#测试术语), [GUI](#缩写说明)  
**I**: [IDLE](#状态术语), [IPC](#ipc-通信术语)  
**M**: [M→R](#ipc-通信术语)  
**P**: [PROCESSING](#状态术语)  
**Q**: [QSS](#缩写说明)  
**R**: [R→M](#ipc-通信术语), [READY](#状态术语), [RED](#测试术语), [REFACTOR](#测试术语)  
**S**: [SKU](#缩写说明)  
**T**: [TDD](#测试术语)  
**U**: [UI](#缩写说明), [UX](#缩写说明)  
**W**: [WCAG](#缩写说明)

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2026-03-08 | 初始版本，创建完整的术语表 | AI Assistant |

---

**文档结束**
