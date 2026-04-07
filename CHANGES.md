# 变更记录

> 记录日期: 2026-03-30 至 2026-04-06
> 当前版本: 1.1.1

---

## [未发布]

---

### 🐛 Bug 修复

#### 1. 卸载残留物清理

**类型**: fix

**问题描述**: NSIS 卸载脚本只终止了进程，没有清理用户数据目录、注册表残留和临时文件。卸载后会有以下残留：
- `%APPDATA%\ImageAutoInserter` 用户数据
- `%LOCALAPPDATA%\ImageAutoInserter` 本地数据
- 注册表项 `HKCU\Software\ImageAutoInserter`
- Windows 卸载程序注册表项
- 临时目录中的 Python 临时文件

**解决方案**: 
- 在 `customUnInstall` 宏中添加用户数据目录清理（AppData Roaming/Local）
- 添加注册表残留清理（Software、Uninstall、Classes 注册表项）
- 添加临时目录 Python 临时文件清理
- 添加安装目录删除逻辑

**修改文件**:
- `build/installer.nsh`
- `build/pkg-scripts/postrm` (新增)
- `package.json` (添加 Mac 卸载脚本配置)

### 📝 文档更新

#### 1. spec.md 更新

**类型**: docs

**问题描述**: 项目规格说明书版本落后于实际项目版本（1.0.7 vs 1.1.1），缺少新功能说明和技术栈版本更新。

**解决方案**: 
- 更新版本号从 1.0.7 到 1.1.1
- 更新文档日期到 2026-04-06
- 更新核心功能表格：
  - 进度显示从 9 阶段改为 7 阶段
  - 添加 Mac 安全书签机制
  - 添加集中式日志管理
- 更新技术栈版本：
  - Electron: 27.0.0 → 41.1.0
  - Zustand: 4.5.0 → 5.0.12
  - 压缩处理: unrar-promise → node-unrar-js
- 更新项目结构：
  - 添加 `src/main/utils/security-bookmark.ts`
  - 添加 `src/main/logging/` 目录
  - 添加 `src/main/handlers/log-handlers.ts`
  - 添加 `src/renderer/components/LogViewer.tsx`
- 更新进度阶段定义（从 9 阶段改为 7 阶段）
- 更新版本历史（添加 v1.1.1 和 v1.1.0）
- 更新文档历史（添加新的文档版本记录）

**修改文件**:
- `spec/spec.md`

#### 2. README.md 更新

**类型**: docs

**问题描述**: README.md 缺少集中式日志管理系统的说明，项目结构未包含日志管理系统相关文件。

**解决方案**: 
- 添加集中式日志管理系统到功能特点
- 更新项目结构，添加日志管理系统相关文件：
  - `src/main/handlers/log-handlers.ts`
  - `src/main/logging/` 目录
  - `src/renderer/components/LogViewer.tsx`

**修改文件**:
- `README.md`

### 🧪 测试优化

#### 1. E2E 测试修复

**问题描述**: Playwright E2E 测试全部失败（13 failed），原因是：
1. mock-electron-api.ts 未被注入到页面中
2. 测试选择器与实际页面结构不匹配
3. 测试使用 `filechooser` 事件，但 Electron 应用不会触发浏览器原生的文件选择器

**解决方案**: 
- 修改 `vite.e2e.config.ts` 添加 `injectMockElectronAPI` 插件
- 修改 `AppPage.ts` 选择器使用正确的页面文本（"选择图片来源" 而非 "图片来源路径"）
- 修改测试用例，使用 `page.evaluate` 直接调用 mock API 而非依赖 `filechooser` 事件

**修复文件**:
- `vite.e2e.config.ts` - 添加 mock 脚本注入插件
- `tests/e2e/page-objects/AppPage.ts` - 修复选择器
- `tests/e2e/error-handling.spec.ts` - 重写测试用例

**验证结果**: 测试结果从 13 failed 变为 15 passed, 1 skipped

#### 2. 单元测试覆盖率提升

**问题描述**: 核心模块单元测试覆盖率低于 80% 目标。

