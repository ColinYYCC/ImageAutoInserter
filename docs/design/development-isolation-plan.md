# 界面开发隔离方案

**版本：** v2.0  
**创建日期：** 2026-03-06  
**更新日期：** 2026-03-06（新增 Electron 方案）  
**目的：** 确保界面开发不影响现有业务代码

---

## 📋 目录

1. [核心原则](#核心原则)
2. [隔离机制](#隔离机制)
3. [代码分层架构](#代码分层架构)
4. [Git 工作流保护](#git-工作流保护)
5. [改动范围清单](#改动范围清单)
6. [保护机制](#保护机制)
7. [三种实施方案](#三种实施方案)
8. [Electron 方案详细评估](#electron-方案详细评估)

---

## 核心原则

### 🔒 零干扰原则

**界面开发不得影响现有业务逻辑**，所有新增代码必须：
- ✅ 在独立目录/分支开发
- ✅ 与现有代码物理隔离
- ✅ 向后兼容现有功能
- ✅ 可独立测试和验证

### 📦 分层架构原则

采用**严格分层**架构，确保关注点分离：

```
┌─────────────────────────────────┐
│      表现层 (Presentation)       │  ← 新增 UI 代码
│   - 窗口、组件、样式、动画       │
├─────────────────────────────────┤
│      业务层 (Business Logic)     │  ← 现有代码（不改动）
│   - Excel 处理、图片匹配         │
├─────────────────────────────────┤
│      数据层 (Data Access)        │  ← 现有代码（不改动）
│   - 文件读写、压缩包处理         │
└─────────────────────────────────┘
```

---

## 隔离机制

### 1. Git 工作树隔离

使用 `git worktree` 创建独立开发环境：

```bash
# 步骤 1：创建独立工作树
git worktree add ../feature-ui -b feature/ui-implementation

# 步骤 2：进入独立工作目录
cd ../feature-ui

# 步骤 3：在隔离环境中开发 UI
# - 不影响主分支 (main/master)
# - 不影响其他开发分支
# - 可随时切换回主分支

# 步骤 4：完成后清理（可选）
cd ..
git worktree remove feature-ui
```

**优势：**
- 🛡️ **物理隔离** - 工作目录完全独立
- 🔄 **并行开发** - 可同时进行其他功能开发
- 🚀 **快速切换** - 秒级切换不同分支
- 🔙 **易于回滚** - 删除工作树即可回滚

---

### 2. 目录隔离

#### 方案 A：子目录隔离（推荐）

```
ImageAutoInserter/
├── src/
│   ├── core/              # 现有业务代码（不改动）
│   │   ├── excel_processor.py
│   │   ├── image_matcher.py
│   │   └── updater.py
│   │
│   └── ui/                # 新增 UI 代码（隔离）
│       ├── __init__.py
│       ├── main_window.py
│       ├── components/
│       │   ├── buttons.py
│       │   ├── cards.py
│       │   └── inputs.py
│       ├── layouts/
│       └── styles/
│
├── tests/
│   ├── test_core/         # 现有测试（不改动）
│   └── test_ui/           # 新增 UI 测试
│
└── main.py                # 主入口（可选修改）
```

**特点：**
- 新增代码在 `src/ui/` 目录
- 与现有 `src/core/` 物理隔离
- 目录结构清晰，易于维护

---

#### 方案 B：独立项目隔离（保守）

```
ImageAutoInserter/              # 原项目（完全不动）
└── src/
    └── core/

ui-app/                         # 独立 UI 项目（新建）
├── main.py                     # 独立启动文件
├── ui/
│   ├── main_window.py
│   └── components/
├── requirements.txt
└── README.md
```

**ui-app/main.py 示例：**
```python
import sys
import os

# 导入现有业务代码
sys.path.append(os.path.join(os.path.dirname(__file__), '../ImageAutoInserter/src'))
from core.processor import process_excel

# UI 代码
from ui.main_window import MainWindow

def main():
    app = QApplication([])
    window = MainWindow(process_excel)  # 注入业务逻辑
    window.show()
    app.exec()

if __name__ == '__main__':
    main()
```

**特点：**
- 🔒 **完全隔离** - UI 作为独立项目存在
- 📦 **零改动** - 原项目 100% 保留
- 🔗 **依赖注入** - 通过导入复用现有逻辑

---

## 代码分层架构

### 架构设计

```python
# UI 层（新增）
src/ui/
├── main_window.py          # 主窗口（纯 UI 逻辑）
├── components/             # UI 组件（纯 UI 逻辑）
└── styles/                 # 样式定义（纯 UI 逻辑）

# 业务层（现有，不改动）
src/core/
├── excel_processor.py      # Excel 处理（业务逻辑）
├── image_matcher.py        # 图片匹配（业务逻辑）
└── updater.py              # 更新检查（业务逻辑）

# 适配层（可选，新增）
src/adapters/
└── ui_adapter.py           # UI 与业务逻辑的桥接
```

### 依赖关系

```
┌──────────────┐
│   UI Layer   │  ← 依赖业务层
│  (新增代码)   │
└──────┬───────┘
       ↓
┌──────────────┐
│ Business     │  ← 无依赖（独立）
│ Layer        │
│ (现有代码)   │
└──────┬───────┘
       ↓
┌──────────────┐
│ Data Layer   │  ← 无依赖（独立）
│ (现有代码)   │
└──────────────┘
```

**关键规则：**
- ✅ UI 层可以调用业务层
- ❌ 业务层不能依赖 UI 层
- ✅ 业务层保持独立和可测试

---

## Git 工作流保护

### 分支策略

```
main/master (主分支 - 稳定版本)
  │
  ├── feature/ui-implementation (UI 开发分支)
  │     │
  │     └── 所有 UI 改动在此分支
  │
  └── feature/other (其他功能分支)
        └── 并行开发，互不干扰
```

### 提交流程

```bash
# 1. 创建功能分支
git checkout -b feature/ui-implementation

# 2. 开发 UI 功能（仅改动 UI 相关文件）
git add src/ui/
git add tests/test_ui/
git commit -m "feat(ui): 实现主窗口和核心组件"

# 3. 定期与主分支同步（解决冲突）
git fetch origin
git rebase origin/main

# 4. 完成后请求审查
git push origin feature/ui-implementation
# → 创建 Pull Request
# → 代码审查（确保业务代码未改动）
# → 合并到主分支
```

### 审查检查清单

创建 Pull Request 时，审查者必须检查：

```markdown
## 代码审查清单

### 改动范围检查
- [ ] 所有改动在 `src/ui/` 目录
- [ ] `src/core/` 目录无改动
- [ ] 业务逻辑文件无改动
- [ ] 配置文件无改动（除依赖外）

### 代码质量检查
- [ ] UI 组件可复用
- [ ] 样式使用设计令牌
- [ ] 注释完整
- [ ] 测试覆盖

### 向后兼容检查
- [ ] 现有测试全部通过
- [ ] 命令行功能仍可用
- [ ] 无破坏性变更

### 安全性检查
- [ ] 无敏感信息泄露
- [ ] 无硬编码密钥
- [ ] 依赖版本安全
```

---

## 改动范围清单

### ✅ 允许改动的文件

| 文件/目录 | 改动类型 | 说明 |
|----------|---------|------|
| `src/ui/` | ✅ 新增 | 整个目录都是新增的 |
| `tests/test_ui/` | ✅ 新增 | UI 测试代码 |
| `main.py` | ⚠️ 可选修改 | 仅添加 UI 启动代码（1-3 行） |
| `requirements.txt` | ⚠️ 可选修改 | 添加 PyQt6 依赖 |
| `README.md` | ⚠️ 可选修改 | 添加 UI 使用说明 |

### ❌ 禁止改动的文件

| 文件/目录 | 保护级别 | 说明 |
|----------|---------|------|
| `src/core/` | 🔴 严格保护 | 核心业务逻辑，禁止改动 |
| `src/utils/` | 🔴 严格保护 | 工具函数，禁止改动 |
| `tests/test_core/` | 🔴 严格保护 | 现有测试，禁止改动 |
| `.env.example` | 🔴 严格保护 | 环境配置，禁止改动 |
| `setup.py` | 🟡 谨慎修改 | 仅添加必要配置 |

---

## 保护机制

### 1. 代码审查保护

所有 PR 必须经过审查，确保：
- ✅ 业务代码未被修改
- ✅ 改动范围符合预期
- ✅ 测试全部通过

**审查工具：**
```bash
# 查看改动范围
git diff --stat main..feature/ui-implementation

# 只查看业务代码改动（应该为空）
git diff main..feature/ui-implementation src/core/

# 验证改动文件列表
git diff --name-only main..feature/ui-implementation
```

---

### 2. 自动化测试保护

#### 现有测试保护

```bash
# 运行现有测试（确保未破坏）
pytest tests/test_core/ -v

# 期望输出：
# test_core/test_excel_processor.py::test_process_excel PASSED
# test_core/test_image_matcher.py::test_match_images PASSED
# ...
# 所有测试必须通过
```

#### 新增 UI 测试

```bash
# 运行 UI 测试
pytest tests/test_ui/ -v

# 期望输出：
# test_ui/test_components.py::test_button_creation PASSED
# test_ui/test_layouts.py::test_responsive_layout PASSED
# ...
```

#### 完整测试套件

```bash
# 运行所有测试
pytest tests/ -v

# 覆盖率报告
pytest tests/ --cov=src --cov-report=html
```

---

### 3. Git 钩子保护

创建 `.git/hooks/pre-commit` 钩子：

```bash
#!/bin/bash

# 预提交检查脚本

echo "🔍 运行预提交检查..."

# 1. 检查是否修改了受保护的文件
PROTECTED_FILES=$(git diff --cached --name-only | grep -E "^src/core/|^tests/test_core/")

if [ ! -z "$PROTECTED_FILES" ]; then
    echo "❌ 错误：禁止修改受保护的文件："
    echo "$PROTECTED_FILES"
    echo ""
    echo "请使用以下命令撤销："
    echo "  git reset HEAD $PROTECTED_FILES"
    echo "  git checkout -- $PROTECTED_FILES"
    exit 1
fi

# 2. 运行现有测试
echo "✅ 运行现有测试..."
pytest tests/test_core/ -q

if [ $? -ne 0 ]; then
    echo "❌ 错误：现有测试失败，禁止提交"
    exit 1
fi

echo "✅ 预提交检查通过"
exit 0
```

**使用方法：**
```bash
# 使钩子可执行
chmod +x .git/hooks/pre-commit

# 提交时自动运行检查
git commit -m "feat(ui): 添加新组件"
```

---

### 4. 文档保护

#### 改动日志

在 `CHANGELOG.md` 中明确记录：

```markdown
## [Unreleased]

### Added
- UI 层：新增 `src/ui/` 目录及所有组件
- UI 测试：新增 `tests/test_ui/` 目录
- 依赖：添加 PyQt6 支持

### Changed
- `main.py`: 添加 GUI 启动选项（向后兼容）

### Fixed
- 无

### 未改动
- `src/core/`: 业务逻辑完全保留
- `tests/test_core/`: 现有测试完全保留
```

---

## 三种实施方案

### 方案对比总览

| 特性 | **方案 A：Electron** ⭐⭐⭐⭐⭐ | **方案 B：PyQt6** ⭐⭐⭐⭐ | **方案 C：独立项目** ⭐⭐⭐ |
|------|--------------------------|----------------------|------------------------|
| **界面质量** | **最佳**（Web 技术） | 良好（原生组件） | 最佳（Web 技术） |
| **开发成本** | 中等 | 低 | 中等 |
| **改动范围** | 最小化改动 | 最小化改动 | 零改动 |
| **隔离程度** | 逻辑隔离 | 逻辑隔离 | 物理隔离 |
| **打包体积** | 大（80-120MB） | 小（30-40MB） | 大（80-120MB） |
| **维护成本** | 低（统一管理） | 低（统一管理） | 中（两个项目） |
| **代码复用** | IPC 通信 | 直接导入 | 路径导入 |
| **推荐场景** | **高端界面需求** | 标准界面需求 | 实验性开发 |
| **推荐度** | ⭐⭐⭐⭐⭐（高端界面） | ⭐⭐⭐⭐（标准界面） | ⭐⭐⭐（实验原型） |

---

## Electron 方案详细评估

### 🎨 为什么选择 Electron？

#### 优势分析

1. **🎯 界面质量最佳**
   - ✅ 使用现代 Web 技术（HTML/CSS/JavaScript）
   - ✅ 支持所有 CSS3 特效和动画
   - ✅ 与设计稿 1:1 精准还原
   - ✅ 丰富的 UI 库支持（React/Vue + Ant Design/shadcn/ui）

2. **🎨 设计还原度最高**
   - ✅ Warm Greige 主题完美实现
   - ✅ 渐变、阴影、动画流畅自然
   - ✅ 响应式布局成熟方案
   - ✅ 支持暗色模式切换

3. **🛠️ 开发体验优秀**
   - ✅ 热重载（HMR）即时预览
   - ✅ Chrome DevTools 调试
   - ✅ 丰富的生态系统
   - ✅ 前端开发者友好

4. **📦 跨平台一致性**
   - ✅ Windows/macOS/Linux 完全一致
   - ✅ 原生 Webview 渲染
   - ✅ 系统级 API 访问

---

### 🔧 Electron + Python 后端集成方案

#### 架构设计

```
┌─────────────────────────────────────────┐
│      Electron 应用（主进程 + 渲染进程）   │
│  ┌───────────────────────────────────┐  │
│  │   渲染进程（React/Vue + Tailwind） │  │
│  │   - UI 组件、样式、动画            │  │
│  │   - 用户交互、状态管理            │  │
│  └───────────────────────────────────┘  │
│              ↕ IPC 通信                  │
│  ┌───────────────────────────────────┐  │
│  │      主进程（Node.js）            │  │
│  │   - 窗口管理、菜单、托盘          │  │
│  │   - 文件对话框、系统通知          │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              ↕ Python Subprocess
┌─────────────────────────────────────────┐
│      Python 后端进程（独立）             │
│  ┌───────────────────────────────────┐  │
│  │   src/core/（现有业务代码）        │  │
│  │   - Excel 处理、图片匹配          │  │
│  │   - 文件读写、压缩包处理          │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

#### 目录结构

```
ImageAutoInserter/
├── electron-app/              # ← 新增：Electron 应用
│   ├── src/
│   │   ├── main/             # 主进程
│   │   │   ├── main.ts       # 主入口
│   │   │   └── preload.ts    # 预加载脚本
│   │   └── renderer/         # 渲染进程
│   │       ├── components/   # React/Vue 组件
│   │       ├── styles/       # Tailwind CSS
│   │       └── App.tsx
│   ├── package.json
│   └── electron-builder.yml
│
├── src/
│   └── core/                 # 现有业务代码（保护）
│       ├── excel_processor.py
│       └── image_matcher.py
│
├── python-backend/           # ← 新增：Python 后端服务
│   └── server.py             # IPC 通信接口
│
└── main.py                   # 原入口（保留）
```

---

### 💻 实现示例

#### 1. Electron 主进程（main.ts）

```typescript
import { app, BrowserWindow, ipcMain } from 'electron';
import { spawn } from 'child_process';
import path from 'path';

let mainWindow: BrowserWindow | null = null;
let pythonProcess: any = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('src/renderer/index.html');
}

// 启动 Python 后端
function startPythonBackend() {
  const pythonPath = process.platform === 'win32' 
    ? 'python' 
    : 'python3';
  
  pythonProcess = spawn(pythonPath, [
    path.join(__dirname, '../../python-backend/server.py')
  ]);

  pythonProcess.stdout.on('data', (data: Buffer) => {
    console.log(`Python: ${data}`);
  });

  pythonProcess.stderr.on('data', (data: Buffer) => {
    console.error(`Python Error: ${data}`);
  });
}

// IPC 通信：调用 Python 业务逻辑
ipcMain.handle('process-excel', async (event, inputFile, outputFile) => {
  return new Promise((resolve, reject) => {
    pythonProcess.stdin.write(JSON.stringify({
      action: 'process_excel',
      inputFile,
      outputFile,
    }) + '\n');

    pythonProcess.once('message', (result: any) => {
      resolve(result);
    });
  });
});

app.whenReady().then(() => {
  startPythonBackend();
  createWindow();
});
```

---

#### 2. React 组件示例（App.tsx）

```tsx
import React, { useState } from 'react';
import { WindowAPI } from '../preload';

declare global {
  interface Window {
    electronAPI: WindowAPI;
  }
}

export default function App() {
  const [progress, setProgress] = useState(0);

  const handleProcessExcel = async () => {
    const result = await window.electronAPI.processExcel(
      '/path/to/input.xlsx',
      '/path/to/output.xlsx'
    );
    
    setProgress(result.progress);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F5F3] to-[#E8E8E6]">
      {/* 页面头部 */}
      <header className="text-center py-16">
        <h1 className="text-[42px] font-light text-[#3D3D3D] tracking-[3px]">
          方案 1 - Warm Greige
        </h1>
        <p className="text-[16px] text-[#8B8B8B] font-light tracking-[1px]">
          暖灰褐 · 温柔知性 · 高级质感
        </p>
      </header>

      {/* 组件网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto px-8">
        {/* 卡片 1 */}
        <div className="bg-[#F5F5F3] rounded-lg p-8 border border-[#E6E6E3] 
                        hover:bg-[#FAFAF9] hover:border-[#B8A895] 
                        hover:-translate-y-1.5 transition-all duration-300">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br 
                          from-[#B8A895] to-[#C9B5A0] flex items-center 
                          justify-center mb-6">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeWidth="1.5" 
                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            </svg>
          </div>
          <h3 className="text-[18px] font-medium text-[#3D3D3D] mb-3">
            Excel 文件拖拽
          </h3>
          <p className="text-[14px] text-[#8B8B8B] leading-relaxed">
            将 Excel 文件拖拽到此处，系统自动识别商品编码并智能匹配对应图片
          </p>
        </div>

        {/* 其他卡片... */}
      </div>

      {/* 按钮 */}
      <div className="max-w-7xl mx-auto px-8 mt-12 flex gap-3">
        <button
          onClick={handleProcessExcel}
          className="flex-1 bg-[#B8A895] hover:bg-[#9A8B75] 
                     active:bg-[#8B7355] text-white font-medium 
                     px-7 py-3.5 rounded transition-all duration-300
                     hover:-translate-y-0.5 hover:shadow-lg"
        >
          开始处理
        </button>
        <button className="flex-1 bg-transparent border-2 border-[#B8A895] 
                           text-[#B8A895] hover:bg-[#B8A895] hover:text-white
                           font-medium px-7 py-3.5 rounded 
                           transition-all duration-300">
          取消
        </button>
      </div>
    </div>
  );
}
```

---

#### 3. Python 后端服务（server.py）

```python
#!/usr/bin/env python3
"""
Python 后端服务 - 通过 IPC 与 Electron 通信
"""

import sys
import json
from pathlib import Path

# 导入现有业务代码
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))
from core.excel_processor import process_excel
from core.image_matcher import match_images

def process_request(request: dict) -> dict:
    """处理来自 Electron 的请求"""
    action = request.get('action')
    
    if action == 'process_excel':
        input_file = request.get('inputFile')
        output_file = request.get('outputFile')
        
        try:
            # 调用现有业务逻辑
            result = process_excel(input_file, output_file)
            return {
                'success': True,
                'result': result,
                'progress': 100,
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'progress': 0,
            }
    
    return {'success': False, 'error': 'Unknown action'}

if __name__ == '__main__':
    # 通过标准输入/输出与 Electron 通信
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            
            request = json.loads(line.strip())
            result = process_request(request)
            
            # 发送结果回 Electron
            sys.stdout.write(json.dumps(result) + '\n')
            sys.stdout.flush()
            
        except Exception as e:
            sys.stderr.write(str(e) + '\n')
            sys.stderr.flush()
```

---

### 📊 Electron vs PyQt6 详细对比

#### 界面质量对比

| 特性 | Electron | PyQt6 | 说明 |
|------|----------|-------|------|
| **CSS 支持** | ✅ 完整 CSS3 | ⚠️ 有限 QSS | Electron 支持所有 CSS 特性 |
| **动画效果** | ✅ 60fps GPU 加速 | ⚠️ CPU 加速 | Electron 动画更流畅 |
| **渐变效果** | ✅ 完美支持 | ⚠️ 需要手动绘制 | Electron 更自然 |
| **圆角阴影** | ✅ 原生支持 | ⚠️ 需要样式表 | Electron 更精准 |
| **响应式布局** | ✅ Flexbox/Grid | ⚠️ 手动实现 | Electron 更成熟 |
| **字体渲染** | ✅ Web 字体 | ⚠️ 系统字体 | Electron 更灵活 |
| **暗色模式** | ✅ 一键切换 | ⚠️ 需要重绘 | Electron 更简单 |

#### 开发效率对比

| 特性 | Electron | PyQt6 | 说明 |
|------|----------|-------|------|
| **热重载** | ✅ 支持（HMR） | ❌ 不支持 | Electron 开发更快 |
| **调试工具** | ✅ Chrome DevTools | ⚠️ Qt Debugger | Electron 更友好 |
| **组件库** | ✅ 丰富（React/Vue） | ⚠️ 有限 | Electron 选择更多 |
| **学习曲线** | ⚠️ 需前端知识 | ✅ Python 友好 | PyQt6 更简单 |
| **开发速度** | ✅ 快速迭代 | ⚠️ 中等 | Electron 更快 |

#### 性能对比

| 指标 | Electron | PyQt6 | 说明 |
|------|----------|-------|------|
| **启动时间** | ⚠️ 2-3 秒 | ✅ < 1 秒 | PyQt6 更快 |
| **内存占用** | ❌ 150-200MB | ✅ 50-80MB | PyQt6 更轻量 |
| **打包体积** | ❌ 80-120MB | ✅ 30-40MB | PyQt6 更小 |
| **CPU 占用** | ⚠️ 中等 | ✅ 低 | PyQt6 更省资源 |
| **渲染性能** | ✅ 60fps GPU | ⚠️ 30-60fps | Electron 更流畅 |

---

### 🎯 Electron 方案推荐配置

#### 技术栈选择

```json
{
  "framework": "Electron 28.x",
  "renderer": "React 18.x + TypeScript",
  "styling": "Tailwind CSS 3.x",
  "ui-library": "shadcn/ui 或 Ant Design",
  "state-management": "Zustand 或 Redux Toolkit",
  "build-tool": "Vite + electron-builder",
  "python-bridge": "node-pty 或 PythonShell"
}
```

#### 依赖配置

**electron-app/package.json:**
```json
{
  "name": "image-auto-inserter-ui",
  "version": "1.0.0",
  "main": "dist/main/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build && electron-builder",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "@types/react": "^18.2.0"
  }
}
```

---

### 📦 Electron 方案实施步骤

#### 步骤 1：创建 Electron 项目

```bash
# 创建项目目录
mkdir -p electron-app
cd electron-app

# 初始化 npm 项目
npm init -y

# 安装依赖
npm install electron --save-dev
npm install react react-dom
npm install --save-dev vite @vitejs/plugin-react
npm install tailwindcss postcss autoprefixer

# 初始化 Tailwind
npx tailwindcss init -p
```

#### 步骤 2：配置 Tailwind（tailwind.config.js）

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#B8A895',
          light: '#C9B5A0',
          dark: '#9A8B75',
        },
        accent: '#8B7355',
        bg: '#F5F5F3',
        'bg-card': '#FAFAF9',
        text: '#3D3D3D',
        'text-light': '#8B8B8B',
        border: '#E6E6E3',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'PingFang SC', 
               'Microsoft YaHei', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

#### 步骤 3：创建主窗口（main.ts）

```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#F5F5F3',
    titleBarStyle: 'hidden', // macOS 隐藏标题栏
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
}

app.whenReady().then(createWindow);
```

#### 步骤 4：创建 React 组件（App.tsx）

```tsx
import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-bg to-[#E8E8E6]">
      <header className="text-center py-16">
        <h1 className="text-[42px] font-light text-text tracking-[3px]">
          方案 1 - Warm Greige
        </h1>
      </header>
      
      <main className="max-w-7xl mx-auto px-8">
        {/* 组件网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 卡片组件... */}
        </div>
      </main>
    </div>
  );
}
```

#### 步骤 5：启动开发服务器

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 打包应用
npm run build && electron-builder
```

---

### 🔒 Electron 方案隔离保护

#### 改动范围

| 文件/目录 | 改动类型 | 说明 |
|----------|---------|------|
| `electron-app/` | ✅ 新增 | 整个 Electron 应用目录 |
| `python-backend/` | ✅ 新增 | Python IPC 后端 |
| `src/core/` | ❌ 不改动 | 业务逻辑完全保留 |
| `main.py` | ⚠️ 可选 | 可保留命令行模式 |

#### 通信安全

```typescript
// preload.ts - 安全的 IPC 桥接
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  processExcel: (input: string, output: string) => 
    ipcRenderer.invoke('process-excel', input, output),
  
  matchImages: (imagePath: string) =>
    ipcRenderer.invoke('match-images', imagePath),
});
```

---

### ✅ Electron 方案质量保障

#### 代码审查清单

```markdown
## Electron 代码审查清单

### 改动范围检查
- [ ] 所有 Electron 代码在 `electron-app/` 目录
- [ ] `src/core/` 目录无改动
- [ ] Python 后端通过 IPC 通信

### 界面质量检查
- [ ] 与设计稿 1:1 还原
- [ ] 所有 CSS 特效正常工作
- [ ] 动画流畅（60fps）
- [ ] 响应式布局正确

### 性能检查
- [ ] 启动时间 < 3 秒
- [ ] 内存占用 < 200MB
- [ ] 渲染性能 60fps

### 安全检查
- [ ] contextIsolation = true
- [ ] nodeIntegration = false
- [ ] 使用 preload 脚本
- [ ] 无远程代码执行风险
```

---

### 📊 Electron 方案总结

#### 优势 ✅

1. **界面质量最佳** - 完美还原 Warm Greige 设计
2. **开发效率高** - 热重载 + Chrome DevTools
3. **跨平台一致** - Windows/macOS/Linux 完全相同
4. **生态系统丰富** - React/Vue + 海量 UI 库
5. **维护简单** - 前端技术，易招人

#### 劣势 ❌

1. **打包体积大** - 80-120MB（PyQt6 仅 30-40MB）
2. **内存占用高** - 150-200MB（PyQt6 仅 50-80MB）
3. **启动稍慢** - 2-3 秒（PyQt6 仅<1 秒）
4. **需前端知识** - 需学习 React/Vue + TypeScript

#### 推荐场景 🎯

- ✅ **追求高端界面质量**
- ✅ **需要复杂动画效果**
- ✅ **团队有前端开发经验**
- ✅ **跨平台一致性要求高**
- ✅ **接受稍大的打包体积**

---

## 三种实施方案

### 方案对比总览

| 特性 | **方案 A：Electron** | **方案 B：PyQt6** | **方案 C：独立项目** |
|------|-------------------|-----------------|-------------------|
| **界面质量** | ⭐⭐⭐⭐⭐ 最佳 | ⭐⭐⭐⭐ 良好 | ⭐⭐⭐⭐⭐ 最佳 |
| **开发成本** | ⭐⭐⭐⭐ 中等 | ⭐⭐⭐⭐⭐ 低 | ⭐⭐⭐ 中等 |
| **改动范围** | ⭐⭐⭐⭐ 最小化 | ⭐⭐⭐⭐ 最小化 | ⭐⭐⭐⭐⭐ 零改动 |
| **打包体积** | ⭐⭐ 大 | ⭐⭐⭐⭐⭐ 小 | ⭐⭐ 大 |
| **内存占用** | ⭐⭐ 高 | ⭐⭐⭐⭐⭐ 低 | ⭐⭐ 高 |
| **维护成本** | ⭐⭐⭐⭐ 低 | ⭐⭐⭐⭐ 低 | ⭐⭐⭐ 中 |
| **推荐度** | ⭐⭐⭐⭐⭐ 高端界面 | ⭐⭐⭐⭐ 标准界面 | ⭐⭐⭐ 实验原型 |
```

#### 选择指南

**选择 Electron（方案 A）如果：**
- ✅ 您追求**高端界面质量**
- ✅ 您需要**复杂动画和特效**
- ✅ 您接受**80-120MB 打包体积**
- ✅ 您有**前端开发经验**或愿意学习

**选择 PyQt6（方案 B）如果：**
- ✅ 您追求**轻量级应用**
- ✅ 您需要**快速启动和低内存**
- ✅ 您希望**最小学习成本**
- ✅ 您对界面要求**标准即可**

**选择独立项目（方案 C）如果：**
- ✅ 您要求**原项目零改动**
- ✅ 这是**实验性/原型开发**
- ✅ 您需要**完全物理隔离**

**适用场景：**
- ✅ 长期维护的项目
- ✅ 希望统一管理
- ✅ 接受最小化改动

**目录结构：**
```
ImageAutoInserter/
├── src/
│   ├── core/          # 现有代码（保护）
│   └── ui/            # 新增代码（隔离）
└── main.py            # 可选修改
```

**main.py 修改示例：**
```python
# 原有代码保留
from core.processor import process_excel

# 新增：UI 导入（可选）
try:
    from ui.main_window import MainWindow
    HAS_UI = True
except ImportError:
    HAS_UI = False

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--gui', action='store_true', help='启动 GUI')
    args = parser.parse_args()
    
    if args.gui and HAS_UI:
        # 新增：GUI 模式
        from PyQt6.QtWidgets import QApplication
        app = QApplication([])
        window = MainWindow()
        window.show()
        app.exec()
    else:
        # 原有：命令行模式（完全保留）
        process_excel(args.input, args.output)

if __name__ == '__main__':
    main()
```

**优势：**
- 🎯 统一管理，单一代码库
- 📦 依赖管理简单
- 🔄 代码复用方便
- 🛠️ 维护成本低

---

### 方案 B：独立项目隔离（保守）

**适用场景：**
- ✅ 实验性开发
- ✅ 要求零改动
- ✅ 需要完全隔离

**目录结构：**
```
~/projects/
├── ImageAutoInserter/      # 原项目（完全不动）
│   └── src/core/
│
└── ui-app/                 # 独立 UI 项目（新建）
    ├── main.py
    ├── ui/
    ├── requirements.txt
    └── README.md
```

**ui-app/main.py 示例：**
```python
#!/usr/bin/env python3
"""
独立 UI 启动文件
通过路径导入复用现有业务逻辑
"""

import sys
import os

# 添加现有项目路径
CORE_PATH = os.path.join(
    os.path.dirname(__file__), 
    '../ImageAutoInserter/src'
)
sys.path.insert(0, CORE_PATH)

# 导入业务逻辑
from core.processor import process_excel
from core.image_matcher import match_images

# UI 代码
from PyQt6.QtWidgets import QApplication
from ui.main_window import MainWindow

def main():
    app = QApplication([])
    
    # 注入业务逻辑到 UI
    window = MainWindow(
        excel_processor=process_excel,
        image_matcher=match_images
    )
    
    window.show()
    app.exec()

if __name__ == '__main__':
    main()
```

**优势：**
- 🔒 原项目 100% 保留
- 🧪 实验性开发无风险
- 📦 可独立发布 UI
- 🚀 快速原型验证

**劣势：**
- 📚 需要维护两个项目
- 🔗 路径导入较复杂
- 📊 依赖管理重复
- 🛠️ 维护成本较高

---

## 推荐方案选择指南

### 选择方案 A（子目录隔离）如果：

- ✅ 您计划长期维护此项目
- ✅ 您接受最小化改动（1-3 行代码）
- ✅ 您希望统一管理代码
- ✅ 您计划将 UI 作为标准功能

### 选择方案 B（独立项目）如果：

- ✅ 您要求原项目零改动
- ✅ 这是实验性/原型开发
- ✅ 您需要完全物理隔离
- ✅ 您可能放弃 UI 开发

---

## 实施步骤

### 采用方案 A（推荐）

```bash
# 步骤 1：创建功能分支
git checkout -b feature/ui-implementation

# 步骤 2：创建 UI 目录结构
mkdir -p src/ui/{components,layouts,styles}
mkdir -p tests/test_ui

# 步骤 3：开发 UI 组件
# - 在 src/ui/ 中创建组件
# - 在 tests/test_ui/ 中创建测试

# 步骤 4：可选修改 main.py
# - 仅添加 GUI 启动选项

# 步骤 5：添加依赖
echo "PyQt6>=6.6.0" >> requirements.txt

# 步骤 6：提交代码
git add src/ui/ tests/test_ui/ requirements.txt
git commit -m "feat(ui): 添加 GUI 界面支持"

# 步骤 7：运行测试验证
pytest tests/ -v

# 步骤 8：创建 PR 并审查
git push origin feature/ui-implementation
```

---

### 采用方案 B（保守）

```bash
# 步骤 1：创建独立项目目录
mkdir -p ../ui-app/{ui,tests}
cd ../ui-app

# 步骤 2：初始化 Git
git init

# 步骤 3：创建 requirements.txt
cat > requirements.txt << EOF
PyQt6>=6.6.0
Pillow>=10.0.0
EOF

# 步骤 4：开发 UI 代码
# - 在 ui/ 中创建组件
# - 通过路径导入现有业务逻辑

# 步骤 5：创建独立启动文件
cat > main.py << 'EOF'
#!/usr/bin/env python3
import sys
import os

# 导入现有代码
sys.path.insert(0, '../ImageAutoInserter/src')
from core.processor import process_excel

# UI 代码
from PyQt6.QtWidgets import QApplication
from ui.main_window import MainWindow

def main():
    app = QApplication([])
    window = MainWindow(process_excel)
    window.show()
    app.exec()

if __name__ == '__main__':
    main()
EOF

# 步骤 6：测试运行
python main.py

# 步骤 7：提交到独立仓库
git add .
git commit -m "feat: 初始 UI 版本"
```

---

## 质量保障

### 提交前检查清单

```markdown
## 提交前检查

### 改动范围
- [ ] 所有改动在允许的文件/目录
- [ ] 受保护文件无改动
- [ ] 使用 `git diff --stat` 确认改动

### 测试验证
- [ ] 现有测试全部通过
- [ ] 新增测试已编写
- [ ] 测试覆盖率达标

### 代码质量
- [ ] 代码符合规范
- [ ] 注释完整
- [ ] 无硬编码值

### 向后兼容
- [ ] 命令行功能正常
- [ ] 配置文件兼容
- [ ] 依赖版本兼容
```

---

### 回滚方案

如果开发过程中需要回滚：

```bash
# 方案 A：撤销未提交改动
git checkout -- src/ui/
git reset HEAD src/ui/

# 方案 B：删除功能分支
git checkout main
git branch -D feature/ui-implementation

# 方案 C：删除工作树
git worktree remove feature-ui
rm -rf ../feature-ui

# 方案 B 专属：删除独立项目
rm -rf ../ui-app
```

---

## 常见问题

### Q1: 如果我不小心修改了业务代码怎么办？

**A:** Git 会检测到改动，审查时会发现并提醒您撤销：

```bash
# 查看改动
git diff src/core/

# 撤销改动
git checkout -- src/core/
```

---

### Q2: UI 代码能和业务代码一起测试吗？

**A:** 可以且推荐！集成测试确保 UI 与业务逻辑协同工作：

```python
# tests/test_integration.py
def test_ui_with_business_logic():
    """测试 UI 与业务逻辑集成"""
    from ui.main_window import MainWindow
    from core.processor import process_excel
    
    window = MainWindow(process_excel)
    # 测试 UI 调用业务逻辑
    assert window.processor is not None
```

---

### Q3: 如果我只想要 UI，不想要命令行版本呢？

**A:** 可以配置为仅启动 UI：

```python
# main.py
def main():
    # 默认启动 UI
    from PyQt6.QtWidgets import QApplication
    app = QApplication([])
    window = MainWindow()
    window.show()
    app.exec()
```

---

### Q4: 两个方案可以同时存在吗？

**A:** 可以！先用方案 B 原型验证，确认后再迁移到方案 A：

```bash
# 方案 B 验证成功后
# 将 ui-app/ui/ 移动到 ImageAutoInserter/src/ui/
# 调整导入路径
# 完成迁移
```

---

## 总结

### 核心保障

1. 🔒 **业务代码保护** - `src/core/` 严格保护，禁止改动
2. 🛡️ **Git 工作流** - 独立分支开发，审查后合并
3. 🧪 **测试保护** - 现有测试必须全部通过
4. 📋 **审查机制** - 所有改动经过审查
5. 🔄 **回滚能力** - 随时可回滚到开发前状态

### 推荐方案

**方案 A：子目录隔离** ⭐⭐⭐⭐⭐
- 统一管理，维护简单
- 代码复用方便
- 向后兼容性好

**方案 B：独立项目** ⭐⭐⭐
- 完全隔离，零改动
- 适合实验性开发
- 维护成本较高

### 下一步

1. ✅ 选择方案（A 或 B）
2. ⬜ 创建 Git 分支/项目
3. ⬜ 开始开发
4. ⬜ 按检查清单验证
5. ⬜ 提交审查

---

**文档版本：** v1.0  
**创建日期：** 2026-03-06  
**维护者：** AI + 人工

**相关文档：**
- [实施规划](./implementation/implementation-plan.md)
- [质量检查清单](./implementation/quality-control-checklist.md)
- [设计稿](./color-options/scheme-01-warm-greige.html)
