# 启动指南 - GUI 开发

> **更新日期**: 2026-03-08  
> **状态**: ✅ 已修复

---

## 🚀 快速启动

### 方法 1: 两步启动（推荐）

**步骤 1: 启动 Vite 开发服务器**
```bash
# 终端 1
npm run dev
```

**预期输出**:
```
VITE v5.0.0  ready in 246 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**步骤 2: 启动 Electron**
```bash
# 终端 2（新建终端）
npm run electron
```

**预期输出**:
- Electron 窗口自动打开
- 显示 "Image Auto Inserter" 应用
- 看到两个 FilePicker 卡片

---

### 方法 2: 仅使用浏览器（快速测试）

如果 Electron 有问题，可以直接在浏览器中测试：

```bash
npm run dev
```

然后在浏览器中打开：**http://localhost:5173**

**注意**: 
- 文件选择功能在浏览器中不可用（需要 Electron API）
- 但可以看到 UI 布局和样式

---

## 🔧 常见问题

### 问题 1: 端口被占用

**错误信息**:
```
Port 5173 is in use, trying another one...
```

**解决方案**:
1. 关闭占用端口的进程：
```bash
lsof -i :5173
kill -9 <PID>
```

2. 或者使用其他端口：
```bash
npm run dev -- --port 5174
# 然后在另一个终端
npm run electron
```

---

### 问题 2: Electron 窗口不打开

**可能原因**:
- NODE_ENV 未设置
- Vite 服务器未就绪

**解决方案**:
```bash
# 确保先启动 Vite
npm run dev

# 等待看到 "VITE v5.0.0 ready" 后再启动 Electron
npm run electron
```

---

### 问题 3: 文件选择无响应

**可能原因**:
- IPC 通信未正确设置
- preload 脚本未加载

**检查步骤**:
1. 打开 DevTools（Electron 自动打开）
2. 查看 Console 是否有错误
3. 检查 Network 面板

**解决方案**:
```bash
# 重新构建
npm run build

# 重新启动
npm run dev
npm run electron
```

---

## 📊 当前配置

### 开发环境
- **Vite**: http://localhost:5173
- **Electron**: 本地窗口
- **NODE_ENV**: development
- **DevTools**: 自动打开

### 窗口设置
- **尺寸**: 800x600px（固定）
- **可调整大小**: 否
- **Node 集成**: 关闭（安全）
- **上下文隔离**: 开启

---

## 🧪 测试步骤

### 1. 启动应用
```bash
# 终端 1
npm run dev

# 终端 2（等待 Vite 就绪后）
npm run electron
```

### 2. 检查界面
- [ ] 窗口打开
- [ ] 显示标题 "Image Auto Inserter"
- [ ] 显示两个 FilePicker 卡片
- [ ] DevTools 自动打开

### 3. 测试文件选择
- [ ] 点击 "📄 Excel 文件" 的 "选择文件" 按钮
- [ ] 文件对话框打开
- [ ] 选择 .xlsx 文件
- [ ] 显示文件名和大小
- [ ] 出现 "清除" 按钮

### 4. 测试图片源选择
- [ ] 点击 "🖼️ 图片源" 的 "选择文件" 按钮
- [ ] 文件对话框打开
- [ ] 选择 .zip 或 .rar 文件
- [ ] 显示文件名和大小
- [ ] 出现 "清除" 按钮

### 5. 测试交互效果
- [ ] 鼠标悬停卡片 → 阴影加深、轻微上移
- [ ] 鼠标悬停按钮 → 颜色变化
- [ ] 点击按钮 → 弹性反馈

---

## 📝 提交历史

| Commit | 说明 | 日期 |
|--------|------|------|
| `c8d9df7` | 分离 dev 和 electron 脚本 | 2026-03-08 |
| `ab9dfde` | 添加 cross-env 和 NODE_ENV | 2026-03-08 |
| `bd01121` | FilePicker 组件开发 | 2026-03-08 |

---

## 🎯 下一步

如果启动成功：
1. ✅ 按照测试步骤测试功能
2. ✅ 填写测试报告：[docs/testing/gui-test-report-stage-2-task-2.1.md](docs/testing/gui-test-report-stage-2-task-2.1.md)
3. ✅ 回复测试结果
4. ✅ 继续 Task 2.2

如果启动失败：
1. ❌ 查看错误信息
2. ❌ 检查常见问题部分
3. ❌ 报告具体错误

---

## 📞 需要帮助？

如果遇到问题，请提供：
1. 完整的错误信息
2. 终端输出
3. DevTools Console 截图
4. 操作系统版本

---

**祝测试顺利！** 🚀
