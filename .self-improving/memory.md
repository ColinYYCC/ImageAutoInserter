# Self-Improving Memory

## Confirmed Preferences
<!-- Patterns confirmed by user, never decay -->

### Electron 开发规则
- 修改主进程代码后必须运行 `npm run build:main`
- 修改 preload 脚本后必须运行 `npm run build:preload`
- 修改后必须重启 Electron 应用才能生效

### Promise 处理规则
- 使用标志位防止 resolve 多次调用
- 异步操作必须添加超时保护

### CSS 溢出处理规则
- 错误提示容器必须使用 `overflow: visible`
- 多层容器嵌套时，确保最外层允许溢出

### Electron 开发规则（新增）
- 简化 dev 脚本，让 Electron 主进程自己管理 Vite 启动
- 前端验证与后端逻辑需保持一致（表头检测）
- 根据 accept 参数动态判断文件选择类型，避免硬编码

## Active Patterns
<!-- Patterns observed 3+ times, subject to decay -->

### Electron 应用调试
- 主进程日志在终端显示
- 渲染进程日志在 DevTools Console 显示
- Vite 热更新对渲染进程有效，对主进程无效

## Recent (last 7 days)
<!-- New corrections pending confirmation -->

### 2026-03-12: 图片来源格式检测功能开发

**场景**: 实现图片来源格式检测功能

**问题 1**: API 不存在错误
- **操作**: 修改了 preload.ts 和 ipc-handlers.ts
- **预期**: 修改后立即生效
- **实际**: API 调用失败，日志显示 "validateImageSource API 不存在"
- **根因**: Electron 主进程和 preload 脚本需要重新构建
- **解决**: 运行 `npm run build:main && npm run build:preload` 后重启应用
- **教训**: 任何 Electron 主进程/preload 修改都需要重新构建

**问题 2**: Promise resolve 多次调用
- **操作**: 实现了 Python 进程调用 + 超时保护
- **预期**: 正常返回结果
- **实际**: 前端收不到结果，日志显示 "Python 进程超时，强制结束"
- **根因**: Python 进程正常结束后，超时定时器也触发了，导致 resolve 被调用两次
- **解决**: 使用标志位 `let resolved = false` 防止多次 resolve
- **教训**: 异步操作需要标志位保护

**问题 3**: 错误提示被隐藏
- **操作**: 添加了错误提示显示
- **预期**: 错误提示完整显示
- **实际**: 错误提示被截断或隐藏
- **根因**: 多层 CSS 容器都有 `overflow: hidden`
- **解决**:
  - `.mainCard`: `overflow: hidden` → `overflow: visible`
  - `.stepsContainer`: `overflow: hidden` → `overflow-y: auto`
  - `.stepSection`: `overflow: hidden` → `overflow: visible`
  - `.validationMessage`: 添加 `white-space: normal`, `overflow: visible`, `word-break: break-word`
- **教训**: 检查完整的 CSS 容器链，确保溢出不被隐藏

**问题 4**: 错误提示截断
- **操作**: 错误提示使用单行显示
- **预期**: 完整显示错误信息
- **实际**: 文字被截断显示省略号
- **根因**: CSS 使用了 `white-space: nowrap` 和 `text-overflow: ellipsis`
- **教训**: 错误提示需要允许换行
