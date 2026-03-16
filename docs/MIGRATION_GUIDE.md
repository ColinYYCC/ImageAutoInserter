# 迁移指南：解决大文件卡顿问题

## 概述

本文档提供从现有代码迁移到优化版本的详细步骤，专注于解决选择大文件时的卡顿问题。

## 问题分析

### 根本原因
1. **同步阻塞**：`xlsx.readFile()` 在主线程同步执行
2. **立即验证**：文件选择后立即进行深度验证
3. **大文件无优化**：100MB+ 文件读取整个工作簿

### 影响
- 选择大文件时 UI 卡顿 2-5 秒
- 用户体验差
- 可能触发系统无响应提示

## 解决方案对比

### 方案 A：最小改动（推荐）
**特点**：
- 只修改 IPC 处理程序
- 保持现有 UI 代码不变
- 风险最低

**改动范围**：
- `src/main/ipc-handlers.ts`：添加 `setImmediate` 和优化读取选项

### 方案 B：渐进式改进
**特点**：
- 引入 `SimpleAsyncValidator`
- 异步验证 + 延迟执行
- 中等复杂度

**改动范围**：
- `src/main/ipc-handlers.ts`：使用异步验证器
- `src/renderer/components/FilePicker.tsx`：添加验证状态管理

### 方案 C：完整框架
**特点**：
- 完整的模块化架构
- 最高的可扩展性
- 适合长期发展

**改动范围**：
- 新增 `src/core/framework/` 目录
- 替换现有的文件处理逻辑

## 推荐方案：方案 B（渐进式改进）

### 为什么选方案 B？

1. **平衡性**：既解决了性能问题，又不会引入过多复杂度
2. **可回滚**：如果出现问题，容易回滚到原始代码
3. **可扩展**：为未来的功能扩展打下基础
4. **低风险**：改动范围可控，测试覆盖容易

### 实施步骤

#### 步骤 1：添加类型定义

创建 `src/core/framework/types.ts`（如果尚未创建）：

```typescript
export interface FileInfo {
  path: string;
  name: string;
  size: number;
  type: string;
  extension: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  resolution?: string;
  metadata?: Record<string, any>;
}

export interface ProcessingOptions {
  abortSignal?: AbortSignal;
  progressCallback?: (progress: ProgressInfo) => void;
}

export interface ProgressInfo {
  percent: number;
  current: number;
  total: number;
  stage: string;
  message?: string;
}
```

#### 步骤 2：添加简化版异步验证器

创建 `src/core/framework/SimpleAsyncValidator.ts`：

```typescript
export class SimpleAsyncValidator {
  private abortController: AbortController | null = null;
  private timeoutId: NodeJS.Timeout | null = null;

  async validate(
    fileInfo: FileInfo,
    validateFn: ValidationFunction,
    config: AsyncValidatorConfig = {}
  ): Promise<ValidationResult> {
    // 实现代码...
  }

  cancel(): void {
    // 实现代码...
  }
}

export const simpleAsyncValidator = new SimpleAsyncValidator();
```

#### 步骤 3：添加优化的 Excel 处理器

创建 `src/core/framework/OptimizedExcelHandler.ts`：

```typescript
export async function validateExcelOptimized(
  fileInfo: FileInfo,
  options: ProcessingOptions & OptimizedExcelOptions = {}
): Promise<ValidationResult> {
  // 实现代码...
}
```

#### 步骤 4：修改 IPC 处理程序

修改 `src/main/ipc-handlers.ts`：

```typescript
import { simpleAsyncValidator } from '../core/framework/SimpleAsyncValidator';
import { validateExcelOptimized } from '../core/framework/OptimizedExcelHandler';

// 替换原有的 validate-excel-columns 处理程序
ipcMain.handle('validate-excel-columns', async (_, filePath: string) => {
  const fileInfo = {
    path: filePath,
    name: path.basename(filePath),
    size: fs.statSync(filePath).size,
    type: 'excel',
    extension: 'xlsx'
  };

  return await simpleAsyncValidator.validate(
    fileInfo,
    validateExcelOptimized,
    {
      timeout: 30000,
      onStart: () => console.log('[Excel验证] 开始'),
      onComplete: (result) => console.log('[Excel验证] 完成', result.valid)
    }
  );
});
```

#### 步骤 5：更新 UI 组件（可选）

如果需要更好的用户体验，可以更新 `FilePicker.tsx`：

