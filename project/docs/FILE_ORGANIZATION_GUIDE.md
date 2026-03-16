# 项目文件整理体系指南

> **版本**: v1.0  
> **更新日期**: 2026-03-12  
> **适用项目**: ImageAutoInserter

---

## 📋 目录

1. [设计原则](#设计原则)
2. [目录结构](#目录结构)
3. [文件分类标准](#文件分类标准)
4. [命名规范](#命名规范)
5. [打包规则](#打包规则)
6. [迁移指南](#迁移指南)

---

## 设计原则

### 1. 物理隔离原则
开发文件与运行时文件**物理分离**，从根本上避免打包污染。

### 2. 单一职责原则
每个目录有明确的单一职责，不混合不同类型的文件。

### 3. 显式优于隐式
通过目录命名清晰表达文件用途，不依赖配置文件来判断。

---

## 目录结构

```
ImageAutoInserter/
│
├── 📁 project/                    # 🚫 开发专用（永远不打包）
│   ├── 📁 docs/                   # 项目文档
│   │   ├── guides/                # 使用指南
│   │   ├── architecture/          # 架构文档
│   │   └── specs/                 # 功能规格
│   ├── 📁 specs/                  # 详细规格说明
│   ├── 📁 designs/                # 设计稿和原型
│   ├── 📁 tests/                  # 测试代码和用例
│   ├── 📁 scripts/                # 开发辅助脚本
│   ├── 📁 configs/                # 开发环境配置
│   └── 📁 samples/                # 示例数据和文件
│
├── 📁 .trae/                      # 🚫 AI 配置（永远不打包）
│   ├── agents/                    # AI Agent 定义
│   ├── rules/                     # 项目规则
│   ├── skills/                    # Skill 定义
│   └── specs/                     # 功能规格
│
├── 📁 .dev/                       # 🚫 开发工具（永远不打包）
│   ├── 📁 tools/                  # 开发工具
│   ├── 📁 logs/                   # 开发日志
│   └── 📁 temp/                   # 临时文件
│
├── 📁 src/                        # ⚠️ 源代码（构建后进入 dist/）
│   ├── 📁 main/                   # Electron 主进程
│   ├── 📁 renderer/               # Electron 渲染进程
│   │   ├── components/            # React 组件
│   │   ├── hooks/                 # 自定义 Hooks
│   │   ├── stores/                # 状态管理
│   │   └── styles/                # 样式文件
│   ├── 📁 shared/                 # 共享代码
│   │   └── types/                 # 类型定义
│   └── 📁 python/                 # Python 后端代码
│       ├── core/                  # 核心逻辑
│       ├── utils/                 # 工具函数
│       └── processors/            # 处理器模块
│
├── 📁 assets/                     # ✅ 静态资源（打包）
│   ├── 📁 fonts/                  # 字体文件
│   ├── 📁 icons/                  # 图标资源
│   └── 📁 images/                 # 图片资源
│
├── 📁 build/                      # ✅ 构建配置（打包）
│   ├── 📁 electron/               # Electron 配置
│   └── 📁 vite/                   # Vite 配置
│
├── 📁 dist/                       # ✅ 构建输出（打包）
│   ├── 📁 main/                   # 主进程构建输出
│   ├── 📁 renderer/               # 渲染进程构建输出
│   ├── 📁 preload/                # 预加载脚本构建输出
│   └── 📁 python/                 # Python 构建输出
│
├── 📁 release/                    # ✅ 发布包（打包输出）
│
├── 📄 package.json                # ✅ 依赖清单（打包）
├── 📄 README.md                   # 项目说明
├── 📄 .gitignore                  # Git 忽略规则
└── 📄 .packignore                 # 打包忽略规则
```

---

## 文件分类标准

### 开发专用文件（project/）

| 子目录 | 用途 | 示例文件 |
|--------|------|----------|
| `docs/` | 项目文档 | `API_GUIDE.md`, `DEPLOYMENT.md` |
| `specs/` | 功能规格 | `FEATURE_X.spec.md` |
| `designs/` | 设计稿 | `ui-mockup.fig`, `wireframe.png` |
| `tests/` | 测试代码 | `*.test.ts`, `*.spec.py` |
| `scripts/` | 开发脚本 | `setup.sh`, `clean.js` |
| `configs/` | 开发配置 | `eslint.config.js` |
| `samples/` | 示例数据 | `sample-data.xlsx` |

### 源代码文件（src/）

| 子目录 | 用途 | 命名规范 |
|--------|------|----------|
| `main/` | Electron 主进程 | `main.ts`, `ipc-handlers.ts` |
| `renderer/` | 渲染进程 | React 组件、Hooks |
| `shared/` | 共享代码 | 类型定义、常量 |
| `python/` | Python 后端 | 模块文件 |

### 静态资源（assets/）

| 子目录 | 用途 | 文件类型 |
|--------|------|----------|
| `fonts/` | 字体文件 | `.ttf`, `.woff`, `.woff2` |
| `icons/` | 图标资源 | `.png`, `.svg`, `.ico` |
| `images/` | 图片资源 | `.png`, `.jpg`, `.gif` |

---

## 命名规范

### 文件命名

| 类型 | 规范 | 示例 |
|------|------|------|
| **React 组件** | PascalCase + `.tsx` | `FileDropZone.tsx` |
| **React Hooks** | camelCase + `use`前缀 + `.ts` | `useFileProcessor.ts` |
| **工具函数** | camelCase + `.ts/.py` | `excelProcessor.ts` |
| **常量/配置** | camelCase 或 UPPER_SNAKE_CASE | `constants.ts` |
| **样式文件** | 同名组件 + `.module.css` | `FileDropZone.module.css` |
| **测试文件** | 被测文件 + `.test.ts` | `FileDropZone.test.tsx` |
| **类型定义** | `types.ts` 或 `.d.ts` | `api.d.ts` |

### 文档命名

| 类型 | 格式 | 示例 |
|------|------|------|
| **对齐文档** | `ALIGNMENT_<功能名>.md` | `ALIGNMENT_Picture变体支持.md` |
| **共识文档** | `CONSENSUS_<功能名>.md` | `CONSENSUS_Picture变体支持.md` |
| **设计文档** | `DESIGN_<功能名>.md` | `DESIGN_GUI重构.md` |
| **任务文档** | `TASK_<功能名>.md` | `TASK_图片处理器优化.md` |
| **计划文档** | `YYYY-MM-DD-<主题>.md` | `2026-03-12-文件整理体系.md` |

---

## 打包规则

### 打包包含（files）

```json
{
  "build": {
    "files": [
      "dist/**/*",           // 构建输出
      "assets/**/*",         // 静态资源
      "package.json"         // 依赖清单
    ]
  }
}
```

### 自动排除（无需配置）

以下目录**永远不会**被打包：

- `project/` - 开发文档和测试
- `.trae/` - AI 配置
- `.dev/` - 开发工具
- `src/` - 源代码（已构建到 dist/）
- `node_modules/` - 开发依赖
- `.git/` - 版本控制
- `release/` - 旧构建输出

### 打包忽略文件（.packignore）

```
# 开发文件
project/
.trae/
.dev/
src/
tests/

# 版本控制
.git/
.gitignore

# 依赖
node_modules/
venv/
__pycache__/

# 日志和临时文件
*.log
logs/
tmp/
temp/

# IDE
.vscode/
.idea/
*.swp

# 操作系统
.DS_Store
Thumbs.db

# 测试输出
*_含图.xlsx
*_processed.xlsx
coverage/
.pytest_cache/

# 构建输出（旧）
build/
release/
```

---

## 迁移指南

### 从旧结构迁移

1. **移动文档**
   ```bash
   # 旧位置 → 新位置
   docs/ → project/docs/
   ```

2. **移动测试**
   ```bash
   # 旧位置 → 新位置
   tests/ → project/tests/
   ```

3. **移动示例数据**
   ```bash
   # 旧位置 → 新位置
   Sample/ → project/samples/
   ```

4. **更新引用路径**
   - 检查所有配置文件中的路径引用
   - 更新脚本中的路径

### 验证打包

```bash
# 1. 构建项目
npm run build

# 2. 检查打包内容
npm run pack -- --dir

# 3. 验证 dist 目录大小
du -sh dist/

# 4. 检查是否包含多余文件
ls -la dist/
```

---

## 最佳实践

### ✅ 应该做的

1. **新文件先分类**
   - 问自己：这是开发文件还是运行时文件？
   - 开发文件 → `project/`
   - 运行时文件 → `assets/` 或 `src/`

2. **定期清理**
   - 删除 `.dev/temp/` 中的临时文件
   - 归档旧的日志文件

3. **版本控制**
   - 开发文件提交到 Git
   - 构建输出（dist/）不提交

### ❌ 不应该做的

1. **不要把开发文件放到 src/**
   - ❌ `src/docs/`
   - ❌ `src/tests/`
   - ✅ `project/docs/`
   - ✅ `project/tests/`

2. **不要把资源文件放到 project/**
   - ❌ `project/assets/`
   - ✅ `assets/`

3. **不要把配置和代码混合**
   - ❌ `src/config/eslint.config.js`
   - ✅ `project/configs/eslint.config.js`

---

## 附录

### 目录权限矩阵

| 目录 | 开发时 | 打包时 | Git |
|------|--------|--------|-----|
| `project/` | ✅ 读写 | 🚫 排除 | ✅ 提交 |
| `.trae/` | ✅ 读写 | 🚫 排除 | ✅ 提交 |
| `.dev/` | ✅ 读写 | 🚫 排除 | 🚫 忽略 |
| `src/` | ✅ 读写 | 🚫 排除 | ✅ 提交 |
| `assets/` | ✅ 读写 | ✅ 包含 | ✅ 提交 |
| `dist/` | ⚠️ 只读 | ✅ 包含 | 🚫 忽略 |
| `release/` | ⚠️ 只读 | N/A | 🚫 忽略 |

### 快速参考

```bash
# 创建新组件
mkdir -p src/renderer/components/ComponentName
touch src/renderer/components/ComponentName/{index.tsx,styles.module.css,index.test.tsx}

# 创建新文档
mkdir -p project/docs/guides
touch project/docs/guides/FEATURE_GUIDE.md

# 创建新测试
touch project/tests/unit/feature.test.ts
```

---

**维护者**: ImageAutoInserter Team  
**最后更新**: 2026-03-12
