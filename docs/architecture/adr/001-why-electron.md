# ADR-001: 为什么选择 Electron 而非 Tauri

**状态**: ✅ 接受  
**日期**: 2026-03-08  
**类型**: 技术栈选型  
**影响范围**: 桌面应用框架、构建流程、开发工具链

---

## 背景

ImageAutoInserter 项目需要一个跨平台桌面应用框架，用于构建 Windows、macOS 和 Linux 桌面应用程序。

### 项目需求

- **跨平台支持**: 必须支持 Windows、macOS、Linux
- **前端技术栈**: 使用 React + TypeScript 构建用户界面
- **系统交互**: 需要访问文件系统、执行 Python 脚本、系统对话框
- **团队技能**: 团队熟悉 JavaScript/TypeScript，不熟悉 Rust
- **开发周期**: 需要在短时间内完成开发并交付

### 候选方案

我们考虑了以下三个主要方案：

1. **Electron** - 成熟的跨平台桌面应用框架（VS Code、Slack、GitHub Desktop 使用）
2. **Tauri** - 新兴的轻量级桌面应用框架（Rust 后端 + Web 前端）
3. **.NET WPF/WinUI** - 仅 Windows 平台的原生方案

由于方案 3 不支持跨平台，实际对比集中在 Electron 和 Tauri 之间。

---

## 决策

选择 **Electron 28.x (LTS)** 作为桌面应用框架。

### 技术栈详情

```json
{
  "electron": "^28.0.0",
  "typescript": "^5.0.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0"
}
```

### 架构模式

采用 **Main Process + Renderer Process** 双进程架构：

- **Main Process**: Node.js 环境，负责窗口管理、文件系统、Python 进程管理
- **Renderer Process**: Chromium 环境，负责 UI 渲染和用户交互
- **IPC 通信**: 使用 `ipcMain` / `ipcRenderer` 进行进程间通信

---

## 考虑因素

### Electron 优势 ✅

| 优势 | 说明 | 重要性 |
|------|------|--------|
| **成熟稳定** | 2013 年发布，10 年历史，经过大量生产环境验证 | 🔴 高 |
| **生态丰富** | npm 上有大量 Electron 专用插件和组件 | 🔴 高 |
| **社区活跃** | Stack Overflow、GitHub Issues 上有大量可参考案例 | 🔴 高 |
| **跨平台完善** | Windows/macOS/Linux 支持一致，打包工具成熟 | 🔴 高 |
| **开发工具** | Chrome DevTools 集成，调试体验优秀 | 🔴 高 |
| **团队熟悉** | 团队熟悉 JavaScript/TypeScript，学习成本低 | 🔴 高 |
| **文档完善** | 官方文档详细，中文文档齐全 | 🟡 中 |
| **企业支持** | Slack、GitHub、Microsoft 等公司支持和贡献 | 🟡 中 |

### Electron 劣势 ❌

| 劣势 | 影响 | 缓解措施 |
|------|------|----------|
| **打包体积大** | ~80MB（相比 Tauri ~15MB） | 目标用户可接受，网络条件良好 |
| **内存占用高** | 相比原生应用高 50-100MB | 优化渲染，避免内存泄漏 |
| **性能略低** | 相比原生应用有性能损耗 | 核心逻辑用 Python，UI 简单 |
| **安全配置复杂** | 需要遵循安全最佳实践 | 使用安全配置模板，定期审计 |

### Tauri 优势 ✅

| 优势 | 说明 | 实际价值 |
|------|------|----------|
| **打包体积小** | ~15MB（使用系统 WebView） | 对目标用户不是关键需求 |
| **内存占用低** | 比 Electron 低 30-50% | 项目内存需求不高 |
| **性能好** | Rust 后端，执行效率高 | 核心逻辑在 Python，不在前端 |
| **安全性高** | Rust 内存安全，默认安全配置 | Electron 也可配置到类似水平 |