**解决方案**: 
- 为 log-collector.ts 添加测试，覆盖率从 47.95% 提升到 90.05%
- 为 log-store.ts 添加测试，覆盖率从 31.65% 提升到 70.5%
- 为 log-system.ts 添加测试，覆盖率从 64.02% 提升到 72.56%
- 为 path-config.ts 添加测试，覆盖率从 59.88% 提升到 79.94%
- 为 python-bridge.ts 添加测试，覆盖率从 72.34% 提升到 76.73%

**修改文件**:
- `tests/unit/logging/log-collector.test.ts`
- `tests/unit/logging/log-store.test.ts`
- `tests/unit/logging/log-system.test.ts`
- `tests/unit/path-config.test.ts`
- `tests/unit/python-bridge.test.ts`

**验证结果**: src/main 分支覆盖率从 66.18% 提升到 76.74%

---

## [1.1.1] - 2026-04-06

### 🔒 安全修复

#### 1. 修复 npm 安全漏洞

**问题描述**: 项目依赖存在多个安全漏洞，包括高危漏洞（xlsx、lodash、@xmldom/xmldom）和中危漏洞（electron、vitest、vite、esbuild）。

**解决方案**: 
- 升级 xlsx 到 0.20.3（从 SheetJS CDN 安装），修复 Prototype Pollution 和 ReDoS 漏洞
- 升级 electron 到 41.1.0，修复 Use-after-free 漏洞
- 通过 npm audit fix 修复 lodash 和 @xmldom/xmldom 漏洞

**修复文件**:
- `package.json` - 更新依赖版本

**验证结果**: npm audit 漏洞从 10 个减少到 6 个（剩余 6 个中危漏洞仅影响开发服务器）

---

### 🧹 代码质量改进

#### 1. 添加 ESLint 和 Prettier 配置

**问题描述**: 项目缺少代码质量检查工具配置，无法保证代码风格一致性。

**解决方案**: 
- 添加 `.eslintrc.json` 配置文件
- 添加 `.prettierrc` 配置文件
- 安装相关依赖：eslint, prettier, eslint-config-prettier, eslint-plugin-react, eslint-plugin-react-hooks, @typescript-eslint/eslint-plugin, @typescript-eslint/parser
- 添加 npm scripts：`lint`, `lint:fix`, `format`, `format:check`

**新增文件**:
- `.eslintrc.json` - ESLint 配置
- `.prettierrc` - Prettier 配置

**修改文件**:
- `package.json` - 添加 npm scripts 和 devDependencies

---

#### 2. 设置测试覆盖率阈值

**问题描述**: 项目缺少测试覆盖率阈值要求，无法保证测试质量。

**解决方案**: 在 vitest.config.ts 中设置覆盖率阈值为 80%（lines、functions、branches、statements）。

**修改文件**:
- `vitest.config.ts` - 添加覆盖率阈值配置

---

#### 3. 修复代码质量问题

**问题描述**: CODE_ISSUES.md 中记录了多个代码质量问题，包括静默吞掉错误、使用 print 代替日志等。

**解决方案**: 
- 修复 `progress_emitter.py` 中的 print 语句，改用 logger
- 验证其他问题已修复或不存在

**修改文件**:
- `src/core/progress_emitter.py` - 添加 logging 导入，将 print 改为 logger.error

---

### 📚 文档完善

#### 1. 添加开源项目文档

**问题描述**: 项目缺少开源项目常见文档，不利于社区贡献。

**解决方案**: 
- 添加 `CONTRIBUTING.md` - 贡献指南
- 添加 `CODE_OF_CONDUCT.md` - 行为准则
- 添加 `LICENSE` - ISC 开源许可证

**新增文件**:
- `CONTRIBUTING.md` - 贡献指南（包含开发环境设置、提交规范、PR 流程）
- `CODE_OF_CONDUCT.md` - 行为准则（基于 Contributor Covenant）
- `LICENSE` - ISC 开源许可证

---

### 📝 技术债务记录

#### 1. process-handlers.ts 函数过长

**问题描述**: `start-process` 处理器函数约 240 行，嵌套深度达 6-7 层，超出规范要求（≤50 行，≤4 层嵌套）。

**解决方案**: 暂不重构，记录为技术债务。该函数包含复杂的异步逻辑和错误处理，重构风险较高。

