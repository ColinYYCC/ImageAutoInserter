# ALIGNMENT_GUI开发

**创建日期**: 2026-03-14  
**状态**: 🔄 A1 - 需求对齐阶段  
**目标**: 完成 ImageAutoInserter GUI 的测试与发布

---

## 1. 项目上下文分析

### 1.1 当前项目状态

| 组件 | 状态 | 说明 |
|------|------|------|
| Electron 主进程 | ✅ 已完成 | `src/main/main.ts`, `ipc-handlers.ts`, `preload.ts` |
| React 渲染进程 | ✅ 已完成 | `App.tsx`, `FilePicker.tsx`, `ProcessingPage.tsx` 等 |
| Python 后端 | ✅ 已完成 | `process_engine.py`, `excel_processor.py`, `picture_variant.py` |
| 状态管理 | ✅ 已完成 | `useAppState.tsx`, `useProcessor.ts` |
| 视觉样式 | ✅ 已完成 | CSS Modules, 变量系统, 动画效果 |
| 进度条平滑过渡 | ✅ 已完成 | 2026-03-13 完成 |
| 单元测试 | ⚠️ 部分完成 | `ProgressBar.test.tsx` 存在，但覆盖不全 |
| 集成测试 | ⚠️ 部分完成 | Python 测试完整，前端测试缺失 |
| E2E 测试 | ❌ 未开始 | 需要实现 |
| 打包发布 | ❌ 未开始 | 需要配置 electron-builder |

### 1.2 技术栈确认

```yaml
桌面框架: Electron 27.x
UI 框架: React 18.x
语言: TypeScript 5.x
构建工具: Vite 5.x
样式方案: CSS Modules
状态管理: useReducer (自定义 Hook)
测试框架: Vitest + React Testing Library
打包工具: electron-builder (待配置)
```

### 1.3 现有文件结构

```
src/
├── main/                    # Electron 主进程
│   ├── main.ts             # 主进程入口
│   ├── main.minimal.ts     # 最小化主进程（备用）
│   ├── preload.ts          # Preload 脚本
│   ├── ipc-handlers.ts     # IPC 处理器
│   └── utils/
│       └── permissions.ts  # 权限管理
├── renderer/               # React 渲染进程
│   ├── App.tsx             # 根组件
│   ├── App.module.css      # 根样式
│   ├── main.tsx            # 渲染进程入口
│   ├── index.html          # HTML 模板
│   ├── test.html           # 测试页面
│   ├── components/         # 组件目录
│   │   ├── FilePicker.tsx
│   │   ├── FilePicker.module.css
│   │   ├── ProcessingPage.tsx
│   │   ├── ProcessingPage.module.css
│   │   ├── ProgressBar.tsx
│   │   ├── ProgressBar.module.css
│   │   ├── ResultView.tsx
│   │   ├── ResultView.module.css
│   │   ├── ErrorDialog.tsx
│   │   ├── ErrorDialog.module.css
│   │   ├── WelcomeGuide.tsx
│   │   ├── WelcomeGuide.module.css
│   │   ├── Icons.tsx
│   │   └── shared/styles/  # 共享样式
│   │       ├── base.css
│   │       ├── variables.css
│   │       └── fonts.css
│   └── hooks/              # 自定义 Hooks
│       ├── useAppState.tsx
│       ├── useProcessor.ts
│       ├── useFilePicker.ts
│       └── useTheme.ts
├── shared/                 # 共享类型
│   ├── types.ts            # TypeScript 类型定义
│   ├── types.d.ts
│   └── types.js
├── core/                   # Python 核心逻辑
│   ├── excel_processor.py
│   ├── process_engine.py
│   ├── image_processor.py
│   └── picture_variant.py
├── python/                 # Python 脚本
│   ├── processor.py
│   └── gui_processor.py
└── utils/                  # 工具函数
    ├── path_manager.py
    ├── text_formatter.py
    ├── font_manager.py
    └── config.py

tests/                      # 测试目录
├── setup.ts               # 测试配置
├── ProgressBar.test.tsx   # 前端单元测试
├── test_excel_processor.py
├── test_picture_variant.py
├── test_image_processor.py
├── test_integration.py
├── test_e2e.py
├── test_organizer.py
├── test_indexer.py
├── test_classifier.py
├── test_excel_format.py
└── test_highlight_integration.py
```

---

## 2. 需求边界定义

### 2.1 包含的工作范围

#### 阶段 A5: Automate - TDD 执行（当前阶段）