### Tauri 劣势 ❌

| 劣势 | 影响 | 严重性 |
|------|------|--------|
| **较新不稳定** | 2020 年发布，仅 3 年历史，生产案例少 | 🔴 高 |
| **生态小** | 插件和组件数量少，遇到问题难解决 | 🔴 高 |
| **需要 Rust** | 团队不熟悉 Rust，学习成本高 | 🔴 高 |
| **社区小** | 问题难找答案，招聘困难 | 🔴 高 |
| **跨平台待验证** | Linux 支持相对较弱 | 🟡 中 |
| **文档不完善** | 中文文档少，示例有限 | 🟡 中 |

---

## 决策理由

### 1. 稳定性优先

**Electron** 经过 10 年验证，被大量企业级应用使用：
- VS Code（全球最流行的代码编辑器）
- Slack（企业通讯工具）
- GitHub Desktop（版本控制工具）
- Discord（通讯工具）
- Figma（设计工具）

**Tauri** 2020 年发布，2023 年才发布 1.0 版本，稳定性待验证。

**结论**: 对于需要长期维护的企业级应用，稳定性是首要考虑因素。

### 2. 开发效率

**Electron** 生态丰富：
- npm 上有 `electron-builder`、`electron-updater` 等成熟工具
- 遇到问题容易在 Stack Overflow 找到答案
- 有大量开源项目可参考

**Tauri** 生态较小：
- 工具和插件选择有限
- 遇到问题可能需要自己解决
- 可参考的开源项目较少

**结论**: Electron 能显著提升开发效率，缩短交付周期。

### 3. 团队能力匹配

**团队现状**:
- 熟练掌握 JavaScript/TypeScript
- 有 React 开发经验
- 不熟悉 Rust

**Electron**: 直接使用现有技术栈，无需学习新语言

**Tauri**: 需要学习 Rust，后端代码需要用 Rust 编写

**结论**: Electron 与团队技能匹配，可立即开始开发。

### 4. 项目规模可接受

**打包体积对比**:
- Electron: ~80MB
- Tauri: ~15MB

**分析**:
- 目标用户为企业内部用户，网络条件良好
- 安装包大小不是关键决策因素
- 现代电脑硬盘空间充足，80MB 可接受

**结论**: Electron 的体积劣势对项目影响不大。

### 5. 长期维护考虑

**Electron**:
- 有稳定的商业支持（Slack、GitHub、Microsoft）
- 定期发布安全更新和功能更新
- LTS 版本提供长期支持

**Tauri**:
- 依赖社区和少数赞助商
- 长期维护存在不确定性

**结论**: Electron 的长期维护更有保障。

---

## 后果

### ✅ 正面影响

1. **开发速度快**
   - 可立即开始开发，无需学习新语言
   - 生态丰富，问题容易解决
   - 有大量可复用的组件和库

2. **招聘容易**
   - JavaScript/TypeScript 开发者众多
   - 不需要 Rust 专业技能

3. **组件选择多**
   - npm 上有大量 Electron 组件
   - UI 库选择丰富（Material-UI、Ant Design 等）

4. **调试方便**
   - Chrome DevTools 功能强大
   - 前端开发者熟悉调试工具

5. **文档齐全**
   - 官方文档详细
   - 中文社区活跃

### ⚠️ 负面影响

1. **打包体积较大**
   - 安装包约 80MB
   - 需要向用户说明

2. **内存占用较高**
   - 相比 Tauri 多占用 50-100MB 内存
   - 需要优化内存使用

3. **性能需要考虑**
   - 需要遵循 Electron 性能最佳实践
   - 避免不必要的资源消耗

### 📋 需要遵循的规范

为确保 Electron 应用的质量和安全性，必须遵循以下规范：

#### 1. 版本管理

```json
// package.json
{
  "devDependencies": {
    "electron": "^28.0.0"  // 使用 LTS 版本
  }
}
```

