# 架构决策记录 (ADR) 合集

> **版本**: v1.0  
> **创建日期**: 2026-03-08  
> **维护者**: Backend Architect Team

---

## 什么是 ADR？

**ADR (Architecture Decision Record)** 是架构决策记录，用于记录项目中重要的架构决策及其背后的原因。

### ADR 的核心价值

1. **知识传承**: 帮助新团队成员理解"为什么这样设计"，而不仅仅是"是什么"
2. **决策追溯**: 当需要重新审视决策时，提供完整的历史背景和考虑因素
3. **避免重蹈覆辙**: 记录已考虑过的替代方案和否决原因，避免重复讨论
4. **透明度**: 让所有利益相关者理解决策背后的权衡

---

## ADR 文档结构

每个 ADR 包含以下核心部分：

| 部分 | 说明 |
|------|------|
| **状态** | 决策当前状态（接受/提议/废弃/已弃用） |
| **背景** | 为什么要做这个决定，面临的问题和约束 |
| **决策** | 我们最终选择做什么 |
| **考虑因素** | 考虑过的替代方案及其优缺点 |
| **决策理由** | 为什么选择这个方案 |
| **后果** | 这个决定的正面和负面影响 |
| **参考链接** | 相关文档和资源 |

---

## 如何使用 ADR

### 阅读 ADR

1. 从下表选择需要了解的决策主题
2. 点击链接进入详细文档
3. 理解决策背景和权衡考虑

### 创建新 ADR

当遇到以下情况时，应创建新的 ADR：

- 技术栈选型（框架、库、工具）
- 架构设计决策（分层、模块划分）
- 重要设计模式选择
- 性能优化策略
- 安全策略决策

**创建步骤**:
1. 复制 [adr-template.md](../adr-template.md) 模板
2. 编号规则：`ADR-XXX`（XXX 为三位数字，从 001 开始递增）
3. 文件命名：`XXX-决策主题.md`（使用小写和连字符）
4. 提交时更新本 README 的决策列表

### ADR 状态说明

| 状态 | 标识 | 说明 |
|------|------|------|
| **Accepted** | ✅ 接受 | 已采纳并实施的决策 |
| **Proposed** | 📋 提议 | 正在讨论中的决策 |
| **Deprecated** | ⚠️ 已弃用 | 已被新决策替代 |
| **Superseded** | 🔄 被替代 | 被更新的 ADR 替代 |
| **Rejected** | ❌ 已拒绝 | 讨论后未采纳 |

---

## 决策列表

### 技术栈选型

| 编号 | 标题 | 状态 | 日期 |
|------|------|------|------|
| [ADR-001](./001-why-electron.md) | 为什么选择 Electron 而非 Tauri | ✅ 接受 | 2026-03-08 |
| [ADR-002](./002-why-react.md) | 为什么选择 React 而非 Vue/Svelte | ✅ 接受 | 2026-03-08 |
| [ADR-003](./003-why-usereducer.md) | 为什么使用 useReducer 而非 Redux | ✅ 接受 | 2026-03-08 |

### 架构设计

| 编号 | 标题 | 状态 | 日期 |
|------|------|------|------|
| [ADR-004](./004-why-fixed-window-size.md) | 为什么固定窗口尺寸（800x600） | ✅ 接受 | 2026-03-08 |

### 功能范围

| 编号 | 标题 | 状态 | 日期 |
|------|------|------|------|
| [ADR-005](./005-why-exclude-drag-drop.md) | 为什么排除拖拽功能 | ✅ 接受 | 2026-03-08 |

---

## 决策主题索引

### 按类别查看

**🖥️ 桌面应用框架**
- [为什么选择 Electron](./001-why-electron.md) - 跨平台桌面应用开发框架选型

**⚛️ 前端框架**
- [为什么选择 React](./002-why-react.md) - UI 框架选型（React vs Vue vs Svelte）
- [为什么使用 useReducer](./003-why-usereducer.md) - 状态管理方案选择

**🎨 UI/UX 设计**
- [为什么固定窗口尺寸](./004-why-fixed-window-size.md) - 窗口尺寸策略
- [为什么排除拖拽功能](./005-why-exclude-drag-drop.md) - 交互功能范围定义

---

## 相关文档

- [GUI 设计规格文档](../../specs/gui-redesign/spec.md)
- [GUI 设计任务分解](../../specs/gui-redesign/tasks.md)
- [GUI 设计验收清单](../../specs/gui-redesign/checklist.md)
- [数据流图](../data-flow.md)
- [性能基准测试](../../testing/performance-benchmark.md)

---

## 维护指南

### 更新 ADR

当以下情况发生时，应更新现有 ADR：

1. **决策被推翻**: 创建新的 ADR 替代旧决策，并在旧 ADR 中添加"被替代"状态和链接
2. **实施细节变化**: 在对应 ADR 的"后果"部分添加补充说明
3. **发现新的替代方案**: 在"考虑因素"部分补充说明

### ADR 生命周期

```
提议 → 讨论 → 接受 → 实施 → (可能) 被替代/被弃用
```

### 版本控制

- ADR 文档应随代码一起纳入版本控制
- 每个 ADR 的变更应有清晰的提交历史
- 重大决策变更应通过 Pull Request 审核

---

## 参考资源

### ADR 相关资料

- [Michael Nygard 的 ADR 模板](https://github.com/joelparkerhenderson/architecture-decision-record)
- [ThoughtWorks ADR 实践](https://thoughtworks.com/radar/techniques/architecture-decision-records)
- [ADR GitHub 模板仓库](https://github.com/adr/mk)

### 本项目相关

- [项目主文档](../../../README.md)
- [开发规范](../../../.trae/rules/trae-programming-rules.md)

---

**最后更新**: 2026-03-08
