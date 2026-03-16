# Trae Skills 集成指南

本文档说明如何在 Trae 中安装和使用从 GitHub 仓库获取的 skills。

## 已安装的 Skills

### 1. Frontend Design 前端设计 ⭐ NEW (来自 Anthropic 官方)

**来源:** https://github.com/anthropics/claude-code (来自 Anthropic 官方)

**安装位置:** `.trae/skills/frontend-design/`

**功能:**
创建独特、高质量的前端界面，避免通用的"AI 生成"美学。专注于生产级代码和出色的设计质量。

**核心理念:**
- **大胆的美学方向**: 选择极端风格 (极简、极繁、复古未来、有机自然、奢华精致等)
- **清晰的概念方向**: 精确执行选择的愿景
- **令人难忘的设计**: 创造独特的记忆点
- **Production-grade 代码**: 功能完整、视觉出色

**美学指南:**
- **字体排印**: 选择独特、有特色的字体，避免通用字体 (Inter, Arial, Roboto)
- **颜色与主题**: 主导色 + 锐利强调色，避免紫色渐变 + 白背景
- **动效**: 高影响力时刻，编排良好的页面加载
- **空间构成**: 不对称、重叠、对角线流、打破网格
- **背景与细节**: 渐变网格、噪点纹理、几何图案、分层透明度

**触发场景:**
- 创建落地页 → 自动激活
- 设计仪表板 → 自动激活
- 构建 UI 组件 → 自动激活
- 需要独特前端设计 → 自动激活

**反模式 (绝对避免):**
- ❌ 通用 AI 字体 (Inter, Roboto, Arial, system fonts)
- ❌ 紫色渐变 + 白色背景
- ❌ 可预测的布局
- ❌ 缺乏特色的模板化设计

**详细指南:** [FRONTEND-DESIGN-GUIDE.md](../FRONTEND-DESIGN-GUIDE.md)

---

### 3. Code Simplifier 代码简化 ⭐ NEW (来自 Anthropic 官方)

**来源:** https://github.com/anthropics/claude-plugins-official

**安装位置:** `.trae/skills/code-simplifier/`

**功能:**
简化和优化代码，提高清晰度、一致性和可维护性，同时保留所有功能。专注于最近修改的代码，除非另有指示。

**核心原则:**
- **Preserve Functionality**: 不改变代码功能 - 只改变实现方式
- **Apply Project Standards**: 遵循项目编码标准 (ES 模块、函数关键字、显式返回类型等)
- **Enhance Clarity**: 简化代码结构，减少不必要的复杂性和嵌套
- **Maintain Balance**: 避免过度简化，保持代码可读性和可维护性
- **Focus Scope**: 仅优化最近修改的代码

**优化重点:**
- 减少不必要的复杂性和嵌套
- 消除冗余代码和抽象
- 改进变量和函数命名的可读性
- 整合相关逻辑
- 移除描述明显代码的不必要注释
- 避免嵌套三元运算符 (优先使用 switch 或 if/else)
- 选择清晰度而非简洁性

**触发场景:**
- 代码编写完成后 → 自动激活
- 修改现有代码后 → 自动激活
- 需要代码重构时 → 自动激活
- 提高代码可维护性 → 自动激活

**反模式 (避免):**
- ❌ 过度简化导致代码难以理解
- ❌ 过度聪明的解决方案
- ❌ 将太多关注点合并到单个函数中
- ❌ 移除有助于代码组织的抽象
- ❌ 为了"更少行数"而牺牲可读性

---

### 4. Find Skills 技能发现 ⭐ NEW (来自 Vercel Labs)

**来源:** https://github.com/vercel-labs/skills

**安装位置:** `.trae/skills/find-skills/`

**功能:**
帮助发现和安装来自开放技能生态系统的技能。当用户询问"如何做某事"或"有没有技能可以..."时自动激活。

**核心能力:**
- **技能发现**: 使用 `npx skills find [query]` 搜索技能
- **技能安装**: 使用 `npx skills add <package>` 安装技能
- **技能检查**: 使用 `npx skills check` 检查技能更新
- **技能更新**: 使用 `npx skills update` 更新所有已安装技能

**触发场景:**
- 用户询问"如何做 X" → 自动激活
- 用户说"为 X 找个技能" → 自动激活
- 用户询问"你能做 X 吗"(X 是 specialized 能力) → 自动激活
- 用户想扩展 agent 能力 → 自动激活
- 用户需要搜索工具/模板/工作流 → 自动激活
- 用户提到希望在特定领域得到帮助 → 自动激活

