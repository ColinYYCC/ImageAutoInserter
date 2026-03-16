# ADR-002: 为什么选择 React 而非 Vue/Svelte

**状态**: ✅ 接受  
**日期**: 2026-03-08  
**类型**: 技术栈选型  
**影响范围**: UI 框架、组件开发模式、状态管理方案

---

## 背景

ImageAutoInserter 项目需要选择一个前端 UI 框架来构建桌面应用的用户界面。

### 项目需求

- **简单 UI**: 主界面包含文件选择器、进度条、结果视图三个主要部分
- **状态管理**: 需要管理应用状态（IDLE → READY → PROCESSING → COMPLETE/ERROR）
- **TypeScript**: 需要使用 TypeScript 提供类型安全
- **团队技能**: 团队有 React 开发经验
- **Electron 集成**: 需要与 Electron 的 IPC 机制良好集成

### 候选方案

我们考虑了以下三个主流前端框架：

1. **React 18** - Meta 开发的声明式 UI 库
2. **Vue 3** - 渐进式 JavaScript 框架
3. **Svelte** - 编译时框架

---

## 决策

选择 **React 18** 作为 UI 框架。

### 技术栈详情

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "typescript": "^5.0.0"
}
```

### 开发模式

采用 **函数组件 + Hooks** 的开发模式：

- 使用 `useState` 管理组件状态
- 使用 `useReducer` 管理应用级状态
- 使用 `useEffect` 处理副作用
- 使用 `useCallback` 和 `useMemo` 优化性能

---

## 考虑因素

### React 优势 ✅

| 优势 | 说明 | 重要性 |
|------|------|--------|
| **生态最大** | npm 上有最多的 React 组件和库 | 🔴 高 |
| **社区最活跃** | Stack Overflow、GitHub 上有大量资源 | 🔴 高 |
| **团队熟悉** | 团队有 React 开发经验 | 🔴 高 |
| **TypeScript 支持** | TypeScript 支持最好，类型定义完善 | 🔴 高 |
| **Electron 集成** | Electron 官方示例多用 React | 🟡 中 |
| **招聘容易** | React 开发者最多 | 🟡 中 |
| **长期支持** | Meta 支持和维护 | 🟡 中 |

### React 劣势 ❌

| 劣势 | 影响 | 缓解措施 |
|------|------|----------|
| **学习曲线** | Hooks 概念需要时间理解 | 团队已有经验，影响小 |
| **样板代码** | 相比 Vue/Svelte 代码量略多 | 使用代码片段模板 |
| **性能** | 虚拟 DOM 有性能开销 | 使用 React.memo 优化 |

### Vue 3 优势 ✅

| 优势 | 说明 | 实际价值 |
|------|------|----------|
| **易上手** | 模板语法直观，学习曲线低 | 团队已熟悉 React，价值不高 |
| **代码简洁** | 相比 React 代码量少 | 项目简单，代码量差异不大 |
| **响应式系统** | 自动追踪依赖 | React 手动优化也可达到类似效果 |
| **中文文档** | 中文文档完善 | React 中文文档也较完善 |

### Vue 3 劣势 ❌

| 劣势 | 影响 | 严重性 |
|------|------|--------|
| **生态较小** | 组件库数量少于 React | 🟡 中 |
| **TypeScript 支持** | 虽有好转但仍不如 React | 🟡 中 |
| **团队不熟悉** | 需要学习时间 | 🔴 高 |
| **Electron 示例少** | 官方示例多用 React | 🟡 中 |

### Svelte 优势 ✅

| 优势 | 说明 | 实际价值 |
|------|------|----------|
| **无虚拟 DOM** | 编译为原生 JS，性能好 | 项目简单，性能差异不明显 |
| **代码最少** | 语法简洁，代码量少 | 有一定吸引力 |
| **易学习** | 概念简单，上手快 | 团队已熟悉 React，价值不高 |
| **打包体积小** | 运行时库很小 | 项目使用 Electron，体积差异可忽略 |

### Svelte 劣势 ❌

| 劣势 | 影响 | 严重性 |
|------|------|--------|
| **生态最小** | 组件和库选择少 | 🔴 高 |
| **社区小** | 问题难找答案 | 🔴 高 |
| **团队不熟悉** | 需要学习时间 | 🔴 高 |
| **企业采用少** | 生产环境案例少 | 🟡 中 |
| **TypeScript 支持** | 支持较弱 | 🟡 中 |

---

## 决策理由

### 1. 团队技能匹配

**现状**: 团队有 React 开发经验，熟悉 Hooks 模式

**React**: 可立即开始开发，无需学习成本

**Vue/Svelte**: 需要 1-2 周学习时间，延迟项目进度

**结论**: React 与团队技能最匹配。

### 2. 生态和组件选择

**React**:
- npm 上有大量 React 组件（材料 UI、Ant Design 等）
- 遇到问题容易找到解决方案
- 有大量开源项目可参考

**Vue**:
- 组件库数量中等（Element Plus、Vuetify 等）
- 社区资源较丰富

**Svelte**:
- 组件库较少
- 遇到问题可能需要自己解决

**结论**: React 生态最丰富，开发效率最高。

### 3. TypeScript 支持

**React**:
- TypeScript 支持最好
- 类型定义完善
- IDE 智能提示准确

**Vue 3**:
- TypeScript 支持有改进
- 但模板中的类型检查仍不如 React

**Svelte**:
- TypeScript 支持较弱
- 类型推断不够智能

**结论**: React 的 TypeScript 体验最佳。

### 4. Electron 集成

**React**:
- Electron 官方示例使用 React
- `electron-react-boilerplate` 等成熟模板
- 大量 Electron + React 开源项目

**Vue**:
- 有 `electron-vue` 模板
- 但社区活跃度不如 React

**Svelte**:
- 有 `svelte-electron` 模板
- 但示例和资源较少

**结论**: React 与 Electron 集成最成熟。

### 5. 项目适配性

**项目特点**:
- UI 简单（文件选择、进度条、结果展示）
- 状态管理需求明确（状态机模式）
- 不需要复杂动画和交互

**React 适配性**:
- 函数组件适合简单 UI
- useReducer 适合状态机管理
- 性能满足需求

**结论**: React 完全满足项目需求。

---

## 后果

### ✅ 正面影响

1. **开发效率高**
   - 团队可立即开始开发
   - 组件选择多，减少重复造轮子
   - 问题容易找到解决方案

2. **代码质量高**
   - TypeScript 类型安全
   - 组件化开发，代码复用性好
   - 易于测试和维护

3. **招聘容易**
   - React 开发者众多
   - 降低招聘成本

4. **长期维护有保障**
   - React 有 Meta 支持
   - 生态稳定，不易过时

5. **与 Electron 集成顺畅**
   - 官方示例和文档丰富
   - 容易找到最佳实践

### ⚠️ 负面影响

1. **代码量略多**
   - 相比 Vue/Svelte，React 代码量多 10-20%
   - 需要编写更多样板代码

2. **性能需要考虑**
   - 虚拟 DOM 有性能开销
   - 需要使用 React.memo 等优化手段

3. **Hooks 陷阱**
   - useEffect 依赖数组容易出错
   - 需要遵循 Hooks 规则

### 📋 需要遵循的规范

#### 1. 组件开发模式

```typescript
// ✅ 推荐：函数组件 + Hooks
import React, { useState, useCallback } from 'react';