**建议**: 在未来版本中考虑拆分为多个辅助函数。

---

### 🧹 代码清理

#### 1. 死代码清理

**问题描述**: 项目中存在未使用的代码，包括导入、常量、函数和类型定义，影响代码可维护性。

**解决方案**: 系统性检查并移除所有死代码。

**修复文件**:
- `src/renderer/main.tsx` - 移除未使用的导入 `useEffect`, `useState`, `LogLevel`
- `src/renderer/components/DebugPanel.tsx` - 移除未使用的常量 `LEVEL_NAMES`，修复类型错误
- `src/core/pipeline/orchestrator.py` - 移除未使用的导入 `Set`，移除未使用的方法 `_release_used_image_memory`
- `src/utils/config.py` - 移除未使用的函数 `get_config`
- `src/shared/types.ts` - 移除未使用的类型定义 `AppState`, `AppAction`, `IPCMessage`

**验证结果**: TypeScript 类型检查通过

---

### 🧪 测试优化

#### 1. AdaptiveFileProcessor 单元测试

**问题描述**: 核心文件处理器 `AdaptiveFileProcessor.ts` 缺少单元测试，测试覆盖率为 0%。

**解决方案**: 编写完整的单元测试套件，覆盖所有核心功能和边界场景。

**新增文件**:
- `tests/unit/framework/adaptive-file-processor.test.ts` - 单元测试文件

**测试覆盖**:
- 文件大小分类（small/medium/large/huge/extreme）
- Excel 文件结构验证（工作表、空文件、表头查找）
- 取消操作（AbortSignal 支持）
- 进度回调（进度百分比和阶段）
- 错误处理（文件不存在、解析失败）
- 文件大小检查（默认限制和自定义限制）

**测试结果**:
| 指标 | 数值 |
|------|------|
| 测试用例数 | 29 |
| 通过率 | 100% |
| 语句覆盖率 | **98.43%** |
| 分支覆盖率 | **88.23%** |
| 函数覆盖率 | **100%** |
| 行覆盖率 | **98.43%** |

---

### 🆕 新功能

#### 1. Mac 安全书签机制

**问题描述**: macOS 上每次选择文件都需要用户授权，体验不佳。

**解决方案**: 实现安全书签机制，用户首次选择文件时授权，之后自动保存权限到本地存储，下次启动时自动恢复。

**新增文件**:
- `src/main/utils/security-bookmark.ts` - 安全书签管理器

**核心功能**:
- `SecurityBookmarkManager` - 单例模式管理书签
- `requestFolderAccess()` - 请求文件夹访问权限
- `restoreAllBookmarks()` - 应用启动时恢复所有书签
- 使用 `electron-store` 持久化存储书签

**修改文件**:
- `src/main/main.ts` - 启动时恢复书签，退出时停止访问
- `src/main/handlers/file-handlers.ts` - 文件选择对话框启用安全书签
- `src/main/utils/permissions.ts` - 权限检查使用安全书签

---

### 🐛 Bug 修复

#### 1. 进度显示跳转问题

**问题描述**: 处理页面进度在"处理数据"和"解析Excel"之间来回跳转，百分比和进度条动画也跟着跳动。

**根本原因**: 
- 后端采用分批预加载策略，每批预加载时报告 15%-25% 范围的进度
- 处理数据时报告 25%-70% 范围的进度
- 导致进度值在两个阶段之间来回跳转

**解决方案**:
1. 移除预加载的独立进度报告，确保进度值单调递增
2. 调整前端阶段定义，将"处理数据"阶段扩展到 25%-92%

**修复文件**:
- `src/core/pipeline/orchestrator.py` - 移除预加载进度回调
- `src/renderer/components/ProcessingPage.tsx` - 调整阶段定义

#### 2. Mac 权限配置修复

**问题描述**: `entitlements.mac.plist` 中硬编码了 `/Users/shimengyu/...` 路径，在其他用户电脑上无效。

**解决方案**: 移除 `temporary-exception.files.absolute-path.read-write` 配置，改用安全书签机制。

**修复文件**:
- `build/entitlements.mac.plist` - 移除硬编码路径

#### 2. Windows UAC 弹窗修复