**常见技能类别:**

| 类别 | 示例查询 |
|------|---------|
| Web 开发 | react, nextjs, typescript, css, tailwind |
| 测试 | testing, jest, playwright, e2e |
| DevOps | deploy, docker, kubernetes, ci-cd |
| 文档 | docs, readme, changelog, api-docs |
| 代码质量 | review, lint, refactor, best-practices |
| 设计 | ui, ux, design-system, accessibility |
| 生产力 | workflow, automation, git |

**使用方法:**
```bash
# 搜索技能
npx skills find react performance

# 安装技能
npx skills add vercel-labs/agent-skills@vercel-react-best-practices -g -y

# 检查更新
npx skills check

# 更新所有技能
npx skills update
```

**浏览技能:** https://skills.sh/

---

### 5. Best Minds 专家思维模拟 ⭐ NEW

**来源:** https://github.com/ceeon/best-minds

**安装位置:** `.trae/skills/best-minds/`

**功能:**
基于 Andrej Karpathy 的"模拟器思维":不问"你怎么看",而是问"这个问题，世界上谁最懂?TA 会怎么说?"。然后模拟那个人。

**核心理念:**
> "Don't think of LLMs as entities but as simulators." — Andrej Karpathy

**核心原则:**
1. **问题决定人数** - 一个人够就一个，需要碰撞才多个
2. **找真正最懂的** - 不是找"合适的",是找"最强的"
3. **基于真实** - 模拟要基于 TA 公开的思想、著作、言论
4. **引用原话** - 尽可能用 TA 说过的话

**触发场景:**
- 需要专家视角分析问题时 → 自动激活
- 面对复杂决策需要多角度思考 → 自动激活
- 解决需要深度专业知识的难题 → 自动激活
- 进行战略规划和前瞻性分析 → 自动激活

**vs ai-coaches:**

| ai-coaches | best-minds |
|------------|------------|
| 从 13 个预设智者选 | 从全世界找 |
| 基于关键词匹配 | 基于问题本质 |

**使用示例:**
```
用户：这个架构问题，谁最懂？
AI: 让我模拟一下 Martin Fowler 会怎么分析这个架构问题...
```

---

### 2. UI/UX Pro Max 设计智能 ⭐ NEW

**来源:** https://github.com/nextlevelbuilder/ui-ux-pro-max-skill

**安装位置:** `.trae/skills/ui-ux-pro-max/`

**功能:**
为 UI/UX 设计、构建、审查任务提供专业设计智能支持。包含 50+ 样式、97 种配色、57 种字体配对、99 条 UX 指南、25 种图表类型，覆盖 9 个技术栈。

**核心能力:**
- **智能设计系统生成**: 分析项目需求，自动生成完整设计系统
- **设计系统持久化**: 保存 MASTER.md 和页面覆盖，支持跨会话检索
- **领域搜索**: 按 style/color/typography/ux/chart 等领域详细搜索
- **技术栈指南**: React/Vue/Tailwind/Flutter 等 9 个栈的最佳实践

**触发场景:**
- 设计/构建 UI 界面 → 自动激活
- 审查/改进 UX → 自动激活
- 询问配色/字体/样式 → 自动激活
- 需要响应式布局 → 自动激活

**使用方法:**
```bash
# 生成设计系统
python3 .trae/skills/ui-ux-pro-max/scripts/search.py "<产品> <行业>" --design-system -p "项目名"

# 按领域搜索
python3 .trae/skills/ui-ux-pro-max/scripts/search.py "关键词" --domain style

# 持久化设计系统
python3 .trae/skills/ui-ux-pro-max/scripts/search.py "query" --design-system --persist -p "Project"
```

**详细指南:** [UI-UX-PRO-MAX-GUIDE.md](../UI-UX-PRO-MAX-GUIDE.md)

---

### 2. Superpowers 技能框架

**来源:** https://github.com/obra/superpowers

**安装位置:** `.trae/skills/superpowers/`

