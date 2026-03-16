# ADR-003: 为什么使用 useReducer 而非 Redux

**状态**: ✅ 接受  
**日期**: 2026-03-08  
**类型**: 架构设计  
**影响范围**: 状态管理方案、代码组织、测试策略

---

## 背景

ImageAutoInserter 项目需要管理应用的全局状态，包括：
- 应用阶段状态（IDLE → READY → PROCESSING → COMPLETE → ERROR）
- 文件选择状态（Excel 文件路径、图片源路径）
- 处理进度状态（进度百分比、当前处理项）
- 统计结果状态（总数、成功数、失败数、成功率）

### 项目需求

- **状态逻辑清晰**: 状态转换遵循状态机模式
- **代码简洁**: 项目规模小，不希望过度设计
- **类型安全**: 使用 TypeScript 提供完整类型支持
- **易于测试**: 状态逻辑可独立测试
- **无额外依赖**: 尽量减少第三方库依赖

### 候选方案

我们考虑了以下状态管理方案：

1. **useReducer** - React 内置的状态管理 Hook
2. **Redux Toolkit** - 流行的状态管理库
3. **Zustand** - 轻量级状态管理库
4. **Context + useState** - 最简单的 React 状态管理

---

## 决策

选择 **useReducer** 作为状态管理方案。

### 技术栈详情

```typescript
// 不使用任何第三方状态管理库
// 仅使用 React 内置的 useReducer Hook

import { useReducer, createContext, useContext } from 'react';
```

### 架构模式

采用 **状态机 + useReducer** 的模式：

```typescript
// 状态定义
interface AppState {
  phase: 'IDLE' | 'READY' | 'PROCESSING' | 'COMPLETE' | 'ERROR';
  excelFile: string | null;
  imageSource: string | null;
  progress: number;
  stats: Stats | null;
}

// Action 类型定义
type AppAction =
  | { type: 'SELECT_EXCEL'; payload: string }
  | { type: 'SELECT_IMAGES'; payload: string }
  | { type: 'START' }
  | { type: 'PROGRESS'; payload: { percent: number; current: string } }
  | { type: 'COMPLETE'; payload: Stats }
  | { type: 'ERROR'; payload: ErrorInfo }
  | { type: 'RESET' };

// Reducer 函数
function appReducer(state: AppState, action: AppAction): AppState {
  // 纯函数，根据当前状态和 action 返回新状态
}
```

---

## 考虑因素

### useReducer 优势 ✅

| 优势 | 说明 | 重要性 |
|------|------|--------|
| **零依赖** | React 内置，无需安装额外库 | 🔴 高 |
| **代码简洁** | 相比 Redux 代码量少 60%+ | 🔴 高 |
| **类型安全** | TypeScript 支持完美 | 🔴 高 |
| **状态机友好** | 适合管理有明确状态转换的应用 | 🔴 高 |
| **易于测试** | Reducer 是纯函数，易于单元测试 | 🟡 中 |
| **学习成本低** | 团队熟悉 React Hooks | 🟡 中 |

### useReducer 劣势 ❌

| 劣势 | 影响 | 缓解措施 |
|------|------|----------|
| **不适合复杂应用** | 状态多了难以管理 | 项目简单，不适用此问题 |
| **无 DevTools** | 无法使用 Redux DevTools | 项目简单，不需要 |
| **需手动传递** | 需要通过 Context 传递 | 封装自定义 Hook 解决 |

### Redux Toolkit 优势 ✅

| 优势 | 说明 | 实际价值 |
|------|------|----------|
| **DevTools** | 有时间旅行调试功能 | 项目简单，价值不高 |
| **中间件** | 支持 Redux Thunk、Saga | 项目不需要复杂副作用管理 |
| **生态丰富** | 有大量插件和工具 | 项目简单，不需要 |
| **可预测** | 严格的状态管理流程 | useReducer 也可达到类似效果 |

### Redux Toolkit 劣势 ❌

| 劣势 | 影响 | 严重性 |
|------|------|--------|
| **样板代码多** | 需要定义 slice、action、reducer | 🔴 高 |
| **学习曲线** | 概念较多（store、dispatch、selector） | 🟡 中 |
| **依赖库多** | 需要安装 @reduxjs/toolkit、react-redux | 🟡 中 |
| **过度设计** | 对简单项目来说过于复杂 | 🔴 高 |

### Zustand 优势 ✅

| 优势 | 说明 | 实际价值 |
|------|------|----------|
| **API 简洁** | 比 Redux 简单很多 | 有一定吸引力 |
| **无需 Provider** | 直接使用 hook | 便利性一般 |
| **体积小** | 包体积很小 | 项目使用 Electron，价值不高 |

### Zustand 劣势 ❌

| 劣势 | 影响 | 严重性 |
|------|------|--------|
| **额外依赖** | 需要安装第三方库 | 🟡 中 |
| **生态小** | 不如 Redux 成熟 | 🟡 中 |
| **类型支持** | TypeScript 支持不如 Redux | 🟡 中 |

### Context + useState 优势 ✅

