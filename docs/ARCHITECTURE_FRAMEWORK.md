# 文件处理框架架构文档

## 概述

本文档描述了 ImageAutoInserter 项目的模块化文件处理框架，旨在解决大文件处理时的性能问题，并提供可扩展的架构支持未来需求。

## 架构目标

1. **模块化设计**：组件之间松耦合，支持独立开发、测试和部署
2. **可扩展性**：易于添加新的文件类型处理器
3. **性能优化**：避免主线程阻塞，支持大文件处理
4. **可维护性**：清晰的代码结构和完善的文档
5. **安全性**：内置安全防护机制

## 核心组件

### 1. 事件总线 (EventBus)

**职责**：提供组件间的松耦合通信机制

**关键特性**：
- 支持同步/异步事件处理器
- 支持一次性订阅
- 错误隔离（一个处理器失败不影响其他）
- 订阅计数和清理功能

**使用场景**：
```typescript
// 订阅事件
const unsubscribe = eventBus.on('file:validated', (data) => {
  console.log('File validated:', data);
});

// 触发事件
await eventBus.emit('file:validated', { fileInfo, result });

// 取消订阅
unsubscribe();
```

### 2. 工作线程池 (WorkerPool)

**职责**：管理异步任务执行，避免主线程阻塞

**关键特性**：
- 可配置的并发数
- 任务队列管理
- 超时控制
- 取消支持（AbortController）
- 进度回调

**使用场景**：
```typescript
const workUnit: WorkUnit<FileInfo, ValidationResult> = {
  id: 'validate-1',
  type: 'validation',
  data: fileInfo,
  execute: async () => {
    return await validateFile(fileInfo);
  },
  onProgress: (progress) => {
    updateUI(progress);
  }
};

const result = await workerPool.submit(workUnit, {
  timeout: 30000,
  abortSignal: controller.signal
});
```

### 3. 处理器注册表 (HandlerRegistry)

**职责**：管理所有文件处理器的注册和发现

**关键特性**：
- 动态注册/注销
- 类型映射
- 自动发现合适的处理器
- 统计信息

**使用场景**：
```typescript
// 注册处理器
registry.register(new ExcelHandler());
registry.register(new ZipHandler());

// 查找处理器
const handler = registry.findHandler(fileInfo);
if (handler) {
  await handler.process(fileInfo);
}
```

### 4. 文件处理编排器 (FileProcessingOrchestrator)

**职责**：核心协调组件，统一管理文件选择、验证和处理流程

**关键特性**：
- 快速验证（同步）+ 深度验证（异步）
- 延迟验证支持
- 统一的错误处理
- 进度跟踪
- 取消支持

**使用场景**：
```typescript
const orchestrator = new FileProcessingOrchestrator(
  registry,
  workerPool,
  eventBus,
  {
    enableAsyncValidation: true,
    validationDelay: 0
  }
);

// 文件选择后立即显示
const fileInfo = orchestrator.createFileInfo(path, name, size, type);
onChange(fileInfo);

// 后台异步验证
const result = await orchestrator.validateWithDelay(fileInfo, 0);
updateValidationStatus(result);
```

### 5. 文件处理器 (FileHandler)

**职责**：处理特定类型的文件

**已实现处理器**：
- **ExcelHandler**: 处理 Excel 文件，支持大文件优化

**关键特性**：
- 统一的接口定义
- 可配置的处理选项
- 进度报告
- 错误处理

## 文件处理流程

```
用户选择文件
    ↓
创建 FileInfo
    ↓
立即显示文件名（UI 响应）
    ↓
快速验证（同步）
    - 检查文件大小
    - 检查文件类型
    - 检查处理器存在性
    ↓
异步深度验证（WorkerPool）
    - 读取文件内容
    - 验证结构
    - 检查必需列
    ↓
更新验证状态（UI）
    ↓
用户触发处理
    ↓
异步处理（WorkerPool）
    - 读取数据
    - 处理图片
    - 生成输出
    ↓
显示结果
```

## 性能优化策略

### 1. 异步验证

**问题**：同步验证阻塞主线程，导致 UI 卡顿

**解决方案**：
- 快速验证（同步）：只检查基本信息
- 深度验证（异步）：在 WorkerPool 中执行

### 2. 大文件优化

**问题**：大 Excel 文件读取耗时

**解决方案**：
```typescript
// ExcelHandler 中的优化
if (fileSize > LARGE_FILE_THRESHOLD) {
  workbook = xlsx.readFile(filePath, {
    sheetRows: 60,        // 只读取前60行
    cellFormula: false,   // 不解析公式
    cellHTML: false,      // 不解析 HTML
    cellNF: false,        // 不解析数字格式
    cellStyles: false     // 不解析样式
  });
}
```

