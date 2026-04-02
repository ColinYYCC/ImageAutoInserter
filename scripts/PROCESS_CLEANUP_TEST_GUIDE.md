# ImageAutoInserter 进程清理测试指南

## 测试目的

验证应用在关闭后是否能正确清理所有子进程，防止后台进程残留问题。

## 测试脚本

### Windows

**文件**: `scripts/test-process-cleanup.bat`

**运行方式**:
1. 双击运行 `test-process-cleanup.bat`
2. 或在命令提示符中执行:
   ```cmd
   cd scripts
   test-process-cleanup.bat
   ```

### macOS / Linux

**文件**: `scripts/test-process-cleanup.sh`

**运行方式**:
1. 先赋予执行权限:
   ```bash
   chmod +x scripts/test-process-cleanup.sh
   ```
2. 运行脚本:
   ```bash
   ./scripts/test-process-cleanup.sh
   ```

## 测试流程

脚本会按以下步骤执行：

1. **初始状态检查** - 确认测试前无残留进程
2. **启动应用** - 手动启动 ImageAutoInserter
3. **运行中检查** - 验证应用进程正常运行
4. **关闭应用** - 手动关闭应用（点击关闭按钮）
5. **残留检查** - 等待 3 秒后检查是否有进程残留

## 检查的进程类型

脚本会检查以下进程：

- **ImageAutoInserter** - 主应用进程
- **Python** - Python 子进程（处理 Excel 和图片）
- **Node/Vite** - 开发服务器进程（仅在开发模式）
- **Electron** - Electron 运行时进程

## 结果解读

### 成功标志

所有检查项显示 `[OK]`，进程数为 0：
```
ImageAutoInserter 进程数:
  [OK] 0 个进程

Python 进程数:
  [OK] 0 个进程

Node/Vite 进程数:
  [OK] 0 个进程

Electron 相关进程:
  [OK] 无 Electron 进程
```

### 失败标志

任何检查项显示 `[WARNING]`，表示有进程残留：
```
ImageAutoInserter 进程数:
  [WARNING] 1 个进程在运行
  12345 ImageAutoInserter
```

## 手动验证命令

如果脚本无法运行，可以使用以下命令手动检查：

### Windows

```cmd
:: 检查 ImageAutoInserter 进程
tasklist | findstr ImageAutoInserter

:: 检查 Python 进程
tasklist | findstr python

:: 检查 Node 进程
tasklist | findstr node

:: 检查 Electron 进程
tasklist | findstr electron
```

### macOS

```bash
# 检查 ImageAutoInserter 进程
pgrep -l ImageAutoInserter

# 检查 Python 进程
pgrep -l python

# 检查 Node 进程
pgrep -l node

# 检查 Electron 进程
pgrep -l electron
```

### Linux

```bash
# 检查 ImageAutoInserter 进程
pgrep -a ImageAutoInserter

# 检查 Python 进程
pgrep -a python

# 检查 Node 进程
pgrep -a node

# 检查 Electron 进程
pgrep -a electron
```

## 常见问题

### Q: 为什么 macOS 关闭窗口后还有 Dock 图标？

**A**: 这是 macOS 的标准行为。macOS 应用通常在关闭所有窗口后仍保持运行（Dock 图标仍在），直到用户按 `Cmd+Q` 完全退出。我们的修复已确保：
- Windows/Linux：关闭窗口后立即退出应用
- macOS：按 `Cmd+Q` 后完全退出应用

### Q: 开发模式下为什么有 Node 进程？

**A**: 开发模式下会启动 Vite 开发服务器（Node 进程），这是正常的。生产构建后不会有此进程。

### Q: 发现进程残留怎么办？

**A**: 可以手动终止残留进程：

**Windows**:
```cmd
taskkill /F /IM ImageAutoInserter.exe
taskkill /F /IM python.exe
```

**macOS/Linux**:
```bash
killall ImageAutoInserter
killall python
```

## 自动化测试（高级）

如果需要自动化测试，可以使用以下脚本：

### Windows PowerShell

```powershell
# 启动应用
Start-Process "ImageAutoInserter.exe"
Start-Sleep -Seconds 5

# 关闭应用
Stop-Process -Name "ImageAutoInserter" -Force
Start-Sleep -Seconds 3

# 检查残留
$processes = Get-Process | Where-Object { 
    $_.Name -like "*ImageAutoInserter*" -or 
    $_.Name -like "*python*" 
}
if ($processes) {
    Write-Host "发现残留进程！" -ForegroundColor Red
    $processes | Select-Object Name, Id
} else {
    Write-Host "无残留进程，测试通过！" -ForegroundColor Green
}
```

### macOS/Linux Bash

```bash
#!/bin/bash
# 启动应用
open "ImageAutoInserter.app" &
sleep 5

# 关闭应用
killall ImageAutoInserter
sleep 3

# 检查残留
if pgrep ImageAutoInserter > /dev/null; then
    echo "发现残留进程！"
    pgrep -l ImageAutoInserter
else
    echo "无残留进程，测试通过！"
fi
```

## 修复记录

本次测试针对以下修复进行验证：

1. **main.ts**: 修复 `window-all-closed` 事件，Windows/Linux 自动退出
2. **main.ts**: 修复 `before-quit` 事件，使用 `app.quit()` 替代 `app.exit()`
3. **python-bridge.ts**: 增强进程终止逻辑，SIGTERM → SIGKILL 超时机制
4. **dev-server-manager.ts**: 增强 Vite 进程清理，改进错误处理

## 联系支持

如果测试发现问题，请记录以下信息：
- 操作系统版本
- 应用版本
- 测试输出结果
- 应用日志（位于日志目录）