**包含的技能:**
- `brainstorming` - 需求探索和设计
- `writing-plans` - 任务拆分和计划编写
- `test-driven-development` - TDD 循环
- `using-git-worktrees` - Git 工作树管理
- `systematic-debugging` - 4 阶段调试流程
- `verification-before-completion` - 完成前验证
- `requesting-code-review` - 代码审查
- `finishing-a-development-branch` - 分支合并
- `dispatching-parallel-agents` - 并行子代理
- `executing-plans` - 计划执行
- `receiving-code-review` - 接收审查反馈
- `subagent-driven-development` - 子代理驱动开发
- `writing-skills` - 编写新技能

**使用方法:**
这些技能会自动触发。当你:
- 提出新需求 → `brainstorming` 自动激活
- 开始实现功能 → `test-driven-development` 自动激活
- 遇到 bug → `systematic-debugging` 自动激活
- 完成任务 → `verification-before-completion` 自动激活

### 2. Humanizer 技能

**来源:** https://github.com/blader/humanizer

**安装位置:** `.trae/skills/humanizer/`

**功能:**
移除 AI 生成文本的痕迹，使文档更自然、更人性化。基于 Wikipedia 的"AI 写作特征"指南，可检测并修复 24 种 AI 写作模式。

**检测的模式包括:**
- 意义夸大 ("pivotal moment", "testament to")
-  superficial -ing 分析 ("symbolizing", "reflecting")
- 推广语言 ("nestled within", "breathtaking")
- AI 词汇 ("Additionally", "crucial", "landscape")
- 连字符过度使用
- 三段式规则
- 表情符号滥用
- 等等...

**使用方法:**
自动应用于所有文档生成和修改操作，无需手动调用。

**示例:**

**Before (AI 风格):**
> Great question! AI-assisted coding serves as an enduring testament to the transformative potential of large language models, marking a pivotal moment in the evolution of software development.

**After (人性化):**
> AI coding assistants can speed up the boring parts of the job. They're great at boilerplate: config files and the little glue code you don't want to write.

### 3. Evolver 技能

**来源:** https://github.com/EvoMap/evolver

**安装位置:** `.trae/skills/evolver/`

**功能:**
AI 代理的自我进化引擎。分析运行时历史，识别改进机会，并应用协议约束的进化。

**核心特性:**
- 自动日志分析
- 自我修复指导
- GEP 协议 (基因组进化协议)
- 可配置的进化策略
- 信号去重

**使用方法:**
当需要自我优化时自动激活。

**配置选项:**
```bash
EVOLVE_STRATEGY=balanced    # 平衡策略 (默认)
EVOLVE_STRATEGY=innovate    # 最大化新功能
EVOLVE_STRATEGY=harden      # 专注于稳定性
EVOLVE_STRATEGY=repair-only # 紧急修复模式
```

## 技能自动触发机制

所有技能已配置为在 Trae 中自动触发。触发规则如下:

### UI/UX 设计技能

| 场景 | 自动触发的技能 | 说明 |
|------|--------------|------|
| **所有 UI/UX 设计、构建、审查任务** | `ui-ux-pro-max` | **自动应用**,提供专业 UI/UX 设计智能支持 |

### Superpowers 技能 (工程实践)

| 场景 | 自动触发的技能 | 说明 |
|------|--------------|------|
| 用户提出新需求 | `brainstorming` | 探索需求、提出方案、分章节设计 |
| 设计获批后 | `writing-plans` | 拆分为 2-5 分钟原子任务 |
| 开始实现功能 | `test-driven-development` | RED-GREEN-REFACTOR 循环 |
| 创建新分支 | `using-git-worktrees` | 隔离工作环境 |
| 遇到 bug/测试失败 | `systematic-debugging` | 4 阶段根因分析 |
| 任务完成后 | `verification-before-completion` | 运行所有测试验证 |
| 提交代码前 | `requesting-code-review` | 对照计划审查代码 |

### 文档质量技能

| 场景 | 自动触发的技能 | 说明 |
|------|--------------|------|
| **所有文档生成和修改操作** | `humanizer` | 移除 AI 生成痕迹 |

### 自我进化技能

| 场景 | 自动触发的技能 | 说明 |
|------|--------------|------|
| 需要自我优化 | `evolver` | 分析历史并应用进化 |

## 手动调用技能

虽然技能会自动触发，但你也可以手动调用:

### 在 Trae 中使用 Skill 工具

```
使用 Skill 工具调用相应技能
```

例如:
- 调用 brainstorming: 使用 `Skill` 工具，name="brainstorming"
- 调用 humanizer: 使用 `Skill` 工具，name="humanizer"

## 技能目录结构