| 优势 | 说明 | 实际价值 |
|------|------|----------|
| **最简单** | 无需学习新概念 | 有一定吸引力 |
| **零依赖** | React 内置功能 | 与 useReducer 相同 |

### Context + useState 劣势 ❌

| 劣势 | 影响 | 严重性 |
|------|------|--------|
| **状态分散** | 多个 useState 导致状态分散 | 🔴 高 |
| **逻辑不集中** | 状态更新逻辑分散在各处 | 🔴 高 |
| **不易维护** | 状态转换逻辑不清晰 | 🔴 高 |

---

## 决策理由

### 1. 项目规模适配

**项目状态复杂度**:
- 状态字段：5 个（phase、excelFile、imageSource、progress、stats）
- Action 类型：7 个（SELECT_EXCEL、SELECT_IMAGES、START、PROGRESS、COMPLETE、ERROR、RESET）
- 状态转换：简单的状态机模式

**useReducer 适配性**:
- 完全能够管理此规模的状态
- 代码量适中（约 100 行）
- 状态转换逻辑集中清晰

**Redux 适配性**:
- 对于此规模项目过于复杂
- 需要编写大量样板代码
- 增加不必要的复杂度

**结论**: useReducer 与项目规模最匹配。

### 2. 代码简洁性对比

**useReducer 实现**（约 100 行）:

```typescript
// 定义状态和 action
type AppState = { /* ... */ };
type AppAction = { /* ... */ };

// reducer 函数
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SELECT_EXCEL':
      return { ...state, excelFile: action.payload };
    // ... 其他 case
  }
}

// 自定义 Hook
export const useAppState = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return { state, dispatch };
};
```

**Redux Toolkit 实现**（约 250 行）:

```typescript
// 需要创建 slice
const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    selectExcel: (state, action) => { /* ... */ },
    // ... 其他 reducers
  }
});

// 需要创建 store
const store = configureStore({
  reducer: {
    app: appSlice.reducer
  }
});

// 需要创建 Provider
<Provider store={store}>
  <App />
</Provider>

// 组件中使用
const dispatch = useDispatch();
const state = useSelector(selectAppState);
```

**结论**: useReducer 代码量减少 60%，更简洁。

### 3. 类型安全对比

**useReducer**:

```typescript
// 类型定义清晰
type AppState = { /* ... */ };
type AppAction = 
  | { type: 'SELECT_EXCEL'; payload: string }
  | { type: 'START' };

// TypeScript 完全推断
function appReducer(state: AppState, action: AppAction): AppState {
  // action.type 有智能提示
  // action.payload 类型正确
}
```

**Redux Toolkit**:

```typescript
// 需要额外定义类型
type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;

// 需要使用类型钩子
const useAppDispatch = () => useDispatch<AppDispatch>();
const useAppSelector = <TSelected = unknown>(
  selector: (state: RootState) => TSelected
) => useSelector<RootState, TSelected>(selector);
```

**结论**: useReducer 类型定义更简洁直接。

### 4. 状态机模式适配

**项目状态转换**:

```
IDLE → READY (选择 Excel)
READY → READY (选择图片)
READY → PROCESSING (开始处理)
PROCESSING → PROCESSING (进度更新)
PROCESSING → COMPLETE (处理完成)
PROCESSING → ERROR (发生错误)
COMPLETE → IDLE (重置)
ERROR → IDLE (重置)
```

**useReducer 实现状态机**:

```typescript
function appReducer(state: AppState, action: AppAction): AppState {
  switch (state.phase) {
    case 'IDLE':
      switch (action.type) {
        case 'SELECT_EXCEL':
          return { ...state, phase: 'READY', excelFile: action.payload };
        default:
          return state;
      }
    
    case 'READY':
      switch (action.type) {
        case 'SELECT_IMAGES':
          return { ...state, imageSource: action.payload };
        case 'START':
          return { ...state, phase: 'PROCESSING' };
        default:
          return state;
      }
    
    // ... 其他状态处理
  }
}
```

**优势**:
- 状态转换逻辑集中
- 类型安全，TypeScript 会检查未处理的 action
- 易于理解和维护

**结论**: useReducer 天然适合状态机模式。

### 5. 测试便利性

**useReducer 测试**:

```typescript
// Reducer 是纯函数，易于测试
describe('appReducer', () => {
  it('should handle SELECT_EXCEL', () => {
    const initialState = { phase: 'IDLE', excelFile: null };
    const action = { type: 'SELECT_EXCEL', payload: '/path/to/file.xlsx' };
    const newState = appReducer(initialState, action);
    
    expect(newState.phase).toBe('READY');
    expect(newState.excelFile).toBe('/path/to/file.xlsx');
  });
});
```

**Redux 测试**:
- 需要配置 store
- 需要额外的测试工具
- 测试代码更复杂

**结论**: useReducer 测试更简单直接。

---

## 后果

### ✅ 正面影响

1. **代码简洁**
   - 无需安装额外依赖
   - 代码量减少 60%+
   - 新开发者容易理解

2. **类型安全**
   - TypeScript 类型推断完美
   - 编译时检查状态转换
   - IDE 智能提示准确

