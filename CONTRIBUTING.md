# 贡献指南

感谢你对 ImageAutoInserter 项目的关注！我们欢迎任何形式的贡献。

## 如何贡献

### 报告 Bug

如果你发现了 bug，请通过 [GitHub Issues](https://github.com/ColinYYCC/ImageAutoInserter/issues) 提交报告。提交前请：

1. 搜索现有的 issues，确认该问题尚未被报告
2. 使用清晰的标题描述问题
3. 提供详细的复现步骤
4. 附上相关的日志、截图或代码示例

### 提出新功能

如果你有新功能的想法，请：

1. 通过 GitHub Issues 提交功能请求
2. 清晰描述功能的使用场景
3. 说明该功能如何改进项目

### 提交代码

#### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/ColinYYCC/ImageAutoInserter.git
cd ImageAutoInserter

# 安装依赖
npm install

# 安装 Python 依赖
pip install -r requirements-dev.txt

# 启动开发服务器
npm run dev
```

#### 代码规范

**TypeScript/JavaScript**
- 使用 ESLint 和 Prettier 进行代码格式化
- 运行 `npm run lint` 检查代码质量
- 运行 `npm run format` 自动格式化代码
- 所有代码必须有类型定义，禁止使用 `any`

**Python**
- 使用 Black 进行代码格式化
- 使用 Flake8 进行代码检查
- 使用 MyPy 进行类型检查
- 遵循 PEP 8 规范

**通用规范**
- 函数长度不超过 50 行
- 文件长度不超过 800 行
- 嵌套深度不超过 4 层
- 所有公共 API 必须有文档注释
- 提交信息遵循 Conventional Commits 规范

#### 提交 Pull Request

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: 添加某个很棒的功能'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

**PR 要求**
- 所有测试必须通过
- 代码覆盖率不低于 80%
- 必须通过 ESLint 和 Prettier 检查
- 必须有清晰的 PR 描述

#### 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

**示例**
```
feat(auth): 添加第三方登录功能

- 支持 GitHub 登录
- 支持 Google 登录
- 添加用户授权流程

Closes #123
```

### 测试

```bash
# 运行单元测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行 E2E 测试
npx playwright test
```

### 代码审查

所有 PR 都需要经过代码审查才能合并。审查者会检查：

- 代码质量和可读性
- 测试覆盖率
- 文档完整性
- 安全性
- 性能影响

## 行为准则

请阅读并遵守我们的 [行为准则](CODE_OF_CONDUCT.md)。

## 许可证

通过贡献代码，你同意你的代码将按照 [ISC 许可证](LICENSE) 进行授权。

## 联系方式

- GitHub Issues: https://github.com/ColinYYCC/ImageAutoInserter/issues
- GitHub Discussions: https://github.com/ColinYYCC/ImageAutoInserter/discussions

---

再次感谢你的贡献！🎉