interface FilePickerProps {
  accept: string;
  onFileSelect: (path: string) => void;
}

export const FilePicker: React.FC<FilePickerProps> = ({ 
  accept, 
  onFileSelect 
}) => {
  const [filePath, setFilePath] = useState<string | null>(null);

  const handleSelect = useCallback(async () => {
    const path = await window.electronAPI.selectFile(accept);
    if (path) {
      setFilePath(path);
      onFileSelect(path);
    }
  }, [onFileSelect]);

  return (
    <div className="file-picker">
      <button onClick={handleSelect}>选择文件</button>
      {filePath && <span>{filePath}</span>}
    </div>
  );
};
```

#### 2. 状态管理规范

```typescript
// ✅ 推荐：useReducer 管理应用状态
import { useReducer } from 'react';

interface AppState {
  phase: 'IDLE' | 'READY' | 'PROCESSING' | 'COMPLETE' | 'ERROR';
  excelFile: string | null;
  imageSource: string | null;
  progress: number;
}

type Action = 
  | { type: 'SELECT_EXCEL'; payload: string }
  | { type: 'SELECT_IMAGES'; payload: string }
  | { type: 'START' }
  | { type: 'PROGRESS'; payload: number }
  | { type: 'COMPLETE' }
  | { type: 'ERROR' };