```
.trae/skills/
├── frontend-design/      # Frontend Design 前端设计 (来自 Anthropic 官方)
│   └── SKILL.md
├── code-simplifier/      # Code Simplifier 代码简化 (来自 Anthropic 官方)
│   └── SKILL.md
├── find-skills/          # Find Skills 技能发现 (来自 Vercel Labs)
│   └── SKILL.md
├── best-minds/           # Best Minds 专家思维模拟 (来自 ceeon)
│   └── SKILL.md
├── ui-ux-pro-max/        # UI/UX Pro Max 设计智能 (NEW!)
│   ├── data/             # 设计数据 (CSV): styles, colors, typography, ux...
│   ├── scripts/          # Python 搜索工具
│   └── SKILL.md
├── superpowers/          # Superpowers 技能框架 (14 个技能)
│   ├── brainstorming/
│   ├── writing-plans/
│   ├── test-driven-development/
│   ├── systematic-debugging/
│   ├── verification-before-completion/
│   ├── requesting-code-review/
│   ├── using-git-worktrees/
│   ├── finishing-a-development-branch/
│   ├── dispatching-parallel-agents/
│   ├── executing-plans/
│   ├── subagent-driven-development/
│   ├── receiving-code-review/
│   └── writing-skills/
├── humanizer/            # Humanizer 文档优化技能
│   └── SKILL.md
└── evolver/              # Evolver 自我进化技能
    └── SKILL.md
```

## 更新技能

### Superpowers
```bash
cd /tmp/temp_superpowers
git pull
cp -r skills/* /Users/shimengyu/Documents/trae_projects/ImageAutoInserter/.trae/skills/superpowers/
```

### Humanizer
```bash
cd /Users/shimengyu/Documents/trae_projects/ImageAutoInserter/.trae/skills/humanizer
git clone https://github.com/blader/humanizer.git temp
cp temp/SKILL.md ./SKILL.md
rm -rf temp
```

### Evolver
```bash
cd /tmp/temp_evolver
git pull
cp SKILL.md /Users/shimengyu/Documents/trae_projects/ImageAutoInserter/.trae/skills/evolver/SKILL.md
```

## 验证安装

可以通过以下方式验证技能是否正确安装:

1. 提出一个新需求，观察 `brainstorming` 是否自动激活
2. 要求实现一个功能，观察 `test-driven-development` 是否自动激活
3. 生成一段文档，观察 `humanizer` 是否自动应用

## 故障排除

### 技能未自动触发

检查:
1. 技能文件是否在正确位置 (`.trae/skills/<技能名>/SKILL.md`)
2. 技能文件是否有正确的元数据头 (name, description 等)
3. Trae 是否有权限读取技能文件

### Humanizer 未生效

确保:
1. `.trae/skills/humanizer/SKILL.md` 文件存在
2. 在生成文档时没有明确禁用技能

### Evolver 报错

检查:
1. 项目是否有 git 仓库 (evolver 需要 git)
2. Node.js 版本是否 >= 18
3. 环境变量配置是否正确

## 相关资源

- [UI/UX Pro Max 官方文档](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- [Superpowers 官方文档](https://github.com/obra/superpowers)
- [Humanizer 官方文档](https://github.com/blader/humanizer)
- [Evolver 官方文档](https://github.com/EvoMap/evolver)
- [项目规则文档](../rules/project_rules.md)
- [UI/UX Pro Max 使用指南](../UI-UX-PRO-MAX-GUIDE.md)

## 版本信息

**最后更新:** 2024-01-15  
**技能版本:**
- Frontend Design: v1.0 (来自 Anthropic 官方)
- UI/UX Pro Max: v2.0 (设计智能)
- Superpowers: v1.0 (从 main 分支获取)
- Humanizer: v2.2.0
- Evolver: v1.0 (从 main 分支获取)

**技能统计:**
- 总技能数：22 个
  - Frontend Design: 1 个 (来自 Anthropic 官方，专注独特前端设计)
  - Code Simplifier: 1 个 (来自 Anthropic 官方，专注代码优化)
  - Find Skills: 1 个 (来自 Vercel Labs，专注技能发现)
  - Best Minds: 1 个 (来自 ceeon，专家思维模拟) ⭐ NEW
  - UI/UX Pro Max: 1 个 (包含 50+ 样式、97 配色、9 技术栈)
  - Superpowers: 14 个
  - Humanizer: 1 个
  - Evolver: 1 个 (包含 GEP 协议)