**问题描述**: `package.json` 中配置了 `requestedExecutionLevel: requireAdministrator`，导致每次运行都弹出 UAC 提示。

**解决方案**: 移除此配置，改为在安装程序中请求管理员权限（一次性）。

**修复文件**:
- `package.json` - 移除 `requireAdministrator`，添加 `allowElevation: true`

---

## [1.1.0] - 2026-04-05

### 🆕 新功能

#### 1. 集中式日志管理系统

**问题描述**: 原系统日志分散存储在不同位置，难以统一管理和分析问题。

**解决方案**: 实现集中式日志管理系统，统一日志收集、存储、查询和分析。

**新增文件**:
- `src/main/logging/` - 日志系统核心模块
- `src/main/handlers/log-handlers.ts` - IPC 处理器
- `src/renderer/components/LogViewer.tsx` - UI 组件

**核心功能**:
- LogCollector: 统一收集日志，支持缓冲和批量刷新
- LogStore: 持久化存储到 `{userData}/logs/` 目录
- LogQuery: 支持按时间、级别、模块、来源等多维度筛选
- LogAnalyzer: 错误趋势分析、异常检测、Top 错误统计

#### 2. 并行图片加载 + 智能线程调度

**问题描述**: 原实现中图片读取是串行的，IO 等待时间长，处理大量图片时速度慢。

**解决方案**: 实现并行图片预加载 + 智能线程数调度。

**新增文件**:
- `src/core/utils/system_info.py` - 系统信息检测

**性能提升**:
| 系统配置 | 线程数 | 1000商品处理时间 | 提升 |
|----------|--------|-----------------|------|
| 8核+SSD+16GB | 16 | ~6.8 秒 | **14.8x** |
| 4核+HDD+8GB | 4 | ~25 秒 | **4x** |

---

### 🐛 Bug 修复

#### 1. 模块导入错误修复

**问题描述**: 程序启动时报错 `ModuleNotFoundError: No module named 'core.utils.image_cache'`，导致无法正常启动。

**根本原因**: `image_matcher.py` 中的导入路径错误，尝试从 `..utils.image_cache` 导入，但实际文件位于 `..cache.image_cache`。同时缺少全局缓存实例，且方法名不匹配（使用 `put()` 而非 `set()`）。

**解决方案**:
1. 修正导入路径：`from ..cache.image_cache import ImageValidationCache`
2. 创建全局缓存实例函数 `get_global_cache()`（单例模式）
3. 修正方法调用：`cache.put()` 改为 `cache.set()`

**修复文件**:
- `src/core/matchers/image_matcher.py` - 修正导入路径、添加全局缓存实例、修正方法调用

#### 2. RAR 文件验证失败问题

**问题描述**: 验证 RAR 文件时报错 `Cannot find package 'console-wrapper' imported from .../unrar-promise/lib/unrar.mjs`。

**根本原因**: `unrar-promise` 是纯 ESM 模块，其依赖 `console-wrapper` 是 CommonJS 格式，在 asar 打包后 ESM 解析 CommonJS 依赖失败。

**解决方案**:
1. 使用 `node-unrar-js` 替代 `unrar-promise`，避免 ESM 兼容性问题
2. 移除 `unrar-promise` 及其 hoisted 依赖（`console-wrapper`、`@honeo/check`、`sanitize-filename`）
3. 更新 `file-handlers.ts` 使用 `node-unrar-js` 的 `createExtractorFromData` API

**修复文件**:
- `src/main/handlers/file-handlers.ts` - RAR 验证逻辑改用 node-unrar-js
- `package.json` - 移除 unrar-promise 依赖
- `scripts/build.js` - 移除相关复制逻辑
- `electron.vite.config.ts` / `vite.main.config.ts` - 移除 external 配置

#### 3. 内存泄漏修复 - BufferAccumulator

**问题描述**: `BufferAccumulator.append()` 方法中 `maxSize` 未生效，缓冲区可能无限增长。

**修复文件**: `src/main/python-bridge.ts`

**修复内容**: 超过限制时截断缓冲区，防止无限增长。

#### 4. React 响应式系统修复