3. **状态集中管理**
   - 所有状态更新逻辑在 reducer 中
   - 状态转换清晰可预测
   - 易于调试和维护

4. **易于测试**
   - Reducer 是纯函数
   - 无需配置 mock store
   - 测试代码简洁

5. **性能良好**
   - 无额外渲染开销
   - 状态更新高效
   - 内存占用小

### ⚠️ 负面影响

1. **无 DevTools**
   - 无法使用时间旅行调试
   - 无法查看 action 历史
   
   **缓解**: 项目简单，console.log 足够调试

2. **需手动优化**
   - 需要手动使用 React.memo
   - 需要手动优化渲染
   
   **缓解**: 使用 useCallback 和 useMemo 优化

3. **扩展性有限**
   - 状态复杂后难以管理
   - 不支持中间件
   
   **缓解**: 项目规模小，不涉及此问题

### 📋 需要遵循的规范

#### 1. Reducer 实现规范

```typescript
// ✅ 推荐：使用 switch statement
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SELECT_EXCEL': {
      // 使用代码块，避免变量污染
      const filePath = action.payload;
      return {
        ...state,
        excelFile: filePath,
        phase: 'READY'
      };
    }
    
    case 'PROGRESS': {
      // 只更新变化的字段
      return {
        ...state,
        progress: action.payload.percent
      };
    }
    
    default:
      return state;
  }
}
```

#### 2. Action 命名规范

```typescript
// ✅ 推荐：使用大写 + 下划线命名
type AppAction =
  | { type: 'SELECT_EXCEL'; payload: string }
  | { type: 'SELECT_IMAGES'; payload: string }
  | { type: 'START' }
  | { type: 'PROGRESS'; payload: ProgressInfo }
  | { type: 'COMPLETE'; payload: Stats }
  | { type: 'ERROR'; payload: ErrorInfo }
  | { type: 'RESET' };

// ❌ 不推荐：使用驼峰命名
type AppAction =
  | { type: 'selectExcel'; payload: string }  // 不推荐
```

#### 3. Context 封装规范

```typescript
// ✅ 推荐：封装 Context 和 Provider
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context;
};
```

#### 4. 性能优化规范

```typescript
// ✅ 推荐：子组件使用 React.memo
const ProgressBar = React.memo(({ progress }: { progress: number }) => {
  return <div style={{ width: `${progress}%` }} />;
});

// ✅ 推荐：回调函数使用 useCallback
const handleStart = useCallback(() => {
  dispatch({ type: 'START' });
}, []);

// ✅ 推荐：计算值使用 useMemo
const successRate = useMemo(() => {
  if (!stats || stats.total === 0) return 0;
  return (stats.success / stats.total) * 100;
}, [stats]);
```

---

## 替代方案

### 替代方案 1: Redux Toolkit

**适用场景**:
- 大型复杂应用
- 需要时间旅行调试
- 需要中间件支持（Thunk、Saga）
- 多团队大型项目

**不选择原因**:
- 项目简单，不需要
- 样板代码太多
- 增加不必要的复杂度

### 替代方案 2: Zustand

**适用场景**:
- 需要轻量级状态管理
- 不想使用 Context
- 需要更简洁的 API

**不选择原因**:
- 需要额外依赖
- 项目简单，useReducer 足够
- TypeScript 支持不如 useReducer

### 替代方案 3: Context + useState

**适用场景**:
- 状态非常简单
- 状态之间无关联

**不选择原因**:
- 状态更新逻辑分散
- 不利于状态机模式
- 难以维护

---

## 参考链接

### 官方文档

- [React useReducer 文档](https://react.dev/reference/react/useReducer)
- [React Context 文档](https://react.dev/learn/passing-data-deeply-with-context)
- [Redux Toolkit 文档](https://redux-toolkit.js.org/)
- [Zustand 文档](https://github.com/pmndrs/zustand)

### 学习资源

- [React 状态管理指南](https://react.dev/learn/managing-state)
- [useReducer vs useState](https://react.dev/reference/react/useReducer#differences-between-usereducer-and-usestate)
- [状态机模式](https://statecharts.dev/)

### 开源项目参考

- [React 官方示例](https://github.com/reactjs/react.dev/tree/main/examples)
- [useReducer 最佳实践](https://github.com/uidotdev/usehooks)

---

## 附录：决策过程记录

### 讨论时间线

- **2026-03-01**: 初步调研各种状态管理方案
- **2026-03-03**: 团队内部讨论，评估各方案优劣势
- **2026-03-05**: 创建 useReducer 和 Redux 两个原型
- **2026-03-07**: 最终决策会议，确定使用 useReducer
- **2026-03-08**: 编写 ADR 文档

### 参与决策人员

- 后端架构师：负责技术评估
- 前端开发：负责方案对比
- 项目经理：负责项目复杂度评估

### 关键决策因素排序

1. 项目规模适配（最高优先级）
2. 代码简洁性
3. 类型安全
4. 学习成本
5. 扩展性

---

**最后更新**: 2026-03-08  
**下次审查**: 2026-09-08（6 个月后）
