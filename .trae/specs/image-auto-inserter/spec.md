# ImageAutoInserter 项目规格说明书

**版本**: v2.3  
**日期**: 2026-03-14  
**状态**: 已实施并验证  

---

## 目录

1. [项目概述](#1-项目概述)
2. [GUI 设计系统](#2-gui-设计系统)
3. [进度条动画系统](#3-进度条动画系统)
4. [组件实现细节](#4-组件实现细节)
5. [附录](#5-附录)
   - 6.1 [术语表](#61-术语表)
   - 6.2 [依赖列表](#62-依赖列表)
   - 6.3 [项目文件清单](#63-项目文件清单)
   - 6.4 [变更日志](#64-变更日志)
   - 6.5 [验收标准](#65-验收标准)
   - 6.6 [核心处理引擎](#66-核心处理引擎)
   - 6.7 [Excel 处理器](#67-excel-处理器)
   - 6.8 [图片处理器](#68-图片处理器)
   - 6.9 [配置管理器](#69-配置管理器)
   - 6.10 [路径管理器](#610-路径管理器)
   - 6.11 [字体管理器](#611-字体管理器)
   - 6.12 [Picture 字段变体](#612-picture-字段变体)
   - 6.13 [错误代码速查表](#613-错误代码速查表)
   - 6.14 [开发路线图](#614-开发路线图)
   - 6.15 [参考文档](#615-参考文档)

---

## 1. 项目概述

### 1.1 项目目标

ImageAutoInserter 是一款自动化工具，用于将商品图片批量插入 Excel 表格。当前为 Electron + React 的 GUI 版本，提供直观的操作界面。

### 1.2 目标用户

- **主要用户**: 办公室文员、电商运营人员（非技术人员）
- **使用场景**: 批量处理商品图片插入 Excel
- **使用频率**: 中低频（每周 1-3 次）
- **单次使用时长**: 5-15 分钟

### 1.3 技术架构

```
ImageAutoInserter/
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── main.ts        # 主进程入口
│   │   ├── ipc-handlers.ts # IPC 处理程序
│   │   ├── preload.ts     # 预加载脚本
│   │   └── utils/         # 主进程工具
│   │       └── permissions.ts      # 权限管理
│   ├── renderer/          # React 渲染进程
│   │   ├── App.tsx        # 主应用组件
│   │   ├── main.tsx       # 渲染进程入口
│   │   ├── components/    # React 组件
│   │   │   ├── FilePicker.tsx      # 文件选择器
│   │   │   ├── ProcessingPage.tsx  # 处理页面
│   │   │   ├── ProgressBar.tsx     # 进度条
│   │   │   ├── ResultView.tsx      # 结果展示
│   │   │   ├── ErrorDialog.tsx     # 错误对话框
│   │   │   ├── WelcomeGuide.tsx    # 欢迎引导
│   │   │   └── Icons.tsx           # 图标组件
│   │   ├── hooks/         # React Hooks
│   │   │   ├── useAppState.tsx     # 应用状态管理
│   │   │   ├── useProcessor.ts     # 处理逻辑
│   │   │   ├── useFilePicker.ts    # 文件选择逻辑
│   │   │   └── useTheme.ts         # 主题管理
│   │   └── utils/         # 工具函数
│   │       └── errorHandler.ts     # 错误处理
│   ├── python/            # Python 处理引擎
│   │   ├── gui_processor.py        # GUI 处理器（Electron 调用）
│   │   └── processor.py              # 模拟处理器（测试用）
│   ├── core/              # 核心处理逻辑（Python）
│   │   ├── process_engine.py       # 处理引擎
│   │   ├── excel_processor.py      # Excel 处理器
│   │   ├── image_processor.py      # 图片处理器
│   │   └── picture_variant.py      # Picture 字段变体识别
│   ├── utils/             # 工具模块（Python）
│   │   ├── path_manager.py         # 路径管理器
│   │   ├── font_manager.py         # 字体管理器
│   │   ├── config.py               # 配置管理器
│   │   └── text_formatter.py       # 文本格式化工具
│   ├── shared/            # 共享类型
│   │   ├── types.ts       # TypeScript 类型定义
│   │   └── types.d.ts     # 类型声明
│   ├── main.py            # PyQt6 GUI 入口（备用）
│   └── cli.py             # 命令行入口
├── file_organizer/        # 文件自动整理系统
│   ├── organizer.py       # 主程序
│   ├── classifier.py      # 分类规则引擎
│   ├── indexer.py         # 文件索引管理
│   └── __main__.py        # CLI 入口
├── tests/                 # 测试
│   ├── test_excel_processor.py
│   ├── test_image_processor.py
│   ├── test_picture_variant.py
│   ├── test_organizer.py
│   ├── test_indexer.py
│   ├── test_classifier.py
│   └── test_e2e.py
└── docs/                  # 文档
```

### 1.4 核心功能

1. **图片插入 Excel** - 自动匹配商品编码，插入对应图片
2. **文件自动整理** - 自动分类整理生成的文件
3. **进度可视化** - 平滑的进度条动画
4. **错误处理** - 友好的错误提示和日志
5. **文件验证** - 实时验证 Excel 和图片源

### 1.5 状态管理

#### 应用状态机

```typescript
type AppState = 
  | { phase: 'IDLE'; excelFile?: FileInfo; imageSource?: FileInfo }
  | { phase: 'READY'; excelFile: FileInfo; imageSource: FileInfo }
  | { phase: 'PROCESSING'; excelFile: FileInfo; imageSource: FileInfo; progress: number; current: string; total?: number }
  | { phase: 'COMPLETE'; result: ProcessingResult; excelFile?: FileInfo; imageSource?: FileInfo }
  | { phase: 'ERROR'; error: AppError; excelFile?: FileInfo; imageSource?: FileInfo };
```

#### 状态转换

```
IDLE --(选择Excel)--> IDLE (保存excelFile)
IDLE --(选择图片)--> IDLE (保存imageSource)
IDLE --(两者都有)--> READY

READY --(开始处理)--> PROCESSING
READY --(清除Excel)--> IDLE
READY --(清除图片)--> IDLE

PROCESSING --(完成)--> COMPLETE
PROCESSING --(错误)--> ERROR
PROCESSING --(取消)--> IDLE

COMPLETE --(重置)--> IDLE
ERROR --(重置)--> IDLE
```

---

## 2. GUI 设计系统

### 2.1 设计原则

1. **高级感** - 界面视觉品质达到商业软件标准
2. **美观度** - 符合现代桌面应用审美趋势
3. **易用性** - 电脑小白用户无需培训即可使用
4. **专业性** - 体现工具的专业性和可靠性

### 2.2 色彩系统

#### 主色调（Teal 青绿色系）

```css
--primary: #0D9488          /* 主色 - 青绿 */
--primary-hover: #0F766E    /* 悬停色 */
--primary-light: #14B8A6    /* 浅色 */
--primary-dark: #115E59     /* 深色 */
```

#### CTA强调色（Orange 橙色系）

```css
--cta: #F97316              /* CTA按钮 - 活力橙 */
--cta-hover: #EA580C        /* 悬停色 */
--cta-light: #FB923C        /* 浅色 */
```

#### 功能色

```css
--success: #10B981          /* 成功 - 翠绿 */
--success-hover: #059669
--error: #EF4444            /* 错误 - 红色 */
--error-hover: #DC2626
--warning: #F59E0B          /* 警告 - 琥珀 */
--warning-hover: #D97706
--info: #0D9488             /* 信息 - 青绿 */
```

#### 中性色

```css
/* 文字 */
--text-primary: #111827     /* 主要文字 - 深灰 */
--text-secondary: #6B7280   /* 次要文字 - 中灰 */
--text-tertiary: #9CA3AF    /* 辅助文字 - 浅灰 */
--text-disabled: #D1D5DB    /* 禁用文字 */

/* 背景 */
--bg-primary: #FFFFFF       /* 主背景 - 纯白 */
--bg-secondary: #F9FAFB     /* 次背景 - 极浅灰 */
--bg-tertiary: #F3F4F6      /* 第三背景 - 浅灰 */
--bg-quaternary: #E5E7EB    /* 第四背景 - 中浅灰 */

/* 边框 */
--border: #E5E7EB           /* 主边框 */
--border-light: #F3F4F6     /* 浅色边框 */
--border-hover: #D1D5DB     /* 悬停边框 */
--border-focus: #0D9488     /* 聚焦边框 */
```

### 2.3 字体系统

#### 字体栈

```css
/* 主字体栈 - 中文优先 */
--font-primary: 'Noto Sans SC', 'DIN Alternate', '思源黑体', 'Helvetica Neue', 'Microsoft YaHei', sans-serif;

/* 中文专用 */
--font-chinese: 'Noto Sans SC', '思源黑体', 'Source Han Sans', 'Microsoft YaHei', sans-serif;

/* 英文/数字专用 */
--font-english: 'DIN Alternate', 'DIN', 'Helvetica Neue', Helvetica, Arial, sans-serif;
```

#### 字号系统

```css
--text-xs: 13px     /* 辅助说明 */
--text-sm: 15px     /* 正文、描述 */
--text-base: 17px   /* 标准正文 */
--text-lg: 21px     /* 小标题 */
--text-xl: 26px     /* 中标题 */
--text-2xl: 32px    /* 大标题 */
```

#### 字重系统

```css
--font-normal: 400
--font-medium: 500
--font-semibold: 600
--font-bold: 700
```

#### 行高系统

```css
--leading-tight: 1.2
--leading-normal: 1.4
--leading-relaxed: 1.6
```

### 2.4 间距系统

#### 基础间距（8px基准）

```css
--space-1: 8px
--space-2: 16px
--space-3: 24px
--space-4: 32px
--space-5: 40px
--space-6: 48px
--space-8: 64px
```

#### 圆角系统

```css
--radius-sm: 8px      /* 小元素 */
--radius-md: 12px     /* 按钮 */
--radius-lg: 16px     /* 卡片 */
--radius-xl: 20px     /* 大卡片 */
--radius-2xl: 24px    /* 超大圆角 */
--radius-full: 9999px /* 完全圆形 */
```

### 2.5 阴影系统

```css
/* 基础阴影 */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
--shadow-md: 0 2px 4px 0 rgba(0, 0, 0, 0.06);
--shadow-lg: 0 4px 8px 0 rgba(0, 0, 0, 0.08);
--shadow-xl: 0 8px 16px 0 rgba(0, 0, 0, 0.12);

/* 彩色阴影 */
--shadow-primary: 0 8px 30px rgba(13, 148, 136, 0.4);
--shadow-primary-hover: 0 12px 40px rgba(13, 148, 136, 0.5);
--shadow-cta: 0 8px 30px rgba(249, 115, 22, 0.4);
--shadow-card: 0 20px 60px rgba(13, 148, 136, 0.15);
```

### 2.6 布局结构

#### 整体布局

```
┌─────────────────────────────────────────┐
│  App Window (渐变背景)                   │
│  ┌─────────────────────────────────────┐│
│  │  Main Card (24px圆角 + 彩色阴影)      ││
│  │  ┌─────────────────────────────────┐││
│  │  │  Top Bar (渐变装饰条)            │││
│  │  └─────────────────────────────────┘││
│  │  ┌─────────────────────────────────┐││
│  │  │  Card Content                   │││
│  │  │  ┌─────────────────────────────┐│││
│  │  │  │  Header (渐变标题)           ││││
│  │  │  │  Subtitle                   ││││
│  │  │  │  Divider (渐变分割线)        ││││
│  │  │  └─────────────────────────────┘│││
│  │  │  ┌─────────────────────────────┐│││
│  │  │  │  Step Section 01            ││││
│  │  │  │  (渐变边框卡片)              ││││
│  │  │  └─────────────────────────────┘│││
│  │  │  ┌─────────────────────────────┐│││
│  │  │  │  Step Section 02            ││││
│  │  │  └─────────────────────────────┘│││
│  │  │  ┌─────────────────────────────┐│││
│  │  │  │  Primary Button             ││││
│  │  │  └─────────────────────────────┘│││
│  │  └─────────────────────────────────┘││
│  └─────────────────────────────────────┘│
│  Author Footer                          │
└─────────────────────────────────────────┘
```

#### 三阶段状态机

```typescript
type AppState = 'PREPARE' | 'PROCESSING' | 'COMPLETE'

const stateMachine = {
  PREPARE: {
    on: { START: 'PROCESSING' }
  },
  PROCESSING: {
    on: { 
      COMPLETE: 'COMPLETE',
      CANCEL: 'PREPARE',
      ERROR: 'COMPLETE'
    }
  },
  COMPLETE: {
    on: { RESET: 'PREPARE' }
  }
}
```

### 2.7 组件规范

#### FilePreviewCard（文件预览卡片）

```typescript
interface FilePreviewCardProps {
  file: FileInfo | null
  type: 'excel' | 'image'
  onSelect: () => void
  onClear?: () => void
}
```

**设计规格：**
- 尺寸：min-width: 500px, min-height: 180px
- 圆角：rounded-xl (12px)
- 边框：2px dashed gray-300
- 悬停效果：border-primary, shadow-md, -translate-y-0.5

#### ProgressPanel（进度面板）

```typescript
interface ProgressPanelProps {
  info: ProgressInfo
  onCancel: () => void
}
```

**设计规格：**
- 进度条高度：10px
- 渐变效果：from-primary to-blue-600
- 动画：脉冲指示器 + 渐变流动
- 信息：百分比 + 当前项 + 剩余时间预估

#### StatisticsCard（统计卡片）

```typescript
interface StatisticsCardProps {
  stats: ProcessingStats
  onViewErrors: () => void
  onOpenFile: () => void
}
```

**设计规格：**
- 网格布局：grid-cols-2 gap-4
- 四色统计：总数 (灰)/成功 (绿)/失败 (红)/成功率 (蓝)
- 渐变卡片背景：from-blue-50 to-indigo-50
- 按钮操作：查看错误 + 打开文件

### 2.8 动画系统

#### 过渡动画

```css
--transition-fast: all 0.15s var(--ease-in-out);
--transition-normal: all 0.2s var(--ease-in-out);
--transition-slow: all 0.3s var(--ease-in-out);
--transition-bounce: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

#### 关键帧动画

```css
/* 入场动画 - 缩放淡入 */
@keyframes scaleIn {
  0% { transform: scale(0.9); opacity: 0; }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); opacity: 1; }
}

/* 滑入动画 */
@keyframes slideUp {
  0% { transform: translateY(20px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

/* 脉冲动画 - 用于加载 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## 3. 文件整理系统

### 3.1 功能概述

自动文件整理系统，解决开发过程中产生的各类文件（测试输出、错误报告、图片等）缺乏统一管理的问题。

**核心需求：**
- **自动分类** - 每次生成/保存文件后，自动移动到对应分类目录
- **容易查找** - 通过索引维护原路径映射，支持快速查找
- **安全保护** - 不移动源代码、配置文件等关键文件
- **批量整理** - 支持扫描现有文件并批量整理

### 3.2 目录结构

```
项目根目录/
├── file_organizer/               # 文件整理系统代码
│   ├── __init__.py
│   ├── __main__.py              # CLI 入口
│   ├── organizer.py             # 主程序 - 文件监听与调度
│   ├── classifier.py            # 分类规则引擎
│   ├── indexer.py               # 文件索引管理
│   └── config.yaml              # 配置文件
│
├── .organized/                   # 整理后的文件
│   ├── outputs/
│   │   ├── test-results/        # 测试输出
│   │   └── reports/             # 测试报告
│   ├── data/
│   │   ├── images/              # 图片
│   │   └── archives/            # 压缩包
│   └── texts/                   # 文本文件
├── .self-improving/             # 自我改进系统
│   ├── corrections.md           # 错误修正记录
│   ├── index.md                 # 索引
│   └── memory.md                # 记忆
└── .trae/
    ├── specs/                   # 规格文档
    ├── rules/                   # 规则文件
    └── agents/                  # AI Agent 配置
```

### 3.3 分类规则

| 规则名称 | 匹配模式 | 目标目录 | 说明 |
|---------|---------|---------|------|
| 测试输出 | `TEST_OUTPUT_*.xlsx`, `*_test*.xlsx` | `data/test-results/` | 测试生成的 Excel |
| 错误报告 | `错误报告_*.txt`, `error_*.log` | `logs/errors/` | 错误日志 |
| 处理后Excel | `*_processed.xlsx` | `data/processed/` | 处理后的数据 |
| 测试报告 | `TEST_REPORT*.md`, `*_test_report.md` | `reports/` | Markdown 报告 |
| 原型HTML | `*.html` (source_dir: prototypes/) | `experiments/prototypes/` | HTML 原型 |
| 压缩包 | `*.zip`, `*.rar`, `*.7z` | `data/archives/` | 压缩文件 |
| 图片数据 | `C*.jpg`, `C*.png`, `*.jpg`, `*.png` | `data/images/` | 商品图片 |
| 临时文件 | `temp_*`, `*.tmp`, `~*` | `artifacts/temp/` | 临时文件 |

### 3.4 配置文件

```yaml
version: "1.0"

# 监听路径
watch_paths:
  - "."

# 排除目录（永远不移动）
exclude_dirs:
  - "src/"
  - ".trae/"
  - "node_modules/"
  - ".git/"
  - "public/"
  - "docs/"
  - ".venv/"
  - "dist/"
  - "build/"
  - ".organized/"

# 延迟时间（秒）
delay_seconds: 3

# 分类规则
rules:
  - name: "规则名称"
    patterns:
      - "匹配模式1"
      - "匹配模式2"
    target_dir: "目标目录/"
    source_dir: "可选的源目录限制"

# 默认分类
default_dir: "misc/"
```

### 3.5 索引系统

#### 索引文件格式

```json
{
  "index_version": 1,
  "last_updated": "2026-03-13T10:00:00Z",
  "files": [
    {
      "original_path": "Sample/TEST_OUTPUT_1.xlsx",
      "organized_path": "Sample/.organized/data/test-results/TEST_OUTPUT_1.xlsx",
      "category": "data/test-results",
      "moved_at": "2026-03-13T09:30:00Z"
    }
  ]
}
```

#### 并发安全机制

使用 `filelock` 库实现文件级锁：

```python
from filelock import FileLock

lock = FileLock(self.lock_path)
with lock:
    data = self._load()
    # 修改数据
    self._save(data)
```

#### 索引 API

```python
# 添加/更新条目
indexer.add_entry(
    original_path="Sample/test.xlsx",
    organized_path="Sample/.organized/data/test.xlsx",
    category="data"
)

# 按原路径搜索
results = indexer.find_by_original("TEST_OUTPUT")

# 按分类搜索
results = indexer.find_by_category("data/test-results")

# 列出所有条目
all_files = indexer.list_all()
```

### 3.6 CLI 命令

```bash
# 启动文件监听
python -m file_organizer start

# 查看整理状态
python -m file_organizer status

# 搜索文件
python -m file_organizer find --query "TEST_OUTPUT"

# 扫描并整理现有文件
python -m file_organizer scan --path ./Sample
```

### 3.7 核心类

```python
# FileOrganizer - 主类
class FileOrganizer:
    def __init__(self, config_path: str = "file_organizer/config.yaml")
    def start(self)                           # 启动监听
    def stop(self)                            # 停止监听
    def scan_and_organize(self, root_path: str)  # 批量扫描
    def _organize_file(self, file_path: str)  # 单文件整理
    def _is_file_stable(self, file_path: str) -> bool  # 文件稳定性检查
    def _safe_move_file(self, source: str, target: str) -> bool  # 安全移动

# Classifier - 分类器
class Classifier:
    def __init__(self, rules_config: List[dict])
    def classify(self, filename: str, source_dir: str = None) -> Optional[str]

# FileIndexer - 索引器
class FileIndexer:
    def add_entry(self, original_path: str, organized_path: str, category: str)
    def find_by_original(self, query: str) -> List[dict]
    def find_by_category(self, category: str) -> List[dict]
    def list_all(self) -> List[dict]
```

---

## 4. 进度条动画系统

### 4.1 问题背景

**原始问题：**
- 0% → 10% 跳跃：解析阶段进度更新过快
- 95% → 结果页：100% 后立即切换页面，动画被中断

**根因：**
- 后端同步连续发送进度，前端 React 渲染周期无法捕获中间值
- 组件卸载会中断动画

### 4.2 解决方案

采用**前端主导的平滑动画系统**：
- 后端发送关键进度节点，中间添加 `time.sleep()` 延迟
- 前端使用 `requestAnimationFrame` 实现平滑动画
- 结果页面延迟显示，让用户看到 100% 完成状态

### 4.3 阶段定义

```
0% → 5% → 10% → ... → 90% → 95% → 99% → 100%
│    │     │           │     │     │      │
│    │     │           │     │     │      └── 处理完成
│    │     │           │     │     └────────── 保存中 (即将完成)
│    │     │           │     └──────────────── 保存中 (进行中)
│    │     │           └────────────────────── 保存中 (开始)
│    │     └────────────────────────────────── 处理中
│    └──────────────────────────────────────── 解析中 (图片加载完成)
└───────────────────────────────────────────── 解析中 (开始)
```

### 4.4 延迟策略

| 阶段 | 延迟 | 说明 |
|------|------|------|
| 0% → 5% | 150ms | 让用户看到解析开始 |
| 5% → 10% | 150ms | 让用户感知阶段切换 |
| 90% → 95% | 150ms | 保存开始 |
| 95% → 99% | 150ms | 保存进行中 |
| 99% → 100% | 300ms | 即将完成 |
| 100% 停留 | 500ms | 确认完成状态 |
| 结果页延迟 | 800ms | 让用户看到 100% 动画 |

### 4.5 动画算法

```typescript
// ease-out 缓动算法
const speed = Math.max(Math.abs(diff) * 0.08, 0.3);
const next = prev + (diff > 0 ? speed : -speed);
```

**特性：**
- 差距大时移动快（快速接近目标）
- 差距小时移动慢（平滑减速）
- 最小速度 0.3% 确保慢速时也能看到动画

### 4.6 useSmoothProgress Hook

```typescript
function useSmoothProgress(actualProgress: number, isComplete: boolean) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [showResult, setShowResult] = useState(false);
  
  // 1. 确保进度只增不减
  // 2. ease-out 缓动动画
  // 3. 延迟 800ms 显示结果页面
  
  return { displayProgress, showResult };
}
```

### 4.7 后端配合

```python
# 解析阶段
progress_callback(5.0)
time.sleep(0.15)  # 延迟确保前端渲染

progress_callback(10.0)
time.sleep(0.15)

# 保存阶段
progress_callback(90.0)
time.sleep(0.15)

progress_callback(95.0)
time.sleep(0.15)

progress_callback(99.0)
time.sleep(0.3)

progress_callback(100.0)
time.sleep(0.5)  # 停留片刻
```

---

## 5. 组件实现细节

### 5.1 FilePicker 组件

**功能：** 文件选择器，支持文件和文件夹选择，带实时验证

**Props：**
```typescript
interface FilePickerProps {
  step: number;                    // 步骤编号
  label: string;                   // 标签文本
  iconType?: 'excel' | 'image' | 'folder';
  accept: string;                  // 接受的文件类型
  value: FileInfo | null;          // 当前值
  onChange: (file: FileInfo | null) => void;
  isFolder?: boolean;              // 是否选择文件夹
  disabled?: boolean;              // 是否禁用
  hint?: string;                   // 提示文本
  onValidationChange?: (isValid: boolean) => void;  // 验证状态回调
  onReset?: () => void;            // 重置回调
}
```

**验证逻辑：**
1. **Excel 验证** - 检查文件格式、验证"商品编码"列存在
2. **图片来源验证** - 检查压缩包格式、验证包含图片文件
3. **实时反馈** - 验证中显示"验证中..."，验证通过显示绿色勾选，失败显示红色错误图标

**状态管理：**
```typescript
interface ValidationStatus {
  isValidating: boolean;  // 是否正在验证
  isValid: boolean | null; // 验证结果
  message: string;         // 验证消息
}
```

### 5.2 ProcessingPage 组件

**功能：** 处理页面，显示进度、结果或错误

**Props：**
```typescript
interface ProcessingPageProps {
  progress: number;        // 进度百分比
  current: string;         // 当前操作描述
  total?: number;          // 总行数
  result?: ProcessingResult;  // 处理结果
  error?: AppError;        // 错误信息
  onCancel: () => void;    // 取消回调
  onOpenFile: () => void;  // 打开文件回调
  onReset: () => void;     // 重置回调
}
```

**状态显示：**
- **处理中** - 显示进度条、当前操作、取消按钮
- **完成** - 显示统计卡片（成功/失败/成功率）、打开文件按钮
- **错误** - 显示错误图标、错误消息、解决建议、重置按钮

### 5.3 useAppState Hook

**功能：** 应用状态管理，使用 React Context + useReducer

**State：**
```typescript
interface AppState {
  phase: 'IDLE' | 'READY' | 'PROCESSING' | 'COMPLETE' | 'ERROR';
  excelFile?: FileInfo;
  imageSource?: FileInfo;
  progress?: number;
  current?: string;
  total?: number;
  result?: ProcessingResult;
  error?: AppError;
}
```

**Actions：**
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

### 5.4 IPC 通信

**主进程 → 渲染进程：**
```typescript
// 进度更新
window.electronAPI.onProgress((data) => {
  updateProgress(data.percent, data.current, data.total);
});

// 处理完成
window.electronAPI.onComplete((data) => {
  completeProcessing(data);
});

// 错误处理
window.electronAPI.onError((data) => {
  handleError(data);
});
```

**渲染进程 → 主进程：**
```typescript
// 选择文件
const file = await window.electronAPI.selectFile(accept, title, isFolder);

// 验证文件
const result = await window.electronAPI.validateFile(filePath, accept);

// 验证 Excel 列
const columnResult = await window.electronAPI.validateExcelColumns(filePath);

// 验证图片来源
const imageResult = await window.electronAPI.validateImageSource(filePath);

// 开始处理
await window.electronAPI.startProcess(excelPath, imageSourcePath, outputPath);

// 取消处理
await window.electronAPI.cancelProcess();

// 打开文件
await window.electronAPI.openFile(filePath);
```

### 5.5 错误处理

**错误类型：**
```typescript
enum ErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  INVALID_FORMAT = 'INVALID_FORMAT',
  PROCESS_ERROR = 'PROCESS_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  API_NOT_AVAILABLE = 'API_NOT_AVAILABLE',
  EXCEL_MISSING_COLUMN = 'EXCEL_MISSING_COLUMN',
  IMAGE_SOURCE_EMPTY = 'IMAGE_SOURCE_EMPTY',
}
```

**错误信息：**
```typescript
interface AppError {
  type: ErrorType;
  message: string;      // 用户友好的错误消息
  resolution: string;   // 解决建议
}
```

**错误处理流程：**
1. **文件选择阶段** - 验证文件格式、内容，显示实时错误
2. **处理阶段** - Python 进程返回错误，通过 IPC 传递到前端
3. **显示阶段** - ProcessingPage 显示错误图标、消息、解决建议

---

## 6. 附录

### 6.1 术语表

| 术语 | 定义 |
|------|------|
| **WCAG** | Web Content Accessibility Guidelines（网页内容无障碍指南） |
| **AAA 标准** | WCAG 最高级别，要求文字对比度 ≥ 7:1 |
| **设计令牌** | Design Tokens，设计系统的原子单位（颜色、间距等） |
| **缓动函数** | Easing Function，控制动画速度变化曲线 |
| **微交互** | Micro-interaction，细微的交互反馈 |
| **IPC** | Inter-Process Communication，进程间通信 |
| **Reducer** | 状态管理函数，接收当前状态和动作，返回新状态 |

### 6.2 依赖列表

| 库 | 用途 | 版本 |
|---|------|------|
| `electron` | 桌面应用框架 | >=28.0.0 |
| `react` | UI 框架 | >=18.2.0 |
| `typescript` | 类型系统 | >=5.3.0 |
| `tailwindcss` | CSS 框架 | >=3.4.0 |
| `watchdog` | 文件系统监听 | >=3.0.0 |
| `pyyaml` | 配置文件解析 | >=6.0 |
| `filelock` | 文件级锁 | >=3.0 |
| `rarfile` | RAR 文件处理 | >=4.0 |
| `openpyxl` | Excel 文件处理 | >=3.1.0 |
| `Pillow` | 图片处理 | >=10.0.0 |
| `PyQt6` | GUI 框架 | >=6.4.0 |
| `watchdog` | 文件系统监听 | >=3.0.0 |
| `pyyaml` | YAML 配置解析 | >=6.0 |
| `filelock` | 文件级锁 | >=3.0 |

### 6.3 项目文件清单

#### TypeScript/React 文件
| 文件路径 | 说明 |
|---------|------|
| `src/main/main.ts` | Electron 主进程入口 |
| `src/main/ipc-handlers.ts` | IPC 处理程序 |
| `src/main/preload.ts` | 预加载脚本 |
| `src/main/utils/permissions.ts` | 权限管理工具 |
| `src/renderer/App.tsx` | 主应用组件 |
| `src/renderer/main.tsx` | 渲染进程入口 |
| `src/renderer/components/FilePicker.tsx` | 文件选择器组件 |
| `src/renderer/components/ProcessingPage.tsx` | 处理页面组件 |
| `src/renderer/components/ProgressBar.tsx` | 进度条组件 |
| `src/renderer/components/ResultView.tsx` | 结果展示组件 |
| `src/renderer/components/ErrorDialog.tsx` | 错误对话框组件 |
| `src/renderer/components/WelcomeGuide.tsx` | 欢迎引导组件 |
| `src/renderer/components/Icons.tsx` | 图标组件 |
| `src/renderer/hooks/useAppState.tsx` | 应用状态管理 Hook |
| `src/renderer/hooks/useProcessor.ts` | 处理逻辑 Hook |
| `src/renderer/hooks/useFilePicker.ts` | 文件选择逻辑 Hook |
| `src/renderer/hooks/useTheme.ts` | 主题管理 Hook |
| `src/renderer/utils/errorHandler.ts` | 错误处理工具 |
| `src/shared/types.ts` | 共享类型定义 |
| `src/shared/types.d.ts` | 类型声明文件 |

#### Python 文件
| 文件路径 | 说明 |
|---------|------|
| `src/python/gui_processor.py` | GUI 处理器入口（Electron 调用） |
| `src/python/processor.py` | 模拟处理器（测试用） |
| `src/core/process_engine.py` | 核心处理引擎 |
| `src/core/excel_processor.py` | Excel 处理器（openpyxl） |
| `src/core/image_processor.py` | 图片处理器（Pillow） |
| `src/core/picture_variant.py` | Picture 字段变体识别（24种变体） |
| `src/utils/path_manager.py` | 路径管理器 |
| `src/utils/font_manager.py` | 字体管理器（PyQt6） |
| `src/utils/config.py` | 配置管理器（QSettings） |
| `src/utils/text_formatter.py` | 文本格式化工具 |
| `src/main.py` | PyQt6 GUI 入口（备用） |
| `src/cli.py` | 命令行入口 |
| `file_organizer/organizer.py` | 文件整理主程序 |
| `file_organizer/classifier.py` | 分类规则引擎 |
| `file_organizer/indexer.py` | 文件索引管理 |
| `file_organizer/__main__.py` | 文件整理 CLI 入口 |

#### 配置文件
| 文件路径 | 说明 |
|---------|------|
| `file_organizer/config.yaml` | 文件整理配置 |
| `package.json` | Node.js 依赖配置 |
| `tsconfig.json` | TypeScript 配置 |
| `tailwind.config.js` | Tailwind CSS 配置 |

### 6.4 变更日志

#### v2.3 (2026-03-14)
- ✅ 修正项目结构以匹配实际代码
- ✅ 更新技术栈（openpyxl, Pillow, rarfile）
- ✅ 完善 Python 模块列表（core/utils）
- ✅ 添加核心处理引擎详细说明（6.6节）
- ✅ 添加 Excel 处理器详细说明（6.7节）
- ✅ 添加图片处理器详细说明（6.8节）
- ✅ 添加配置管理器详细说明（6.9节）
- ✅ 添加路径管理器详细说明（6.10节）
- ✅ 添加字体管理器详细说明（6.11节）
- ✅ 更新 Picture 字段变体实现细节（6.12节）
- ✅ 修正文件整理系统目录结构
- ✅ 添加缺失的组件和 Hooks

#### v2.2 (2026-03-13)
- ✅ 融合 .trae/specs/ 内容
- ✅ 添加详细验收标准（功能/性能/兼容性）
- ✅ 添加 Picture 字段变体列表（24种）
- ✅ 添加错误代码速查表（E001-E010）
- ✅ 添加开发路线图（Phase 1-3）

#### v2.1 (2026-03-13)
- ✅ 添加组件实现细节章节
- ✅ 添加状态管理说明
- ✅ 添加 IPC 通信文档
- ✅ 添加错误处理流程
- ✅ 添加项目文件清单
- ✅ 完善技术架构说明

#### v2.0 (2026-03-13)
- ✅ 统一所有 spec 文档
- ✅ 整合 GUI 设计系统
- ✅ 整合文件整理系统
- ✅ 整合进度条动画系统
- ✅ 添加项目概述
- ✅ 添加附录

#### v1.1 (File Organizer)
- ✅ 添加索引系统详细说明
- ✅ 补充 filelock 依赖
- ✅ 完善核心类文档

#### v1.0 (GUI Design)
- 🎉 初始版本设计

### 6.5 验收标准

#### 功能验收

| ID | 功能 | 验收标准 | 测试方法 | 优先级 |
|----|------|---------|---------|--------|
| F01 | 文件选择 | 支持 Excel 和图片来源选择，有视觉反馈 | 手动测试 | P0 |
| F02 | 文件验证 | Excel 验证"商品编码"列，图片验证文件存在 | 单元测试 | P0 |
| F03 | 图片匹配 | 商品编码 C00001 匹配 C00001.jpg | 集成测试 | P0 |
| F04 | 图片插入 | Picture 1/2/3 列正确插入图片 | 集成测试 | P0 |
| F05 | 进度显示 | 实时显示处理进度和当前行 | 手动测试 | P1 |
| F06 | 错误处理 | 显示友好错误信息和解决建议 | 手动测试 | P1 |
| F07 | 结果展示 | 显示成功/失败数量和成功率 | 手动测试 | P1 |
| F08 | 文件打开 | 处理完成后可打开输出文件 | 手动测试 | P2 |

#### 性能验收

| ID | 指标 | 目标值 | 测试方法 |
|----|------|--------|---------|
| P01 | 启动时间 | < 3 秒 | 手动计时 |
| P02 | 内存占用 | < 200MB | 任务管理器 |
| P03 | 处理速度 | 100行/秒 | 日志统计 |
| P04 | UI 响应 | < 100ms | 视觉感知 |

#### 兼容性验收

| ID | 场景 | 要求 | 优先级 |
|----|------|------|--------|
| C01 | Windows 10/11 | 完全支持 | P0 |
| C02 | Excel 2016+ | 完全支持 | P0 |
| C03 | 图片格式 | JPG, PNG 支持 | P0 |
| C04 | 压缩格式 | ZIP 支持 | P1 |
| C05 | 高分屏 | 2K/4K 适配 | P2 |

### 6.6 核心处理引擎

#### ProcessEngine 类

**位置**: `src/core/process_engine.py`

**职责**: 协调 Excel 处理和图片插入的完整流程

**核心方法**:
```python
class ProcessEngine:
    def __init__(self, progress_callback: Optional[Callable] = None)
    def process(self, excel_path: str, image_source_path: str, 
                output_path: Optional[str] = None) -> ProcessingResult
    def safe_process(self, excel_path: str, image_source_path: str,
                     output_path: Optional[str] = None,
                     max_retries: int = 3) -> ProcessingResult
```

**处理流程**:
1. 加载图片源（文件夹或压缩包）
2. 解析 Excel 文件
3. 匹配商品编码与图片
4. 插入图片到对应列
5. 保存结果

#### ImageMatcher 类

**职责**: 管理商品编码到图片的映射关系

```python
class ImageMatcher:
    def __init__(self, images: Dict[str, List[ImageInfo]])
    def get_image(self, product_code: str, column_number: int) -> Optional[ImageInfo]
    def has_image(self, product_code: str, column_number: int) -> bool
    def get_all_product_codes(self) -> Set[str]
    def get_max_picture_column(self, product_code: str) -> int
```

### 6.7 Excel 处理器

**位置**: `src/core/excel_processor.py`

**ExcelProcessor 类**:

```python
class ExcelProcessor:
    def __init__(self, file_path: str, read_only: bool = True)
    def find_sheet_with_product_code(self) -> Optional[SheetInfo]
    def add_picture_columns(self, needed_columns: int) -> ColumnAdditionResult
    def embed_image(self, row: int, column: int, image_data: bytes)
    def save(self, output_path: Optional[str] = None)
```

**SheetInfo 数据类**:
```python
@dataclass
class SheetInfo:
    name: str
    product_code_column: int
    header_row: int
    data_rows: List[int]
    picture_columns: Dict[int, str]  # 列号 -> 列名
```

### 6.8 图片处理器

**位置**: `src/core/image_processor.py`

**ImageProcessor 类**:

```python
class ImageProcessor:
    def __init__(self, memory_optimized: bool = False)
    def load_from_folder(self, folder_path: str) -> Dict[str, List[ImageInfo]]
    def load_from_archive(self, archive_path: str) -> Dict[str, List[ImageInfo]]
    def validate_image_source(self, source_path: str) -> dict
    
    # 图片处理
    def resize_image(self, image_data: bytes, 
                     target_width: int = 180, 
                     target_height: int = 138) -> bytes
```

**ImageInfo 数据类**:
```python
@dataclass
class ImageInfo:
    product_code: str      # 商品编码
    sequence: int          # 序号
    column_number: int     # 列号
    format: str            # 图片格式
    source_path: str       # 源路径
    image: Optional[Image] # PIL Image 对象（可选）
```

**图片命名规范**:
- 格式: `{商品编码}-{序号}.{格式}`
- 示例: `C00001-1.jpg`, `C00001-2.png`
- 序号: 1-10，对应 Picture 1-10 列

### 6.9 配置管理器

**位置**: `src/utils/config.py`

**Config 类**:

```python
class Config:
    def __init__(self, organization_name: str = "ImageAutoInserter",
                 app_name: str = "ImageAutoInserter")
    
    # 通用配置
    def get(self, key: str, default: Any = None) -> Any
    def set(self, key: str, value: Any)
    
    # 窗口状态
    def save_window_state(self, state: dict)
    def load_window_state(self) -> dict
    
    # 最近文件
    def add_recent_file(self, file_path: str)
    def get_recent_files(self, max_count: int = 10) -> List[str]
    
    # 用户偏好
    def save_preference(self, key: str, value: Any)
    def load_preference(self, key: str, default: Any = None) -> Any
```

**存储位置**:
- Windows: `%APPDATA%/ImageAutoInserter/`
- macOS: `~/Library/Application Support/ImageAutoInserter/`
- Linux: `~/.config/ImageAutoInserter/`

### 6.10 路径管理器

**位置**: `src/utils/path_manager.py`

**PathManager 类**:

```python
class PathManager:
    def __init__(self)
    
    # 项目路径
    def get_src_path(self) -> Path
    def get_assets_path(self) -> Path
    def get_fonts_path(self) -> Path
    def get_font_path(self, font_type: str) -> Path
    
    # 资源路径
    def get_resource_path(self, relative_path: str) -> Path
    
    # 路径验证
    def validate_path(self, path: str, must_exist: bool = True) -> bool
    def validate_excel_path(self, path: str) -> dict
    def validate_image_source_path(self, path: str) -> dict
```

### 6.11 字体管理器

**位置**: `src/utils/font_manager.py`

**FontManager 类**:

```python
class FontManager:
    def __init__(self)
    def get_system_fonts(self) -> List[str]
    def get_chinese_fonts(self) -> List[str]
    def get_english_fonts(self) -> List[str]
    def load_font(self, font_path: str) -> QFont
    def get_best_chinese_font(self) -> str
```

### 6.12 Picture 字段变体

#### 英文变体（8种）
| 基础词 | 单数形式 | 复数形式 | 缩写 |
|--------|---------|---------|------|
| Picture | `Picture 1` | `Pictures 1` | `Pic 1` |
| Photo | `Photo 1` | `Photos 1` | - |
| Image | `Image 1` | `Images 1` | `Img 1` |
| Figure | `Figure 1` | `Figures 1` | `Fig 1` |

#### 中文变体（4种）
| 基础词 | 示例 |
|--------|------|
| 图片 | `图片 1`, `图片1` |
| 照片 | `照片 1`, `照片1` |
| 图像 | `图像 1`, `图像1` |
| 图 | `图 1`, `图1` |

#### 支持的格式变体
- **有空格**: `Picture 1`, `Photo 2`
- **无空格**: `Picture1`, `Photo2`
- **括号格式**: `Picture(1)`, `Photo(2)`
- **点分隔**: `Pic.1`, `Fig.1`
- **下划线**: `Picture_1`, `Photo_2`

#### 拼写纠错
系统自动纠正常见拼写错误：
- `Photoes` → `Photos`
- `Pitures` → `Pictures`
- `Foto` → `Photo`

#### 核心类
```python
# VariantRecognizer - 变体识别器
recognizer = VariantRecognizer()
result = recognizer.recognize("Photo 1")  # ("Photo", 1)

# PictureColumnMapper - 列映射管理器
mapper = PictureColumnMapper()
mapper.scan_worksheet(worksheet, header_row)
needed = mapper.calculate_needed_columns(max_pictures=5)

# 公共接口函数
recognize_variant("Picture1")      # ("Picture", 1)
correct_spelling("Photoes")        # "Photos"
is_picture_variant("Photo 1")      # True
```

**匹配规则：**
1. 识别变体但不修改原始表头名称
2. 内部使用标准化格式处理
3. 支持 1-10 个 Picture 列（自动扩展）
4. 匹配不区分大小写

### 6.13 错误代码速查表

| 错误代码 | 描述 | 用户提示 | 解决建议 |
|---------|------|---------|---------|
| E001 | 文件不存在 | 选择的文件不存在或已被删除 | 请重新选择文件 |
| E002 | 文件格式错误 | 文件格式不支持 | 请选择 .xlsx 格式的 Excel 文件 |
| E003 | Excel 读取失败 | 无法读取 Excel 文件 | 请检查文件是否损坏或被占用 |
| E004 | 缺少商品编码列 | Excel 中未找到"商品编码"列 | 请确保 Excel 包含"商品编码"列 |
| E005 | 图片源为空 | 选择的图片源中没有图片文件 | 请选择包含图片的文件夹或压缩包 |
| E006 | 图片格式不支持 | 包含不支持的图片格式 | 仅支持 JPG 和 PNG 格式 |
| E007 | 处理过程错误 | 处理过程中发生错误 | 请检查日志文件获取详细信息 |
| E008 | 内存不足 | 系统内存不足 | 请关闭其他程序后重试 |
| E009 | 磁盘空间不足 | 磁盘空间不足 | 请清理磁盘空间后重试 |
| E010 | 权限不足 | 没有权限访问文件 | 请以管理员身份运行程序 |

### 6.14 开发路线图

#### Phase 1: MVP (已完成)
- ✅ 基础 GUI 界面
- ✅ Excel 文件选择
- ✅ 图片来源选择
- ✅ 图片插入功能
- ✅ 进度显示
- ✅ 错误处理

#### Phase 2: 优化 (已完成)
- ✅ 文件自动整理系统
- ✅ 进度条动画优化
- ✅ 错误提示优化
- ✅ 文件验证功能

#### Phase 3: 增强 (规划中)
- [ ] 批量处理多个 Excel
- [ ] 图片压缩功能
- [ ] 云端同步
- [ ] 插件系统

### 6.15 参考文档

- [Tailwind CSS 文档](https://tailwindcss.com)
- [Electron 文档](https://www.electronjs.org)
- [React 文档](https://react.dev)
- [WCAG 2.1 指南](https://www.w3.org/WAI/WCAG21/quickref/)

---

**文档结束**

**版本**: v2.3  
**最后更新**: 2026-03-14  
**维护者**: AI Assistant + 开发团队

如需查看历史版本，请访问 `docs/archive/` 目录。
