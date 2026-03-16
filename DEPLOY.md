# 自动更新部署指南

## 概述

本项目已集成 `electron-updater` 自动更新机制，用户可以在应用内看到更新提示并一键更新。

## 配置步骤

### 1. 配置 GitHub 仓库

首先需要在 `package.json` 中配置您的 GitHub 信息：

```json
"build": {
  "publish": {
    "provider": "github",
    "owner": "你的GitHub用户名",
    "repo": "ImageAutoInserter",
    "releaseType": "release"
  }
}
```

### 2. 创建 GitHub 仓库并推送代码

```bash
# 初始化 Git 仓库（如果还没有）
git init

# 添加远程仓库
git remote add origin https://github.com/你的GitHub用户名/ImageAutoInserter.git

# 提交代码
git add .
git commit -m "添加自动更新功能"
git push -u origin main
```

### 3. 创建 GitHub Personal Access Token

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 勾选 `repo` 权限
4. 生成并复制 Token

### 4. 发布第一个版本

#### 更新版本号

编辑 `package.json`，更新版本号：

```json
{
  "version": "1.0.0"
}
```

#### 构建并发布

```bash
# 设置 GitHub Token 环境变量
export GH_TOKEN=你的GitHubToken

# 构建并发布到 GitHub Releases
npm run dist
```

或者手动构建后上传：

```bash
# 只构建，不发布
npm run build

# 手动上传 release 目录下的文件到 GitHub Releases
```

### 5. 发布新版本流程

每次发布新版本时：

1. **更新版本号**（`package.json`）
   ```json
   {
     "version": "1.0.1"  // 升级版本号
   }
   ```

2. **创建发布说明**（`CHANGELOG.md`）
   ```markdown
   ## v1.0.1 (2026-03-14)
   
   ### 新功能
   - 添加自动更新功能
   - 优化图片处理速度
   
   ### 修复
   - 修复 Excel 读取大文件时的内存问题
   ```

3. **构建并发布**
   ```bash
   export GH_TOKEN=你的GitHubToken
   npm run dist
   ```

   这会自动：
   - 构建应用
   - 创建 GitHub Release
   - 上传安装包到 Release

## 用户端更新流程

### 自动检查
- 应用启动 5 秒后自动检查更新
- 右下角显示当前版本号

### 手动检查
- 点击右下角的版本号按钮
- 立即检查是否有新版本

### 更新提示
1. **发现新版本**：显示版本对比和更新日志
2. **点击更新**：开始下载新版本
3. **下载进度**：显示下载进度条
4. **安装重启**：下载完成后提示安装并重启

## 文件说明

| 文件 | 说明 |
|------|------|
| `src/main/update-manager.ts` | 更新管理器核心逻辑 |
| `src/renderer/components/UpdateNotification.tsx` | 更新提示 UI 组件 |
| `src/main/ipc-handlers.ts` | IPC 通信接口 |
| `src/main/preload.ts` | 预加载脚本 API 暴露 |

## 常见问题

### Q: 更新检查失败？
A: 检查以下几点：
- GitHub Token 是否正确设置
- 网络连接是否正常
- GitHub 仓库是否公开（或 Token 有私有仓库权限）

### Q: 如何测试更新功能？
A: 
1. 发布 v1.0.0 版本
2. 安装 v1.0.0 版本
3. 修改版本号为 v1.0.1
4. 发布 v1.0.1 版本
5. 打开 v1.0.0 应用，应该能检测到 v1.0.1 更新

### Q: 支持哪些平台？
A: 支持 macOS、Windows 和 Linux，electron-updater 会自动处理各平台的更新文件。

## 注意事项

1. **版本号规范**：使用语义化版本号（如 1.0.0、1.0.1、1.1.0）
2. **Release Notes**：每次发布时填写更新说明，用户会看到
3. **签名**：macOS 和 Windows 建议进行代码签名，否则会有安全警告
4. **增量更新**：electron-updater 支持增量更新，只下载差异部分