**问题描述**: App.tsx 中使用 `useAppStore.getState()` 绕过 React 响应式系统。

**修复文件**: `src/renderer/App.tsx`

**修复内容**: 使用 React hooks 替代直接调用 `getState()`。

---

### 🔄 架构优化

#### Excel 文件验证库迁移

**问题描述**: 使用 ExcelJS 验证包含图表的 Excel 文件时会崩溃。

**根本原因**: ExcelJS 在处理包含图表的 Excel 文件时存在已知 bug。

**解决方案**: 使用 xlsx (SheetJS) 替代 ExcelJS，只解析数据不处理图表，性能更好。

#### 进程终止逻辑重构

**问题描述**: `killProcess` 函数与 `PythonBridge.killCurrentProcess` 重复，且 Unix 平台 PID kill 不工作。

**解决方案**:
- 提取私有方法复用逻辑
- 修复 macOS/Linux 上 `process.kill(pid)` 支持
- 修复 Windows 上重复 kill 问题

---

### 🔧 改进

#### 1. 环境变量支持

- Vite 端口配置：`VITE_PORT`、`VITE_STRICT_PORT`
- 日志配置：`LOG_LEVEL`、`LOG_ENABLE_FILE`、`LOG_ENABLE_CONSOLE`
- 应用元数据：`APP_NAME`、`APP_ID`、`APP_DESCRIPTION`
- 性能监控：`PERFORMANCE_ENABLED`、`PERFORMANCE_SAMPLE_INTERVAL_MS`

#### 2. 路径验证模块统一

**新增函数**: `src/main/utils/path-validator.ts`
- `validateNoTraversal()` - 检查路径遍历
- `validateAbsolute()` - 验证绝对路径
- `validateTempPathSafety()` - 临时路径安全检查

#### 3. 进度更新优化

**问题描述**: 进度更新在 Python 端和 TypeScript 端都被节流，造成延迟。

**解决方案**: 移除 TypeScript 端的 `ProgressThrottler` 类，保留 Python 端节流。

#### 4. 临时文件清理异步化

**问题描述**: `cleanupAllTemp()` 使用同步删除可能阻塞主线程。

**解决方案**: 改用 `Promise.allSettled()` 异步删除。

---

### 🔒 跨平台兼容

#### 跨平台架构验证

**检查范围**: 双层平台抽象架构、路径处理、环境变量、测试覆盖、打包配置

**检查结果**: ✅ 架构设计稳健，打包时两个平台均无问题

**核心发现**:
1. 双层架构设计正确
2. 路径处理完全跨平台
3. 环境变量分隔符正确处理
4. 测试覆盖完善（43 个测试通过）
5. 打包配置正确

#### macOS 进程终止支持

**问题描述**: `_killProcessByPid` 在 macOS/Linux 上未实现。

**解决方案**: 添加 Unix 信号支持（SIGTERM/SIGKILL）。

---

### 🧹 代码清理

#### 未使用组件清理

**移除文件**:
- React 组件 (5个): WelcomeGuide、UserGuide、ProgressBar 等
- React Hooks (3个): useGuide、useFilePicker、useTheme
- TypeScript 模块 (2个): window-config、temp-report-manager
- Python 模块 (4个): report_storage、report_cleanup、font_manager、temp_manager
- 孤立脚本 (3个): test-process-cleanup 脚本和文档

**验证结果**: TypeScript 类型检查通过，单元测试全部通过 (45/45)

---

### 🧪 测试优化

#### 单元测试 mock 配置修复

**问题描述**: 单元测试有 18 个失败，原因是 mock 配置不正确。

**根本原因**:
1. `vi.hoisted()` 不能在 `vi.mock()` 内部调用
2. 重复的 mock 定义导致冲突

**修复结果**:
| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| 测试文件通过 | 1/2 | **2/2** |
| 测试用例通过 | 27/45 | **45/45** |
| 通过率 | 60% | **100%** |

---

### 📦 新增模块

- `src/main/logging/` - 集中式日志管理系统核心模块
- `src/core/reporters/report_models.py` - 报告数据模型
- `src/core/reporters/report_storage.py` - 报告持久化存储
- `src/core/reporters/report_cleanup.py` - 报告清理管理
- `src/main/handlers/log-handlers.ts` - 日志 IPC 处理器
- `src/renderer/components/LogViewer.tsx` - 日志查看器 UI 组件
- `src/core/utils/system_info.py` - 系统信息检测