### 3. 延迟验证

**问题**：文件选择后立即验证，用户感知延迟

**解决方案**：
```typescript
// 延迟执行深度验证
setTimeout(() => {
  validateFile(file);
}, 0);
```

## 扩展指南

### 添加新的文件处理器

1. 实现 FileHandler 接口：

```typescript
export class PdfHandler implements FileHandler {
  readonly config: HandlerConfig = {
    name: 'pdf-handler',
    supportedTypes: [FileType.PDF],
    allowedExtensions: ['.pdf'],
    maxFileSize: 100 * 1024 * 1024
  };

  canHandle(fileInfo: FileInfo): boolean {
    return fileInfo.type === FileType.PDF;
  }

  async validate(fileInfo: FileInfo): Promise<ValidationResult> {
    // 验证逻辑
  }

  async process(fileInfo: FileInfo): Promise<ProcessingResult> {
    // 处理逻辑
  }
}
```

2. 注册处理器：

```typescript
import { pdfHandler } from './handlers/PdfHandler';

registry.register(pdfHandler);
```

### 添加新的事件类型

1. 在 types.ts 中添加事件类型：

```typescript
export type FrameworkEventType = 
  | 'file:selected'
  | 'file:validated'
  | 'pdf:converted'  // 新事件
  | ...;
```

2. 触发事件：

```typescript
await eventBus.emit('pdf:converted', { fileInfo, outputPath });
```

## 测试策略

### 单元测试

每个核心组件都有对应的单元测试：

- `EventBus.test.ts`: 测试事件订阅、触发、取消
- `WorkerPool.test.ts`: 测试任务提交、取消、超时
- `HandlerRegistry.test.ts`: 测试处理器注册、发现
- `ExcelHandler.test.ts`: 测试 Excel 文件验证和处理

### 集成测试

测试组件之间的协作：

```typescript
describe('FileProcessingOrchestrator Integration', () => {
  it('应该能够完整处理文件选择流程', async () => {
    // 1. 注册处理器
    registry.register(excelHandler);

    // 2. 创建编排器
    const orchestrator = new FileProcessingOrchestrator(
      registry, workerPool, eventBus
    );

    // 3. 执行流程
    const fileInfo = orchestrator.createFileInfo(...);
    const result = await orchestrator.validate(fileInfo);

    // 4. 验证结果
    expect(result.valid).toBe(true);
  });
});
```

## 安全考虑

1. **文件大小限制**：防止内存溢出
2. **文件类型白名单**：防止恶意文件
3. **路径验证**：防止目录遍历攻击
4. **超时控制**：防止无限期阻塞
5. **错误隔离**：防止一个任务影响其他任务

## 未来扩展方向

1. **Web Worker 支持**：将处理逻辑移到 Web Worker
2. **流式处理**：支持超大文件的流式处理
3. **缓存机制**：缓存验证结果，避免重复验证
4. **插件系统**：支持第三方插件
5. **监控和日志**：完善的性能监控和日志记录

## 迁移指南

从现有代码迁移到新框架：

1. **替换 IPC 处理程序**：

```typescript
// 旧代码
ipcMain.handle('validate-excel-columns', async (_, filePath) => {
  const workbook = xlsx.readFile(filePath); // 阻塞
  // ...
});

// 新代码
ipcMain.handle('validate-excel-columns', async (_, filePath) => {
  const fileInfo = orchestrator.createFileInfo(...);
  return await orchestrator.validate(fileInfo); // 异步
});
```

2. **更新 UI 组件**：

```typescript
// 旧代码
const handleSelectFile = async () => {
  const file = await selectFile();
  onChange(file);
  await validateFile(file); // 阻塞
};

// 新代码
const handleSelectFile = async () => {
  const file = await selectFile();
  onChange(file); // 立即显示
  // 验证在后台异步执行
  orchestrator.validateWithDelay(file, 0).then(result => {
    updateValidationStatus(result);
  });
};
```

## 总结

这个框架提供了：

1. **清晰的架构**：分层设计，职责明确
2. **高性能**：异步处理，避免阻塞
3. **易扩展**：插件化设计，易于添加新功能
4. **可测试**：组件解耦，便于单元测试
5. **安全可靠**：内置安全防护机制

通过采用这个框架，可以有效解决大文件处理的性能问题，同时为未来的功能扩展提供坚实的基础。
