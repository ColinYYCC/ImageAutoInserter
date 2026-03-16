# Task 1.3: 配置 Vite 构建工具

**Status:** COMPLETED  
**Created:** 2026-03-08  
**Completed:** 2026-03-08  
**Priority:** HIGH

---

## 任务目标

配置 Vite 构建工具，创建主进程和渲染进程的配置文件，以及所有必需的入口文件。

---

## 输入契约

### 前置条件
- ✅ Task 1.1 已完成：项目基础结构已创建
- ✅ Task 1.2 已完成：TypeScript 配置文件已创建
- ✅ Node.js 环境已安装
- ✅ package.json 已初始化

### 环境准备
- macOS 系统
- Node.js 18+
- npm 或 yarn

### 依赖任务
- Task 1.1: 项目基础结构
- Task 1.2: TypeScript 配置

---

## 输出契约

### 交付物
1. `vite.config.ts` - 主 Vite 配置文件
2. `vite.main.config.ts` - 主进程构建配置
3. `vite.renderer.config.ts` - 渲染进程构建配置
4. `src/main/main.ts` - 主进程入口文件
5. `src/renderer/main.tsx` - 渲染进程入口文件
6. `src/renderer/App.tsx` - 根组件
7. `src/renderer/index.html` - HTML 模板
8. `src/renderer/styles/global.css` - 全局样式
9. 更新后的 `package.json`

### 验收标准
- [ ] 所有依赖安装成功（vite, @vitejs/plugin-react, concurrently, wait-on, electron-store）
- [ ] 所有配置文件创建完成，内容与规范一致
- [ ] 所有入口文件创建完成
- [ ] `npm run dev` 能成功启动开发服务器并打开 Electron 窗口
- [ ] 窗口显示 "Image Auto Inserter" 和 "GUI 开发中..."
- [ ] Git commit 成功，消息为 "feat: configure Vite build system and create entry files"

---

## 实现步骤

### Step 1: 安装 Vite 和相关依赖
```bash
npm install vite@5.0.0 --save-dev
npm install @vitejs/plugin-react@4.2.0 --save-dev
npm install concurrently@8.2.0 --save-dev
npm install wait-on@7.2.0 --save-dev
npm install electron-store@8.1.0 --save
```

### Step 2: 创建 vite.config.ts
创建主配置文件，包含 React 插件和路径别名。

### Step 3: 创建 vite.main.config.ts
创建主进程构建配置，输出 CJS 格式。

### Step 4: 创建 vite.renderer.config.ts
创建渲染进程构建配置，包含 React 插件。

### Step 5: 创建 src/main/main.ts
创建 Electron 主进程入口文件，处理窗口创建和生命周期。

### Step 6: 创建 src/renderer/main.tsx
创建 React 渲染进程入口文件。

### Step 7: 创建 src/renderer/App.tsx
创建根 App 组件。

### Step 8: 创建 src/renderer/index.html
创建 HTML 模板文件。

### Step 9: 创建 src/renderer/styles/global.css
创建全局样式文件。

### Step 10: 更新 package.json
添加 dev, build, preview 脚本。

### Step 11: 测试开发服务器
```bash
npm run dev
```

### Step 12: Git Commit
```bash
git add vite.config.ts vite.*.config.ts src/main/ src/renderer/ package.json
git commit -m "feat: configure Vite build system and create entry files"
```

---

## 执行记录

### 依赖安装
✅ 已完成
- vite@5.0.0
- @vitejs/plugin-react@4.2.0
- concurrently@8.2.0
- wait-on@7.2.0
- electron-store@8.1.0

### 文件创建
✅ 已完成
- vite.config.ts
- vite.main.config.ts
- vite.renderer.config.ts
- vite.preload.config.ts
- src/main/main.ts
- src/main/preload.ts
- src/renderer/main.tsx
- src/renderer/App.tsx
- src/renderer/index.html
- src/renderer/styles/global.css

### 测试验证
✅ 已完成
- Vite 开发服务器成功启动 (http://localhost:5173)
- Electron 窗口成功打开

### Git Commit
✅ 已完成
- Commit Hash: fab67c9
- Message: "feat: configure Vite build system and create entry files"
- 提交文件：11 files changed, 209 insertions(+), 11 deletions(-)

---

## 技术约束

- Vite 版本：5.0.0
- React 插件版本：4.2.0
- 路径别名：@ 指向 src/renderer，@shared 指向 src/shared
- 主进程输出格式：CJS
- 渲染进程输出格式：ESM

---

## 风险与注意事项

1. 确保 electron-store 正确安装
2. 路径别名配置需要与 TypeScript 配置对齐
3. 开发模式下需要正确配置 Vite 服务器端口
4. Electron 窗口需要正确加载开发服务器 URL

---

## 完成标准

- ✅ 所有依赖安装成功
- ✅ 所有文件创建完成
- ✅ 开发服务器测试通过
- ✅ Git commit 成功
- ✅ 所有验收标准已满足
