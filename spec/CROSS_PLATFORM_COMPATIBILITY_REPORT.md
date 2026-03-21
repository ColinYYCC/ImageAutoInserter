# ImageAutoInserter 跨平台兼容性分析报告

**生成时间**: 2026-03-20
**版本**: v1.0.2
**支持平台**:
- macOS ARM64 (Apple Silicon)
- Windows x86-64

**不在支持范围**: Linux

---

## 一、文件系统路径兼容性

### 1.1 路径分隔符差异

| 问题编号 | FS-001 |
|----------|--------|
| **问题描述** | Unix 系统使用 `/` 作为路径分隔符，Windows 使用 `\\` |
| **影响范围** | 所有涉及路径拼接的代码 |
| **当前状态** | ✅ 已修复 |
| **代码位置** | `src/main/utils/permissions.ts` |

**问题代码**:
```typescript
// 错误示例
return `${homeDir}/Documents`;  // macOS 有效，Windows 无效
return `${homeDir}\\Documents`;   // Windows 有效，macOS 无效
```

**修复方案**:
```typescript
import path from 'path';
return path.join(homeDir, 'Documents');  // 跨平台兼容
```

---

### 1.2 临时目录路径

| 问题编号 | FS-002 |
|----------|--------|
| **问题描述** | 不同系统的临时目录路径不同 |
| **影响范围** | 日志文件、临时文件存储 |
| **当前状态** | ⚠️ 需要修复 |
| **代码位置** | `src/main/path-config.ts` |

**问题代码**:
```typescript
// 第 34 行 - Linux 硬编码路径
tempDir = '/tmp';
logFile = '/tmp/imageinserter_diag.log';
```

**修复方案**:
```typescript
// 使用 Electron 的跨平台 API
tempDir = app.getPath('temp');
logFile = path.join(tempDir, 'imageinserter_diag.log');
```

---

### 1.3 macOS 应用沙盒路径

| 问题编号 | FS-003 |
|----------|--------|
| **问题描述** | macOS 沙盒环境中路径访问受限 |
| **影响范围** | 文件选择器、文件保存 |
| **当前状态** | ✅ 已处理 |
| **代码位置** | `src/main/utils/permissions.ts` |

**现状**: 已正确使用 `dialog.showOpenDialog` 进行文件选择，系统会自动处理沙盒权限。

---

## 二、子进程与环境变量

### 2.1 PATH 环境变量

| 问题编号 | ENV-001 |
|----------|--------|
| **问题描述** | GUI 应用不继承终端的 PATH，可能找不到系统工具 |
| **影响范围** | `rarfile` 库调用 `unrar`/`WinRAR` |
| **当前状态** | ✅ 已修复 |
| **代码位置** | `src/main/ipc-handlers.ts`, `src/main/python-bridge.ts` |

**修复方案**:
```typescript
const spawnEnv: NodeJS.ProcessEnv = { ...process.env };

if (process.platform === 'darwin') {
  spawnEnv.PATH = '/opt/homebrew/bin:' + (process.env.PATH || '/usr/bin:/bin:/usr/sbin:/sbin');
} else if (process.platform === 'win32') {
  spawnEnv.PATH = process.env.PATH || 'C:\\Python39;C:\\Program Files';
}

pythonProcess = spawn(pythonExecutable, args, {
  cwd,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: spawnEnv,
});
```

---

### 2.2 Python 路径选择

| 问题编号 | ENV-002 |
|----------|--------|
| **问题描述** | 不同系统 Python 命令不同 |
| **影响范围** | Python 子进程启动 |
| **当前状态** | ✅ 已修复 |
| **代码位置** | `src/main/ipc-handlers.ts` |

**修复方案**:
```typescript
if (envPython && fs.existsSync(envPython)) {
  pythonExecutable = envPython;
} else if (process.platform === 'darwin' || process.platform === 'linux') {
  pythonExecutable = 'python3';
} else {
  pythonExecutable = 'python';  // Windows
}
```

---

## 三、第三方库跨平台支持

### 3.1 rarfile 库

| 问题编号 | LIB-001 |
|----------|--------|
| **问题描述** | rarfile 需要外部 RAR 工具支持 |
| **影响范围** | RAR 压缩包读取 |
| **当前状态** | ⚠️ 需要用户配置 |
| **依赖工具** | macOS: `unrar` (Homebrew), Windows: `WinRAR`, Linux: `unrar` |

**跨平台配置**:

| 平台 | 安装方式 | 路径要求 |
|------|---------|----------|
| macOS ARM64 | `brew install unrar` | `/opt/homebrew/bin/unrar` |
| Windows x86-64 | 安装 WinRAR | `C:\Program Files\WinRAR\WinRAR.exe` |

**环境变量配置**:
```bash
# Windows - 设置 RAR_BIN 环境变量
set RAR_BIN=C:\Program Files\WinRAR\WinRAR.exe
```

---

### 3.2 PyInstaller 打包

| 问题编号 | LIB-002 |
|----------|--------|
| **问题描述** | PyInstaller 在不同平台需要不同配置 |
| **影响范围** | Python 代码打包为二进制 |
| **当前状态** | ✅ 已配置 |

**当前配置** (`pyinstaller.spec`):
```python
a = Analysis(
    ['src/cli.py'],
    hiddenimports=[
        'openpyxl', 'pandas', 'PIL', 'rarfile', 'requests', 'PyQt6'
    ],
)
```

**注意事项**:
- Windows 打包需要 Windows 构建环境
- macOS 打包需要 macOS 构建环境
- 跨平台打包建议使用 CI/CD

---

## 四、UI 渲染与交互行为

### 4.1 字体渲染差异