```typescript
const [validationState, setValidationState] = useState<{
  status: 'idle' | 'validating' | 'valid' | 'invalid';
  message: string;
}>({ status: 'idle', message: '' });

const handleSelectFile = async () => {
  const file = await window.electronAPI.selectFile(accept, title);
  if (file) {
    onChange(file); // 立即显示文件名
    
    // 显示验证中状态
    setValidationState({ status: 'validating', message: '验证中...' });
    
    try {
      const result = await window.electronAPI.validateExcelColumns(file.path);
      
      if (result.valid) {
        setValidationState({ status: 'valid', message: '' });
      } else {
        setValidationState({ 
          status: 'invalid', 
          message: result.error || '验证失败' 
        });
      }
    } catch (error) {
      setValidationState({ 
        status: 'invalid', 
        message: '验证过程出错' 
      });
    }
  }
};
```

## 回滚方案

如果新代码出现问题，可以快速回滚：

1. **恢复 IPC 处理程序**：
```typescript
// 注释掉新代码，恢复旧代码
ipcMain.handle('validate-excel-columns', async (_, filePath: string) => {
  // 恢复原有的同步验证逻辑
  const workbook = xlsx.readFile(filePath);
  // ...
});
```

2. **恢复 UI 组件**：
```typescript
// 移除验证状态管理
const handleSelectFile = async () => {
  const file = await window.electronAPI.selectFile(accept, title);
  if (file) {
    onChange(file);
    await validateFile(file); // 恢复同步验证
  }
};
```

## 测试策略

### 1. 单元测试

```typescript
// tests/framework/SimpleAsyncValidator.test.ts
describe('SimpleAsyncValidator', () => {
  it('应该能够异步执行验证', async () => {
    const validator = new SimpleAsyncValidator();
    const result = await validator.validate(
      fileInfo,
      async () => ({ valid: true })
    );
    expect(result.valid).toBe(true);
  });

  it('应该支持超时', async () => {
    const validator = new SimpleAsyncValidator();
    const result = await validator.validate(
      fileInfo,
      async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { valid: true };
      },
      { timeout: 100 }
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('超时');
  });
});
```

### 2. 集成测试

```typescript
// tests/framework/OptimizedExcelHandler.test.ts
describe('OptimizedExcelHandler', () => {
  it('应该能够验证小文件', async () => {
    const fileInfo = createTestFileInfo('small.xlsx', 1024 * 1024);
    const result = await validateExcelOptimized(fileInfo);
    expect(result.valid).toBe(true);
  });

  it('应该能够验证大文件', async () => {
    const fileInfo = createTestFileInfo('large.xlsx', 150 * 1024 * 1024);
    const result = await validateExcelOptimized(fileInfo);
    expect(result.valid).toBe(true);
    expect(result.metadata?.isLargeFile).toBe(true);
  });
});
```

### 3. 性能测试

```typescript
// 测试大文件处理时间
describe('Performance', () => {
  it('大文件验证应该在 1 秒内完成', async () => {
    const startTime = Date.now();
    const fileInfo = createTestFileInfo('large.xlsx', 150 * 1024 * 1024);
    await validateExcelOptimized(fileInfo);
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(1000);
  });
});
```

## 验证清单

迁移完成后，请检查以下项目：

- [ ] 小文件（< 10MB）验证正常
- [ ] 中等文件（10-100MB）验证正常
- [ ] 大文件（> 100MB）验证正常，无卡顿
- [ ] 验证失败时错误提示正确
- [ ] 取消操作正常工作
- [ ] 超时处理正常工作
- [ ] 进度回调正常工作（如果启用）
- [ ] 所有现有功能正常工作

## 常见问题

### Q: 为什么使用 `setImmediate` 而不是 `setTimeout`？
A: `setImmediate` 在当前事件循环结束后立即执行，比 `setTimeout(fn, 0)` 更快，更适合让出主线程。

### Q: 大文件优化会影响小文件性能吗？
A: 不会。优化只针对大于 100MB 的文件，小文件使用原有的读取方式。

### Q: 如何调整大文件阈值？
A: 修改 `OptimizedExcelHandler.ts` 中的 `largeFileThreshold` 参数：
```typescript
const largeFileThreshold = 50 * 1024 * 1024; // 改为 50MB
```

### Q: 可以支持其他文件类型吗？
A: 可以。按照 `OptimizedExcelHandler.ts` 的模式，为其他文件类型创建类似的处理器。

## 总结

通过采用方案 B（渐进式改进），我们可以：

1. **解决核心问题**：大文件选择时的卡顿
2. **保持代码稳定**：改动范围可控，易于回滚
3. **提升用户体验**：异步验证 + 进度反馈
4. **为未来扩展打基础**：模块化的代码结构

建议先在测试环境验证，确认无误后再部署到生产环境。