---

## [1.0.6] - 2026-04-02

### 🐛 Bug 修复

#### 1. 图片内存释放逻辑错误修复

**问题描述**: 处理重复商品编码时，只有前几次能匹配到图片，后续出现全部失败。

**根本原因**: `_release_used_image_memory()` 在 idx=500 时释放了"当前行"的图片，而不是"已处理完"的图片。

**解决方案**: 预处理所有商品的最后出现位置，只在最后出现时才释放图片内存。

**修复效果**:
| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| success | 765 | **776** |
| failed | 16 | **5** |
| 成功率 | 97.95% | **99.36%** |

#### 2. Dev 版白屏问题

**问题描述**: 开发版打开后没有画面（白屏），但生产版正常。

**根本原因**: `dev:vite-only` 脚本没有指定配置文件，导致 Vite 使用默认配置。

**解决方案**: 在 `dev:vite-only` 脚本中添加 `--config vite.renderer.config.ts` 参数。

#### 3. 安装版白屏问题

**问题描述**: 开发版正常，但安装版打开后没有任何画面。

**根本原因**: `vite.renderer.config.ts` 中 `root` 和 `input` 路径配置不一致。

**解决方案**: 修正路径配置，使用绝对路径确保一致性。

#### 4. FolderImageLoader 不递归扫描子目录

**问题描述**: RAR 文件中的图片位于子目录中，导致加载图片数为 0。

**根本原因**: `folder.iterdir()` 只扫描当前目录，不会递归进入子目录。

**解决方案**: 将 `folder.iterdir()` 改为 `folder.rglob('*')` 实现递归扫描。

**修复效果**:
| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| 加载图片数 | 0 | 1762 |
| 匹配率 | 0% | 99.6% |

---

### 🆕 新功能

#### 1. 图片延迟加载 + LRU 缓存系统

**问题描述**: 处理大量图片时，内存占用过高可能导致程序崩溃。

**解决方案**: 实现延迟加载 + LRU 缓存机制，在保证性能的同时控制内存使用。

**新增文件**: `src/core/utils/image_cache.py`

**性能对比**:
| 指标 | 改动前 | 改动后 |
|------|--------|--------|
| 处理时间 | 11.64 秒 | **6.24 秒** |
| 初始内存 | ~88MB | **~1MB** |

#### 2. 图片嵌入效果优化

**问题描述**: 图片被固定缩放到 180×138 像素，双击查看时只能看到缩小后的小图。

**解决方案**: 改用 TwoCellAnchor + editAs='oneCell' 实现图片随单元格调整大小，同时保留原图数据。

#### 3. 动态磁盘检测系统

**问题描述**: `open-file` 功能只允许访问固定目录，用户无法打开其他磁盘分区的文件。

**解决方案**: 实现动态磁盘检测系统，自动识别所有可用存储设备。

**支持场景**:
- Windows: C盘到Z盘任意分区、网络驱动器、USB设备
- macOS: 系统卷、外部磁盘、USB设备、网络共享
- Linux: 本地磁盘、外部挂载点、可移动设备

#### 4. 热更新功能增强

**新增功能**:
- 添加重试机制和熔断器，提升网络不稳定时的更新成功率
- 添加用户工作状态保存机制，更新前自动保存避免数据丢失
- 添加后台定期检查（每24小时），确保用户不会错过重要更新

---

### 🔧 改进

#### 渲染性能优化 - NotoSansSC 子集字体

**问题描述**: 应用启动时渲染进程加载超时，原因是 NotoSansSC 中文字体文件达17MB。

**解决方案**: 使用 fonttools 生成仅包含285个UI字符的子集字体。

**字体大小对比**:
| 字体 | 优化前 | 优化后 | 减少 |
|------|--------|--------|------|
| NotoSansSC | 17MB | 117KB | 99.3% |

---

## 🔴 BLOCKER 修复（4处）

### 1. temp_manager.py - 静默吞掉异常

**文件**: `src/utils/temp_manager.py`