| 问题编号 | UI-001 |
|----------|--------|
| **问题描述** | Windows 和 macOS 字体渲染不一致 |
| **影响范围** | 表格字体、标签字体显示 |
| **当前状态** | ✅ 已处理 |
| **代码位置** | `src/utils/font_manager.py` |

**现状**: 代码中包含字体渲染一致性处理。

---

### 4.2 对话框样式

| 问题编号 | UI-002 |
|----------|--------|
| **问题描述** | 不同系统的原生对话框样式不同 |
| **影响范围** | 文件选择、错误提示 |
| **当前状态** | ✅ Electron 自动处理 |

**现状**: 使用 Electron 的 `dialog` API，系统自动使用原生对话框。

---

### 4.3 文件拖拽

| 问题编号 | UI-003 |
|----------|--------|
| **问题描述** | macOS 和 Windows 拖拽行为可能不同 |
| **影响范围** | 用户体验 |
| **当前状态** | ⚠️ 未测试 |

---

## 五、权限与安全模型

### 5.1 macOS 权限框架

| 问题编号 | SEC-001 |
|----------|--------|
| **问题描述** | macOS 10.14+ 需要显式请求媒体访问权限 |
| **影响范围** | 文件访问 |
| **当前状态** | ✅ 已处理 |
| **代码位置** | `src/main/utils/permissions.ts` |

**处理逻辑**:
```typescript
if (os.platform() !== 'darwin') {
  return true;  // 非 macOS 不需要特殊处理
}
// macOS: 使用 systemPreferences.getMediaAccessStatus 检查并请求权限
```

---

### 5.2 Windows UAC

| 问题编号 | SEC-002 |
|----------|--------|
| **问题描述** | Windows 可能需要管理员权限访问某些目录 |
| **影响范围** | 受保护的系统目录 |
| **当前状态** | ✅ 规避处理 |
| **规避措施** | 使用用户文档目录，避免系统保护区域 |

---

## 六、应用数据存储

### 6.1 应用数据目录

| 问题编号 | DATA-001 |
|----------|--------|
| **问题描述** | 不同系统应用数据存储位置不同 |
| **影响范围** | 日志、配置、缓存 |
| **当前状态** | ✅ 已处理 |

**Electron 跨平台 API**:
```typescript
app.getPath('userData');  // 自动返回正确的平台路径
```

**路径对比**:

| 平台 | userData 路径 |
|------|---------------|
| macOS | `~/Library/Application Support/<app-name>/` |
| Windows | `%APPDATA%\<app-name>\` |
| Linux | `~/.config/<app-name>/` |

---

## 七、已知问题与解决方案

### 问题汇总表

| 问题编号 | 严重程度 | 影响范围 | 状态 | 解决方案 |
|----------|----------|----------|------|----------|
| FS-001 | 高 | 所有平台 | ✅ 已修复 | 使用 `path.join()` |
| FS-002 | 中 | Linux | ⚠️ 待修复 | 使用 `app.getPath('temp')` |
| ENV-001 | 高 | macOS | ✅ 已修复 | 显式设置 PATH 环境变量 |
| LIB-001 | 高 | 所有平台 | ⚠️ 用户配置 | 安装对应平台的 RAR 工具 |
| UI-003 | 低 | 所有平台 | ⚠️ 未测试 | 需实际测试验证 |
| SEC-001 | 中 | macOS | ✅ 已处理 | 权限检查与请求 |

---

### 待修复问题详情

#### FS-002: Linux 临时目录硬编码

**位置**: `src/main/path-config.ts` 第 34-35 行

**问题代码**:
```typescript
} else {
  tempDir = '/tmp';  // Linux 硬编码
  logFile = '/tmp/imageinserter_diag.log';
}
```

**建议修复**:
```typescript
} else {
  // Linux: 使用 Electron API 或平台检测
  tempDir = app.getPath('temp');  // 推荐
  logFile = path.join(tempDir, 'imageinserter_diag.log');
}
```

---

## 八、测试建议

### 8.1 平台覆盖测试矩阵

| 测试项 | macOS ARM64 | Windows x86-64 |
|--------|-------------|----------------|
| 文件选择器 | ✅ | ✅ |
| RAR 文件读取 | ✅ | ✅ |
| 文件夹读取 | ✅ | ✅ |
| Excel 保存 | ✅ | ✅ |
| 日志写入 | ✅ | ✅ |
| 路径处理 | ✅ | ✅ |

### 8.2 建议测试用例

1. **路径处理测试**
   - 中文字符路径
   - 特殊字符路径（空格、括号等）
   - 嵌套文件夹路径

2. **文件格式测试**
   - RAR 压缩包 (macOS/Windows)
   - 文件夹 (所有平台)
   - 混合格式切换

3. **权限测试**
   - macOS: 首次启动权限请求
   - Windows: UAC 提示
   - 受保护目录访问

---

## 九、建议改进

### 9.1 短期改进

1. 修复 `path-config.ts` 中 Linux 临时目录硬编码问题
2. 添加 Windows RAR 工具路径的自动检测
3. 增加跨平台测试用例

### 9.2 长期改进

1. 使用 CI/CD 实现跨平台自动化构建和测试
2. 添加平台特定功能的 feature flag
3. 建立跨平台兼容性测试矩阵

---

## 十、结论

当前代码在 macOS 和 Windows 上的兼容性已基本覆盖，主要问题集中在：

1. **已解决**: PATH 环境变量、RAR 工具路径、Python 命令选择
2. **待处理**: Linux 临时目录硬编码
3. **需用户配合**: Windows 上安装 WinRAR

建议优先修复 Linux 临时目录问题，并建立跨平台测试机制。