- 使用 Electron 28.x LTS 版本
- 定期更新到最新的 LTS 版本
- 关注 Electron 安全公告

#### 2. 安全配置

必须遵循 Electron 安全最佳实践：

```javascript
// main.js - 安全配置示例
const mainWindow = new BrowserWindow({
  width: 800,
  height: 600,
  webPreferences: {
    nodeIntegration: false,      // 禁用 Node 集成
    contextIsolation: true,      // 启用上下文隔离
    preload: path.join(__dirname, 'preload.js'),
    sandbox: true                // 启用沙箱
  }
});
```

#### 3. 性能优化

- 使用 `app.whenReady()` 延迟初始化
- 懒加载非关键模块
- 使用 React.memo 避免不必要的重渲染
- 及时清理定时器和事件监听器
- 监控内存使用

#### 4. 打包配置

使用 `electron-builder` 进行打包：

```javascript
// electron-builder.yml
appId: com.imageautoinserter.app
productName: ImageAutoInserter
directories:
  output: dist
files:
  - dist/**/*
  - package.json
mac:
  target: dmg
  icon: build/icon.icns
win:
  target: nsis
  icon: build/icon.ico
linux:
  target: AppImage
  icon: build/icon.png
```

---

## 替代方案

### 替代方案 1: Tauri

**适用场景**:
- 对包体积非常敏感
- 团队有 Rust 经验
- 项目规模小，可接受一定风险

**不选择原因**:
- 团队不熟悉 Rust
- 生态较小，开发效率低
- 稳定性待验证

### 替代方案 2: .NET WPF/WinUI

**适用场景**:
- 仅支持 Windows 平台
- 需要深度 Windows 集成
- 团队有 .NET 经验

**不选择原因**:
- 不支持跨平台
- 与现有技术栈不匹配

### 替代方案 3: Flutter Desktop

**适用场景**:
- 需要同时开发移动端和桌面端
- 团队有 Flutter 经验

**不选择原因**:
- 桌面端支持相对较新
- 与系统集成能力弱于 Electron
- 团队不熟悉 Dart 语言

---

## 参考链接

### 官方文档

- [Electron 官方文档](https://www.electronjs.org/)
- [Electron 安全最佳实践](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron 性能最佳实践](https://www.electronjs.org/docs/latest/tutorial/performance)
- [Tauri 官方文档](https://tauri.app/)

### 对比文章

- [Electron vs Tauri 官方对比](https://www.electronjs.org/docs/latest/development/electron-vs-tauri)
- [Tauri vs Electron 性能对比](https://tauri.app/blog/2020/09/07/tauri-vs-electron-results)

### 学习资源

- [Electron 入门教程](https://www.electronjs.org/docs/latest/tutorial/quick-start)
- [Electron Fiddle](https://www.electronjs.org/fiddle) - 快速原型工具

### 开源项目参考

- [VS Code](https://github.com/microsoft/vscode)
- [GitHub Desktop](https://github.com/desktop/desktop)
- [Electron React Boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate)

---

## 附录：决策过程记录

### 讨论时间线

- **2026-03-01**: 初步调研 Electron 和 Tauri
- **2026-03-03**: 团队内部讨论，评估技术栈匹配度
- **2026-03-05**: 创建原型项目，测试两个框架
- **2026-03-07**: 最终决策会议，确定使用 Electron
- **2026-03-08**: 编写 ADR 文档

### 参与决策人员

- 后端架构师：负责技术评估
- 前端开发：负责前端技术栈评估
- 项目经理：负责项目周期和风险评估

### 关键决策因素排序

1. 团队技能匹配度（最高优先级）
2. 开发效率和交付周期
3. 稳定性和长期维护
4. 包体积和性能
5. 生态和社区支持

---

**最后更新**: 2026-03-08  
**下次审查**: 2026-09-08（6 个月后）