function appReducer(state: AppState, action: Action): AppState {
  // reducer 实现
}

export const useAppState = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return { state, dispatch };
};
```

#### 3. 性能优化规范

```typescript
// ✅ 推荐：使用 React.memo 避免不必要的重渲染
export const ProgressBar = React.memo(({ progress }: { progress: number }) => {
  return (
    <div className="progress-bar">
      <div className="progress" style={{ width: `${progress}%` }} />
    </div>
  );
});

// ✅ 推荐：使用 useMemo 缓存计算结果
const filteredItems = useMemo(() => {
  return items.filter(item => item.status === 'success');
}, [items]);

// ✅ 推荐：使用 useCallback 缓存函数
const handleClick = useCallback(() => {
  // 处理逻辑
}, [dependencies]);
```

#### 4. TypeScript 规范

```typescript
// ✅ 推荐：明确定义组件 Props 类型
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ 
  label, 
  onClick,
  disabled = false,
  variant = 'primary'
}) => {
  // 组件实现
};

// ✅ 推荐：使用类型守卫处理联合类型
function renderContent(phase: AppState['phase']) {
  switch (phase) {
    case 'IDLE':
      return <IdleView />;
    case 'READY':
      return <ReadyView />;
    // ...
  }
}
```

---

## 替代方案

### 替代方案 1: Vue 3

**适用场景**:
- 团队有 Vue 经验
- 项目需要快速原型
- 偏好模板语法

**不选择原因**:
- 团队不熟悉 Vue
- TypeScript 支持不如 React
- Electron 集成示例较少

### 替代方案 2: Svelte

**适用场景**:
- 对性能要求极高
- 项目规模小
- 愿意尝试新技术

**不选择原因**:
- 生态太小
- 社区不活跃
- 团队不熟悉

### 替代方案 3: Preact

**适用场景**:
- 对包体积敏感
- 需要 React API 但更小的体积

**不选择原因**:
- 项目使用 Electron，体积不是关键
- 生态比 React 小

---

## 参考链接

### 官方文档

- [React 官方文档](https://react.dev/)
- [React Hooks 文档](https://react.dev/reference/react)
- [TypeScript + React](https://react.dev/learn/typescript)
- [Vue 3 官方文档](https://vuejs.org/)
- [Svelte 官方文档](https://svelte.dev/)

### 学习资源

- [React 入门教程](https://react.dev/learn)
- [React Patterns](https://reactpatterns.com/)
- [React TypeScript Cheat Sheet](https://react-typescript-cheatsheet.netlify.app/)

### 开源项目参考

- [electron-react-boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate)
- [VS Code (React)](https://github.com/microsoft/vscode)
- [GitHub Desktop (React)](https://github.com/desktop/desktop)

---

## 附录：决策过程记录

### 讨论时间线

- **2026-03-01**: 初步调研 React、Vue、Svelte
- **2026-03-03**: 团队内部讨论，评估各框架优劣势
- **2026-03-05**: 创建三个框架的原型项目
- **2026-03-07**: 最终决策会议，确定使用 React
- **2026-03-08**: 编写 ADR 文档

### 参与决策人员

- 后端架构师：负责技术评估
- 前端开发：负责框架对比
- 项目经理：负责项目周期评估

### 关键决策因素排序

1. 团队技能匹配度（最高优先级）
2. 生态和组件选择
3. TypeScript 支持
4. Electron 集成
5. 长期维护保障

---

**最后更新**: 2026-03-08  
**下次审查**: 2026-09-08（6 个月后）