**前端单元测试**
- [ ] FilePicker 组件测试
- [ ] ProcessingPage 组件测试
- [ ] useAppState Hook 测试
- [ ] useProcessor Hook 测试
- [ ] ErrorDialog 组件测试
- [ ] ResultView 组件测试

**集成测试**
- [ ] 前端-Python 通信测试
- [ ] 文件选择流程测试
- [ ] 处理流程端到端测试

**E2E 测试**
- [ ] 完整用户流程测试
- [ ] 错误场景测试
- [ ] 边界情况测试

#### 阶段 A6: Assess - 质量验收

**打包配置**
- [ ] electron-builder 配置
- [ ] macOS 签名配置
- [ ] Windows 安装程序配置
- [ ] 自动更新配置（可选）

**发布准备**
- [ ] 版本号管理
- [ ] 发布说明编写
- [ ] 安装包测试

### 2.2 明确排除的范围

根据 GUI 设计规格说明书 (v3.0 Final)，以下功能**不实现**：

| 功能 | 排除原因 |
|------|----------|
| 文件拖拽 | 规格明确排除 |
| 右键菜单 | 规格明确排除 |
| 键盘快捷键 | 规格明确排除 |
| 系统通知 | 规格明确排除 |
| 最近文档列表 | 规格明确排除 |
| 多窗口/多标签页 | 规格明确排除 |
| 批量文件处理 | 规格明确排除 |
| 辅助功能（ARIA等） | 规格明确排除 |

### 2.3 技术约束

**必须遵守的规则**（来自 .self-improving/memory.md）：

1. **Electron 开发规则**
   - 修改主进程代码后必须运行 `npm run build:main`
   - 修改 preload 脚本后必须运行 `npm run build:preload`
   - 修改后必须重启 Electron 应用才能生效

2. **Promise 处理规则**
   - 使用标志位防止 resolve 多次调用
   - 异步操作必须添加超时保护

3. **CSS 溢出处理规则**
   - 错误提示容器必须使用 `overflow: visible`
   - 多层容器嵌套时，确保最外层允许溢出

---

## 3. 验收标准

### 3.1 测试覆盖率要求

| 类型 | 目标覆盖率 | 最低覆盖率 |
|------|------------|------------|
| 单元测试 | > 80% | > 60% |
| 集成测试 | > 70% | > 50% |
| E2E 测试 | 核心流程 100% | 核心流程 100% |

### 3.2 功能验收标准

- [ ] 所有单元测试通过
- [ ] 所有集成测试通过
- [ ] 所有 E2E 测试通过
- [ ] TypeScript 类型检查通过
- [ ] ESLint 检查通过
- [ ] 应用可以正常启动
- [ ] 文件选择功能正常
- [ ] 处理流程完整可用
- [ ] 进度显示平滑自然
- [ ] 错误处理完善

### 3.3 打包验收标准

- [ ] macOS 安装包可以正常构建
- [ ] Windows 安装包可以正常构建
- [ ] 安装包可以正常安装
- [ ] 安装后的应用可以正常启动
- [ ] 核心功能在打包后仍然正常

---

## 4. 关键假设与依赖

### 4.1 假设

1. 现有的 Python 核心代码无需修改
2. Electron 27.x 版本稳定可用
3. 测试环境已配置好 Node.js 和 Python

### 4.2 依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| vitest | ^1.1.0 | 测试框架 |
| @testing-library/react | ^14.1.2 | React 测试工具 |
| @testing-library/jest-dom | ^6.1.5 | DOM 断言 |
| jsdom | ^23.0.1 | 浏览器环境模拟 |
| electron-builder | 待安装 | 打包工具 |

---

## 5. 风险识别

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| Electron 打包配置复杂 | 中 | 中 | 参考官方文档，逐步配置 |
| 测试覆盖率不达标 | 中 | 中 | 优先测试核心功能 |
| macOS 签名问题 | 中 | 高 | 使用 ad-hoc 签名测试 |
| Python 路径问题 | 高 | 高 | 使用 extraResources 配置 |

---

## 6. 下一步行动

完成本对齐文档后，将进入 **A2: Architect（架构设计）** 阶段：

1. 创建 `DESIGN_GUI开发.md` - 测试架构设计
2. 创建 `TASK_GUI开发.md` - 详细任务拆分
3. 进入 A4: Approve - 人工审查确认
4. 进入 A5: Automate - TDD 执行实现

---

**文档状态**: 草稿  
**最后更新**: 2026-03-14  
**待确认事项**: 无
