# 文件整理体系快速开始指南

> 5 分钟上手新的文件整理体系

---

## 📁 新目录结构一览

```
ImageAutoInserter/
├── 📁 project/          # 🚫 开发专用（文档、测试、示例）
├── 📁 .trae/            # 🚫 AI 配置
├── 📁 .dev/             # 🚫 开发工具
├── 📁 src/              # ⚠️ 源代码（构建后打包）
├── 📁 assets/           # ✅ 静态资源（直接打包）
├── 📁 build/            # ✅ 构建配置
├── 📁 dist/             # ✅ 构建输出（打包）
└── 📁 release/          # ✅ 发布包
```

---

## 🚀 常用操作

### 1. 创建新组件

```bash
# React 组件
mkdir -p src/renderer/components/MyComponent
touch src/renderer/components/MyComponent/index.tsx
touch src/renderer/components/MyComponent/styles.module.css
```

### 2. 创建新文档

```bash
# 项目文档
mkdir -p project/docs/guides
touch project/docs/guides/MY_FEATURE_GUIDE.md
```

### 3. 创建新测试

```bash
# 单元测试
touch project/tests/unit/my-feature.test.ts
```

### 4. 添加示例数据

```bash
# 示例文件
cp my-data.xlsx project/samples/
```

---

## 📋 文件存放决策树

```
新文件要放在哪里？
│
├── 是开发文档、测试、示例？
│   └── → project/
│       ├── 文档 → project/docs/
│       ├── 测试 → project/tests/
│       └── 示例 → project/samples/
│
├── 是 AI 配置或 Skill？
│   └── → .trae/
│
├── 是开发工具或日志？
│   └── → .dev/
│
├── 是源代码？
│   └── → src/
│       ├── React 组件 → src/renderer/components/
│       ├── Hooks → src/renderer/hooks/
│       ├── 主进程 → src/main/
│       └── Python → src/python/
│
├── 是静态资源（字体、图标、图片）？
│   └── → assets/
│
└── 是构建配置？
    └── → build/
```

---

## ✅ 打包安全检查清单

在构建发布版本前，确认以下事项：

- [ ] `project/` 目录中没有需要打包的文件
- [ ] `docs/` 目录已移动到 `project/docs/`
- [ ] `tests/` 目录已移动到 `project/tests/`
- [ ] `Sample/` 目录已移动到 `project/samples/`
- [ ] 静态资源都在 `assets/` 目录
- [ ] 源代码都在 `src/` 目录

---

## 🔍 验证打包内容

```bash
# 1. 构建项目
npm run build

# 2. 预览打包内容（不解压）
npm run pack -- --dir

# 3. 检查打包目录
ls -la release/win-unpacked/resources/app/

# 4. 确认没有多余文件
du -sh release/win-unpacked/resources/app/
```

**预期结果：**
- 只有 `dist/`、`assets/` 和 `package.json`
- 没有 `project/`、`docs/`、`tests/` 等开发文件
- 包大小合理（< 100MB）

---

## 🔄 从旧结构迁移

### 自动迁移脚本

```bash
# 运行迁移脚本（如果提供了）
npm run migrate:organization
```

### 手动迁移步骤

```bash
# 1. 移动文档
mv docs/* project/docs/ 2>/dev/null || true

# 2. 移动测试
mv tests/* project/tests/ 2>/dev/null || true

# 3. 移动示例
mv Sample/* project/samples/ 2>/dev/null || true

# 4. 清理空目录
rmdir docs tests Sample 2>/dev/null || true

# 5. 验证
ls -la project/
```

---

## 📖 相关文档

- [完整文件整理指南](./FILE_ORGANIZATION_GUIDE.md)
- [命名规范](./NAMING_CONVENTIONS.md)
- [打包配置说明](./PACKAGING_CONFIG.md)

---

## ❓ 常见问题

### Q: 我不小心把文档放到 src/ 了，怎么办？

**A:** 立即移动到 `project/docs/`，然后检查是否已提交到 Git。

```bash
mv src/docs/* project/docs/
rmdir src/docs
```

### Q: 打包后发现文档还在里面？

**A:** 检查 `package.json` 的 `build.files` 配置，确保排除了 `project/` 目录。

### Q: 某些文件既需要开发又需要打包？

**A:** 这是设计上的分离。开发文件和运行时文件应该分开：
- 开发配置 → `project/configs/`
- 运行时配置 → `src/config/` 或 `assets/config/`

---

**记住：当不确定时，先放到 `project/`，它永远不会被打包！**