**问题**: `except Exception: return False` - 无日志记录

**修复**: 添加 `logger.warning()` 日志记录

### 2. lru_cache.py - 静默吞掉异常

**文件**: `src/utils/lru_cache.py`

**问题**: `except (TypeError, AttributeError): return 0`

**修复**: 添加 `logger.debug()` 日志记录

### 3. image_processor.py - 返回 None 改为抛出异常

**文件**: `src/core/image_processor.py`

**问题**: `get_image_for_product()` 返回 `None` 而非抛出异常

**修复**: 改为抛出 `ImageNotFoundError` 异常

---

## 🟠 MAJOR 修复（8处）

### 1. print 改为日志系统（4处）

**修复文件**:
- `src/core/loaders/folder_loader.py`
- `src/core/loaders/zip_loader.py`
- `src/core/reporters/error_reporter.py`
- `src/core/pipeline/orchestrator.py`

**修复内容**: 将所有 `print()` 改为 `logger.warning()` 或 `logger.error()`

### 2. 过长函数重构（3处）

**修复文件**:
- `src/python/gui_processor.py` - 拆分为多个辅助函数
- `src/core/excel_processor.py` - 拆分为模块级函数和类方法
- `src/main/handlers/process-handlers.ts` - 拆分为多个函数

### 3. 嵌套过深重构

**文件**: `src/main/handlers/process-handlers.ts`

**问题**: `extractResultFromOutput` 函数有 6-7 层嵌套

**方案**: 重构为两个函数，使用早返回模式

---

## 🟡 MINOR 修复（6+处）

### 1. console.log 改为日志（2处）

**修复文件**:
- `src/main/handlers/process-handlers.ts`
- `src/renderer/hooks/useProcessor.ts`

### 2. any 类型替换（2处）

**修复文件**:
- `src/core/framework/AdaptiveFileProcessor.ts`
- `src/main/retry-handler.ts`

### 3. global 变量改单例（3处）

**修复文件**:
- `src/utils/font_manager.py`
- `src/utils/temp_manager.py`
- `src/utils/version.py`

---

## 文件变更清单

### Python 文件（11个）

| 文件 | 变更类型 |
|------|---------|
| `src/utils/temp_manager.py` | 修复静默异常、移除 global |
| `src/utils/lru_cache.py` | 修复静默异常 |
| `src/core/image_processor.py` | 返回异常改为抛出 |
| `src/core/loaders/folder_loader.py` | print 改日志 |
| `src/core/loaders/zip_loader.py` | print 改日志 |
| `src/core/reporters/error_reporter.py` | print 改日志 |
| `src/core/pipeline/orchestrator.py` | print 改日志、日志修复 |
| `src/utils/version.py` | 移除 global |
| `src/utils/font_manager.py` | 移除 global |
| `src/core/excel_processor.py` | embed_image 重构、TwoCellAnchor |
| `src/core/matchers/image_matcher.py` | 删除 resize 缓存 |

### TypeScript 文件（8个）

| 文件 | 变更类型 |
|------|---------|
| `src/main/handlers/process-handlers.ts` | 重构嵌套、console 改日志、动态磁盘检测 |
| `src/main/ipc-handlers.ts` | 防止重复注册 |
| `src/main/retry-handler.ts` | any 类型替换 |
| `src/main/update-manager.ts` | 热更新重构、重试机制、熔断器 |
| `src/main/preload.ts` | 暴露 `onUpdateWillInstall` API |
| `src/core/framework/AdaptiveFileProcessor.ts` | any 类型替换 |
| `src/main/handlers/file-handlers.ts` | - |
| `src/main/path-config.ts` | 修复路径配置 |

### React 文件（2个）

| 文件 | 变更类型 |
|------|---------|
| `src/renderer/hooks/useProcessor.ts` | console 改 debugLog |
| `src/renderer/components/UpdateNotification.tsx` | 添加安装状态UI |

---

## 文档维护说明

- 本文档记录所有代码变更
- 版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)
- 🔴 BLOCKER: 必须立即修复的问题
- 🟠 MAJOR: 重要功能缺陷或代码异味
- 🟡 MINOR: 次要优化或小问题
