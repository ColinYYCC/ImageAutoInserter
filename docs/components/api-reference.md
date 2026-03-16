# 组件 API 参考文档

> **版本**: v1.0  
> **创建日期**: 2026-03-08  
> **状态**: 设计完成  
> **参考文档**: [spec.md](../../.trae/specs/gui-redesign/spec.md), [wireframe.md](../design/gui-redesign/wireframe.md), [mockup.md](../design/gui-redesign/mockup.md), [data-flow.md](../architecture/data-flow.md)  
> **适用范围**: ImageAutoInserter GUI v3.0 React + Electron 实现

---

## 目录

1. [核心组件](#核心组件)
   - [FilePicker](#filepicker-组件)
   - [ProgressBar](#progressbar-组件)
   - [ResultView](#resultview-组件)
   - [ErrorDialog](#errordialog-组件)
   - [InfoPanel](#infopanel-组件)
   - [StatisticsCard](#statisticscard-组件)
2. [自定义 Hooks](#自定义-hooks)
3. [IPC 通道完整列表](#ipc-通道完整列表)
4. [TypeScript 类型定义](#typescript-类型定义)
5. [代码示例](#代码示例)

---

## 核心组件

### FilePicker 组件

#### 组件描述

**文件**: `src/renderer/components/FilePicker.tsx`

FilePicker 是用于选择 Excel 文件和图片源的核心组件。采用卡片式布局，支持未选择（虚线边框）和已选择（实线边框）两种状态。

**设计参考**: [wireframe.md - IDLE 状态](../design/gui-redesign/wireframe.md#idle-状态线框图), [spec.md - 组件设计](../../.trae/specs/gui-redesign/spec.md#filepicker-组件)

#### Props 接口

```typescript
interface FilePickerProps {
  /**
   * 卡片标题（如："选择 Excel 文件"、"选择图片源"）
   * @default ""
   * @required
   */
  label: string;

  /**
   * 图标类型，支持内置图标或自定义 SVG
   * @default "document"
   * @options "document" | "image" | "folder" | "zip" | "rar"
   */
  icon?: 'document' | 'image' | 'folder' | 'zip' | 'rar' | React.ReactNode;

  /**
   * 文件选择器接受的 MIME 类型
   * @default "*/*"
   * @example ".xlsx,.xls" | ".zip,.rar" | "image/*"
   */
  accept?: string;

  /**
   * 当前选中的文件信息
   * @default null
   */
  value: FileInfo | null;

  /**
   * 文件选择变更回调
   * @param file - 选中的文件信息，null 表示取消选择
   * @required
   */
  onChange: (file: FileInfo | null) => void;

  /**
   * 描述文字（显示在标题下方）
   * @default ""
   */
  description?: string;

  /**
   * 按钮文字
   * @default "选择文件"
   */
  buttonText?: string;

  /**
   * 是否禁用组件
   * @default false
   */
  disabled?: boolean;

  /**
   * 自定义 CSS 类名
   * @default ""
   */
  className?: string;

  /**
   * 数据测试 ID（用于 E2E 测试）
   * @default ""
   */
  'data-testid'?: string;
}
```

#### CSS 类名

```css
/* 容器 */
.filePicker-container          /* 根容器 */
.filePicker-container--disabled /* 禁用状态 */

/* 卡片 */
.filePicker-card             /* 文件卡片 */
.filePicker-card--idle       /* 未选择状态（虚线边框） */
.filePicker-card--ready      /* 已选择状态（实线边框） */
.filePicker-card--hover      /* 悬停状态（通过 :hover） */

/* 内容区域 */
.filePicker-header           /* 标题区域 */
.filePicker-label            /* 标题文字 */
.filePicker-description      /* 描述文字 */
.filePicker-icon             /* 图标容器 */
.filePicker-preview          /* 文件预览区域 */

/* 按钮 */
.filePicker-button           /* 选择按钮 */
.filePicker-button--disabled /* 按钮禁用状态 */
```

#### 样式变量

```css
/* 尺寸 */
--filepicker-width: 320px;
--filepicker-height: 280px;
--filepicker-padding: 32px;
--filepicker-border-radius: 12px;

/* 颜色 */
--filepicker-border-idle: var(--border-light);  /* #E5E7EB */
--filepicker-border-ready: var(--primary);      /* #2563EB */
--filepicker-bg: var(--bg-secondary);           /* #FFFFFF */

/* 动画 */
--filepicker-transition: all 200ms var(--ease-out);
```

#### 使用示例

##### 基础用法

```tsx
import React, { useState } from 'react';
import { FilePicker } from './FilePicker';

function BasicExample() {
  const [excelFile, setExcelFile] = useState<FileInfo | null>(null);

  return (
    <FilePicker
      label="选择 Excel 文件"
      description="请选择要处理的 Excel 表格文件"
      icon="document"
      accept=".xlsx,.xls"
      value={excelFile}
      onChange={setExcelFile}
    />
  );
}
```

##### 图片源选择

```tsx
import React, { useState } from 'react';
import { FilePicker } from './FilePicker';

function ImageSourcePicker() {
  const [imageSource, setImageSource] = useState<FileInfo | null>(null);

  return (
    <FilePicker
      label="选择图片源"
      description="选择包含商品图片的文件夹或压缩包"
      icon="zip"
      accept=".zip,.rar"
      value={imageSource}
      onChange={(file) => {
        console.log('文件变更:', file);
        setImageSource(file);
      }}
      buttonText="选择图片源"
      disabled={false}
      className="custom-filepicker"
      data-testid="image-source-picker"
    />
  );
}
```

#### IPC 事件使用

```tsx
import React from 'react';
import { FilePicker } from './FilePicker';
import { ipcRenderer } from 'electron';

function FilePickerWithIPC() {
  const handleFileChange = async (file: FileInfo | null) => {
    if (file) {
      try {
        // 调用 IPC 验证文件
        const result = await ipcRenderer.invoke('select-file', {
          type: 'excel',
          path: file.path
        });
        
        if (result.success) {
          console.log('文件验证通过');
        } else {
          console.error('文件验证失败:', result.error);
        }
      } catch (error) {
        console.error('IPC 调用失败:', error);
      }
    }
  };

  return (
    <FilePicker
      label="选择 Excel 文件"
      value={null}
      onChange={handleFileChange}
    />
  );
}
```

---

### ProgressBar 组件

#### 组件描述

**文件**: `src/renderer/components/ProgressBar.tsx`

ProgressBar 用于显示处理进度，支持线性渐变填充和百分比文字显示。

**设计参考**: [wireframe.md - PROCESSING 状态](../design/gui-redesign/wireframe.md#processing-状态线框图), [spec.md - 组件设计](../../.trae/specs/gui-redesign/spec.md#progressbar-组件)

#### Props 接口

```typescript
interface ProgressBarProps {
  /**
   * 进度值（0-100）
   * @default 0
   * @required
   * @min 0
   * @max 100
   */
  value: number;

  /**
   * 进度条标签（显示在进度条上方）
   * @default ""
   */
  label?: string;

  /**
   * 是否显示百分比文字
   * @default true
   */
  showLabel?: boolean;

  /**
   * 自定义百分比文字（如："85 / 127"）
   * @default 自动根据 value 生成
   */
  customLabel?: string;

  /**
   * 是否显示完成状态（绿色）
   * @default false
   */
  complete?: boolean;

  /**
   * 是否显示动画
   * @default true
   */
  animated?: boolean;

  /**
   * 进度条高度（像素）
   * @default 8
   */
  height?: number;

  /**
   * 自定义 CSS 类名
   * @default ""
   */
  className?: string;

  /**
   * 数据测试 ID
   * @default ""
   */
  'data-testid'?: string;
}
```

#### CSS 类名

```css
/* 容器 */
.progressBar-container       /* 根容器 */
.progressBar-container--complete /* 完成状态 */

/* 标签 */
.progressBar-label           /* 标签文字 */

/* 进度条轨道 */
.progressBar-track           /* 背景轨道 */

/* 进度条填充 */
.progressBar-fill            /* 进度填充 */
.progressBar-fill--animated  /* 带动画 */
.progressBar-fill--complete  /* 完成状态（绿色） */

/* 百分比文字 */
.progressBar-percentage      /* 百分比显示 */
```

#### 样式变量

```css
/* 尺寸 */
--progressbar-height: 8px;
--progressbar-border-radius: 4px;
--progressbar-track-bg: var(--border-light); /* #E5E7EB */

/* 颜色 */
--progressbar-fill-start: var(--primary);    /* #2563EB */
--progressbar-fill-end: var(--primary-hover); /* #1D4ED8 */
--progressbar-complete-start: var(--success); /* #10B981 */
--progressbar-complete-end: #059669;

/* 动画 */
--progressbar-transition: width 300ms var(--ease-out);
```

#### 使用示例

##### 基础用法

```tsx
import React from 'react';
import { ProgressBar } from './ProgressBar';

function BasicExample() {
  const progress = 67;

  return <ProgressBar value={progress} />;
}
```

##### PROCESSING 状态

```tsx
import React from 'react';
import { ProgressBar } from './ProgressBar';

function ProcessingState() {
  const progress = 85;
  const total = 127;

  return (
    <ProgressBar
      value={progress}
      label="正在处理..."
      showLabel={true}
      customLabel={`已完成 ${progress} / ${total}`}
      complete={false}
      animated={true}
      height={8}
      data-testid="processing-progress"
    />
  );
}
```

##### 完成状态

```tsx
import React from 'react';
import { ProgressBar } from './ProgressBar';

function CompleteState() {
  return (
    <ProgressBar
      value={100}
      label="处理完成"
      complete={true}
      customLabel="100%"
    />
  );
}
```

#### IPC 事件使用

```tsx
import React, { useState, useEffect } from 'react';
import { ProgressBar } from './ProgressBar';
import { ipcRenderer } from 'electron';

function ProgressBarWithIPC() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // 监听 IPC 进度更新
    const unsubscribe = ipcRenderer.on('progress', (event, data) => {
      setProgress(data.percent);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return <ProgressBar value={progress} showLabel={true} />;
}
```

---

### ResultView 组件

#### 组件描述

**文件**: `src/renderer/components/ResultView.tsx`

ResultView 用于展示处理完成后的统计信息和操作按钮。

**设计参考**: [wireframe.md - COMPLETE 状态](../design/gui-redesign/wireframe.md#complete-状态线框图), [spec.md - 组件设计](../../.trae/specs/gui-redesign/spec.md#resultview-组件)

#### Props 接口

```typescript
interface ResultViewProps {
  /**
   * 处理统计信息
   * @required
   */
  stats: {
    /** 总数量 */
    total: number;
    /** 成功数量 */
    success: number;
    /** 失败数量 */
    failed: number;
    /** 成功率（0-100） */
    successRate: number;
  };

  /**
   * 点击查看错误按钮回调
   * @required
   */
  onViewErrors: () => void;

  /**
   * 点击打开文件按钮回调
   * @required
   */
  onOpenFile: () => void;

  /**
   * 点击返回首页按钮回调
   * @default undefined
   */
  onReset?: () => void;

  /**
   * 是否显示打开文件按钮
   * @default true
   */
  showOpenFile?: boolean;

  /**
   * 是否显示查看错误按钮
   * @default true
   */
  showViewErrors?: boolean;

  /**
   * 自定义 CSS 类名
   * @default ""
   */
  className?: string;

  /**
   * 数据测试 ID
   * @default ""
   */
  'data-testid'?: string;
}
```

#### CSS 类名

```css
/* 容器 */
.resultView-container      /* 根容器 */

/* 标题区域 */
.resultView-header         /* 头部区域 */
.resultView-title          /* 标题文字 */
.resultView-subtitle       /* 副标题 */

/* 统计卡片网格 */
.resultView-stats          /* 统计容器 */
.resultView-stats-grid     /* 四宫格布局 */

/* 单个统计卡片 */
.resultView-stat           /* 统计卡片 */
.resultView-stat--total    /* 总数量卡片 */
.resultView-stat--success  /* 成功卡片 */
.resultView-stat--failed   /* 失败卡片 */
.resultView-stat--rate     /* 成功率卡片 */

/* 统计数值 */
.resultView-stat-value     /* 数值文字 */
.resultView-stat-label     /* 标签文字 */

/* 按钮区域 */
.resultView-actions        /* 按钮容器 */
.resultView-button         /* 按钮 */
```

#### 样式变量

```css
/* 尺寸 */
--resultview-card-width: 156px;
--resultview-card-height: 100px;
--resultview-card-radius: 12px;
--resultview-card-padding: 16px;
--resultview-grid-gap: 16px;

/* 颜色 - 卡片背景渐变 */
--resultview-total-bg: linear-gradient(135deg, #F3F4F6, #E5E7EB);
--resultview-success-bg: linear-gradient(135deg, #D1FAE5, #A7F3D0);
--resultview-failed-bg: linear-gradient(135deg, #FEE2E2, #FECACA);
--resultview-rate-bg: linear-gradient(135deg, #DBEAFE, #BFDBFE);

/* 颜色 - 数值 */
--resultview-total-value: var(--primary);      /* #2563EB */
--resultview-success-value: var(--success);    /* #10B981 */
--resultview-failed-value: var(--error);       /* #EF4444 */
--resultview-rate-value: var(--primary);       /* #2563EB */
```

#### 使用示例

##### 基础用法

```tsx
import React from 'react';
import { ResultView } from './ResultView';

function BasicExample() {
  const stats = {
    total: 127,
    success: 125,
    failed: 2,
    successRate: 98.4
  };

  const handleViewErrors = () => {
    console.log('查看错误');
  };

  const handleOpenFile = () => {
    console.log('打开文件');
  };

  return (
    <ResultView
      stats={stats}
      onViewErrors={handleViewErrors}
      onOpenFile={handleOpenFile}
    />
  );
}
```

##### COMPLETE 状态

```tsx
import React from 'react';
import { ResultView } from './ResultView';
import { ipcRenderer } from 'electron';

function CompleteState() {
  const stats = {
    total: 127,
    success: 125,
    failed: 2,
    successRate: 98.4
  };

  return (
    <ResultView
      stats={stats}
      onViewErrors={() => {
        // 打开错误对话框
        // dispatch({ type: 'SHOW_ERROR_DIALOG' });
      }}
      onOpenFile={() => {
        // 调用系统 API 打开文件
        ipcRenderer.invoke('open-file', '/path/to/output.xlsx');
      }}
      onReset={() => {
        // 重置应用状态
        // dispatch({ type: 'RESET' });
      }}
      showOpenFile={true}
      showViewErrors={true}
      data-testid="result-view"
    />
  );
}
```

#### IPC 事件使用

```tsx
import React, { useState, useEffect } from 'react';
import { ResultView } from './ResultView';
import { ipcRenderer } from 'electron';

function ResultViewWithIPC() {
  const [result, setResult] = useState<ProcessingResult | null>(null);

  useEffect(() => {
    // 监听 IPC 完成消息
    const unsubscribe = ipcRenderer.on('complete', (event, data) => {
      setResult(data);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!result) return null;

  return (
    <ResultView
      stats={result.stats}
      onViewErrors={() => {
        // 显示错误详情
      }}
      onOpenFile={() => {
        ipcRenderer.invoke('open-file', result.outputPath);
      }}
    />
  );
}
```

---

### ErrorDialog 组件

#### 组件描述

**文件**: `src/renderer/components/ErrorDialog.tsx`

ErrorDialog 是模态错误对话框，用于显示处理过程中发生的错误。

**设计参考**: [wireframe.md - ERROR 状态](../design/gui-redesign/wireframe.md#error-状态线框图), [spec.md - 状态机设计](../../.trae/specs/gui-redesign/spec.md#状态机设计)

#### Props 接口

```typescript
interface ErrorDialogProps {
  /**
   * 是否显示对话框
   * @default false
   * @required
   */
  isOpen: boolean;

  /**
   * 错误标题
   * @default "处理错误"
   */
  title?: string;

  /**
   * 错误信息（用户友好提示）
   * @required
   */
  message: string;

  /**
   * 错误详情（技术堆栈）
   * @default ""
   */
  details?: string;

  /**
   * 错误类型
   * @default "error"
   * @options "error" | "warning"
   */
  type?: 'error' | 'warning';

  /**
   * 点击确定按钮回调
   * @required
   */
  onClose: () => void;

  /**
   * 是否显示详情区域
   * @default true
   */
  showDetails?: boolean;

  /**
   * 确定按钮文字
   * @default "确定"
   */
  confirmText?: string;

  /**
   * 自定义 CSS 类名
   * @default ""
   */
  className?: string;

  /**
   * 数据测试 ID
   * @default ""
   */
  'data-testid'?: string;
}
```

#### CSS 类名

```css
/* 遮罩层 */
.errorDialog-overlay        /* 背景遮罩 */
.errorDialog-overlay--open  /* 显示状态 */

/* 对话框容器 */
.errorDialog-container      /* 对话框根容器 */
.errorDialog-container--warning /* 警告类型 */

/* 图标区域 */
.errorDialog-icon           /* 错误图标 */
.errorDialog-icon--warning  /* 警告图标 */

/* 内容区域 */
.errorDialog-content        /* 内容容器 */
.errorDialog-title          /* 标题 */
.errorDialog-message        /* 错误信息 */
.errorDialog-details        /* 详情区域 */
.errorDialog-details-scroll /* 可滚动详情 */

/* 按钮区域 */
.errorDialog-footer         /* 底部按钮区 */
.errorDialog-button         /* 确定按钮 */
```

#### 样式变量

```css
/* 尺寸 */
--errordialog-width: 560px;
--errordialog-height: 480px;
--errordialog-radius: 16px;
--errordialog-padding: 32px;

/* 颜色 */
--errordialog-bg: var(--bg-secondary);        /* #FFFFFF */
--errordialog-overlay-bg: rgba(0, 0, 0, 0.5); /* 半透明黑色 */
--errordialog-error-icon: var(--error);       /* #EF4444 */
--errordialog-warning-icon: var(--warning);   /* #F59E0B */

/* 阴影 */
--errordialog-shadow: var(--shadow-xl);       /* 0 8px 16px rgba(0,0,0,0.10) */

/* 动画 */
--errordialog-transition: all 200ms var(--ease-out);
```

#### 使用示例

##### 基础用法

```tsx
import React, { useState } from 'react';
import { ErrorDialog } from './ErrorDialog';

function BasicExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>触发错误</button>
      
      <ErrorDialog
        isOpen={isOpen}
        message="无法找到图片：C000999999.jpg"
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
```

##### ERROR 状态

```tsx
import React, { useState } from 'react';
import { ErrorDialog } from './ErrorDialog';

function ErrorState() {
  const [isOpen, setIsOpen] = useState(true);
  const error = new Error('Image not found');

  return (
    <ErrorDialog
      isOpen={isOpen}
      title="处理错误"
      message="无法找到图片：C000999999.jpg"
      details={error.stack}
      type="error"
      showDetails={true}
      confirmText="确定"
      onClose={() => {
        console.log('关闭错误对话框');
        setIsOpen(false);
      }}
      data-testid="error-dialog"
    />
  );
}
```

##### 警告类型

```tsx
import React from 'react';
import { ErrorDialog } from './ErrorDialog';

function WarningExample() {
  return (
    <ErrorDialog
      isOpen={true}
      title="警告"
      message="部分图片未找到，已跳过处理"
      type="warning"
      onClose={() => {}}
    />
  );
}
```

#### IPC 事件使用

```tsx
import React, { useState, useEffect } from 'react';
import { ErrorDialog } from './ErrorDialog';
import { ipcRenderer } from 'electron';

function ErrorDialogWithIPC() {
  const [error, setError] = useState<{ message: string; details?: string } | null>(null);

  useEffect(() => {
    // 监听 IPC 错误消息
    const unsubscribe = ipcRenderer.on('error', (event, errorData) => {
      setError({
        message: errorData.message,
        details: errorData.stack
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!error) return null;

  return (
    <ErrorDialog
      isOpen={true}
      message={error.message}
      details={error.details}
      onClose={() => {
        setError(null);
        // dispatch({ type: 'ERROR_CLOSED' });
      }}
    />
  );
}
```

---

### InfoPanel 组件

#### 组件描述

**文件**: `src/renderer/components/InfoPanel.tsx`

InfoPanel 是信息展示面板，用于显示文件信息、处理状态等辅助信息。

**设计参考**: [wireframe.md - READY 状态](../design/gui-redesign/wireframe.md#ready-状态线框图), [spec.md - 界面设计规范](../../.trae/specs/gui-redesign/spec.md#颜色系统)

#### Props 接口

```typescript
interface InfoPanelProps {
  /**
   * 面板标题
   * @default ""
   */
  title?: string;

  /**
   * 面板图标
   * @default undefined
   */
  icon?: React.ReactNode;

  /**
   * 面板内容（支持 React 节点）
   * @required
   */
  children: React.ReactNode;

  /**
   * 面板类型
   * @default "info"
   * @options "info" | "success" | "warning" | "error"
   */
  type?: 'info' | 'success' | 'warning' | 'error';

  /**
   * 是否显示边框
   * @default true
   */
  bordered?: boolean;

  /**
   * 是否显示阴影
   * @default true
   */
  shadowed?: boolean;

  /**
   * 自定义 CSS 类名
   * @default ""
   */
  className?: string;

  /**
   * 数据测试 ID
   * @default ""
   */
  'data-testid'?: string;
}
```

#### CSS 类名

```css
/* 容器 */
.infoPanel-container       /* 根容器 */
.infoPanel--info           /* 信息类型 */
.infoPanel--success        /* 成功类型 */
.infoPanel--warning        /* 警告类型 */
.infoPanel--error          /* 错误类型 */

/* 头部区域 */
.infoPanel-header          /* 头部容器 */
.infoPanel-title           /* 标题文字 */
.infoPanel-icon            /* 图标容器 */

/* 内容区域 */
.infoPanel-content         /* 内容容器 */
.infoPanel-bordered        /* 带边框 */
.infoPanel-shadowed        /* 带阴影 */
```

#### 样式变量

```css
/* 尺寸 */
--infopanel-padding: 24px;
--infopanel-radius: 12px;
--infopanel-border-width: 1px;

/* 颜色 - 根据类型 */
--infopanel-info-bg: var(--bg-secondary);
--infopanel-info-border: var(--border);
--infopanel-success-bg: linear-gradient(135deg, #D1FAE5, #A7F3D0);
--infopanel-success-border: var(--success);
--infopanel-warning-bg: linear-gradient(135deg, #FEF3C7, #FDE68A);
--infopanel-warning-border: var(--warning);
--infopanel-error-bg: linear-gradient(135deg, #FEE2E2, #FECACA);
--infopanel-error-border: var(--error);

/* 阴影 */
--infopanel-shadow: var(--shadow-md);
```

#### 使用示例

##### 基础用法

```tsx
import React from 'react';
import { InfoPanel } from './InfoPanel';

function BasicExample() {
  return (
    <InfoPanel
      title="文件信息"
      icon={<span>📄</span>}
      type="info"
    >
      <div>文件名：product_list.xlsx</div>
      <div>路径：/Users/shimengyu/Documents/</div>
      <div>大小：2.3 MB</div>
    </InfoPanel>
  );
}
```

##### READY 状态文件信息

```tsx
import React from 'react';
import { InfoPanel } from './InfoPanel';

function ReadyStateFileInfo() {
  return (
    <InfoPanel
      title="Excel 文件已选择"
      icon={<span>✓</span>}
      type="success"
      bordered={true}
      shadowed={true}
    >
      <div className="file-info">
        <div className="file-name">product_list_2026.xlsx</div>
        <div className="file-path">/Users/shimengyu/Documents/...</div>
        <div className="file-stats">127 行数据</div>
      </div>
    </InfoPanel>
  );
}
```

##### 警告信息

```tsx
import React from 'react';
import { InfoPanel } from './InfoPanel';

function WarningInfo() {
  return (
    <InfoPanel
      title="注意事项"
      icon={<span>⚠️</span>}
      type="warning"
    >
      <p>请确保图片源包含所有商品编码对应的图片文件。</p>
      <p>如果图片未找到，系统将跳过该行并记录错误。</p>
    </InfoPanel>
  );
}
```

---

### StatisticsCard 组件

#### 组件描述

**文件**: `src/renderer/components/StatisticsCard.tsx`

StatisticsCard 是单个统计卡片组件，用于展示处理结果的统计数据。

**设计参考**: [wireframe.md - COMPLETE 状态](../design/gui-redesign/wireframe.md#complete-状态线框图), [mockup.md - 统计卡片详细](../design/gui-redesign/mockup.md#统计卡片详细)

#### Props 接口

```typescript
interface StatisticsCardProps {
  /**
   * 卡片标签（如："总数量"、"成功"）
   * @default ""
   */
  label: string;

  /**
   * 卡片数值
   * @required
   */
  value: number | string;

  /**
   * 卡片类型（决定颜色主题）
   * @default "default"
   * @options "default" | "total" | "success" | "failed" | "rate"
   */
  type?: 'default' | 'total' | 'success' | 'failed' | 'rate';

  /**
   * 是否显示渐变背景
   * @default true
   */
  gradient?: boolean;

  /**
   * 自定义前缀（如："%"）
   * @default ""
   */
  prefix?: string;

  /**
   * 自定义后缀（如："%"）
   * @default ""
   */
  suffix?: string;

  /**
   * 自定义 CSS 类名
   * @default ""
   */
  className?: string;

  /**
   * 数据测试 ID
   * @default ""
   */
  'data-testid'?: string;
}
```

#### CSS 类名

```css
/* 容器 */
.statisticsCard-container   /* 根容器 */
.statisticsCard--default    /* 默认类型 */
.statisticsCard--total      /* 总数量类型 */
.statisticsCard--success    /* 成功类型 */
.statisticsCard--failed     /* 失败类型 */
.statisticsCard--rate       /* 成功率类型 */

/* 内容区域 */
.statisticsCard-content     /* 内容容器 */
.statisticsCard-label       /* 标签文字 */
.statisticsCard-value       /* 数值文字 */
.statisticsCard-gradient    /* 渐变背景 */
```

#### 样式变量

```css
/* 尺寸 */
--statisticscard-width: 156px;
--statisticscard-height: 100px;
--statisticscard-radius: 12px;
--statisticscard-padding: 16px;

/* 颜色 - 背景渐变 */
--statisticscard-default-bg: linear-gradient(135deg, #F3F4F6, #E5E7EB);
--statisticscard-total-bg: linear-gradient(135deg, #DBEAFE, #BFDBFE);
--statisticscard-success-bg: linear-gradient(135deg, #D1FAE5, #A7F3D0);
--statisticscard-failed-bg: linear-gradient(135deg, #FEE2E2, #FECACA);
--statisticscard-rate-bg: linear-gradient(135deg, #DBEAFE, #BFDBFE);

/* 颜色 - 数值 */
--statisticscard-default-value: var(--text-secondary);
--statisticscard-total-value: var(--primary);
--statisticscard-success-value: var(--success);
--statisticscard-failed-value: var(--error);
--statisticscard-rate-value: var(--primary);
```

#### 使用示例

##### 基础用法

```tsx
import React from 'react';
import { StatisticsCard } from './StatisticsCard';

function BasicExample() {
  return (
    <StatisticsCard
      label="总数量"
      value={127}
      type="total"
    />
  );
}
```

##### COMPLETE 状态四宫格

```tsx
import React from 'react';
import { StatisticsCard } from './StatisticsCard';

function CompleteStateStats() {
  const stats = {
    total: 127,
    success: 125,
    failed: 2,
    successRate: 98.4
  };

  return (
    <div className="stats-grid">
      <StatisticsCard
        label="总数量"
        value={stats.total}
        type="total"
        data-testid="stat-total"
      />
      <StatisticsCard
        label="成功"
        value={stats.success}
        type="success"
        data-testid="stat-success"
      />
      <StatisticsCard
        label="失败"
        value={stats.failed}
        type="failed"
        data-testid="stat-failed"
      />
      <StatisticsCard
        label="成功率"
        value={stats.successRate}
        type="rate"
        suffix="%"
        data-testid="stat-rate"
      />
    </div>
  );
}
```

##### 自定义数值格式

```tsx
import React from 'react';
import { StatisticsCard } from './StatisticsCard';

function CustomFormatStats() {
  return (
    <>
      <StatisticsCard
        label="处理时间"
        value="2:34"
        type="default"
        prefix=""
        suffix=""
      />
      <StatisticsCard
        label="成功率"
        value={98.4}
        type="rate"
        suffix="%"
      />
    </>
  );
}
```

---

## 自定义 Hooks

### useFilePicker Hook

**文件**: `src/renderer/hooks/useFilePicker.ts`

文件选择逻辑的自定义 Hook，封装文件选择状态和操作。

```typescript
interface UseFilePickerOptions {
  /** 接受的 MIME 类型 */
  accept?: string;
  /** 是否多选 */
  multiple?: boolean;
  /** 最大文件大小（字节） */
  maxSize?: number;
  /** 文件验证函数 */
  validate?: (file: File) => boolean;
}

interface UseFilePickerReturn {
  /** 选中的文件信息 */
  file: FileInfo | null;
  /** 是否正在选择 */
  isSelecting: boolean;
  /** 错误信息 */
  error: string | null;
  /** 打开文件选择器 */
  openFileDialog: () => void;
  /** 清除选择 */
  clearFile: () => void;
  /** 设置文件（外部调用） */
  setFile: (file: FileInfo | null) => void;
}

/**
 * 文件选择 Hook
 * 
 * @param options - 配置选项
 * @returns 文件选择状态和方法
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { file, openFileDialog, error } = useFilePicker({
 *     accept: '.xlsx,.xls',
 *     maxSize: 100 * 1024 * 1024, // 100MB
 *     validate: (file) => file.name.startsWith('PL-')
 *   });
 * 
 *   return (
 *     <div>
 *       <button onClick={openFileDialog}>选择文件</button>
 *       {file && <span>已选择：{file.name}</span>}
 *       {error && <span className="error">{error}</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFilePicker(options: UseFilePickerOptions = {}): UseFilePickerReturn {
  const [file, setFileState] = useState<FileInfo | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openFileDialog = useCallback(() => {
    // TODO: 调用 Electron dialog.showOpenDialog
    setIsSelecting(true);
  }, []);

  const clearFile = useCallback(() => {
    setFileState(null);
    setError(null);
  }, []);

  const setFile = useCallback((newFile: FileInfo | null) => {
    setFileState(newFile);
  }, []);

  return {
    file,
    isSelecting,
    error,
    openFileDialog,
    clearFile,
    setFile
  };
}
```

### useProcessState Hook

**文件**: `src/renderer/hooks/useProcessState.ts`

处理状态管理的自定义 Hook，封装状态机和 IPC 通信。

```typescript
interface UseProcessStateReturn {
  /** 当前状态 */
  state: AppState;
  /** 发送事件 */
  send: (event: ProcessEvent) => void;
  /** 是否处于指定状态 */
  is: (phase: AppState['phase']) => boolean;
  /** 重置状态 */
  reset: () => void;
  /** 取消处理 */
  cancel: () => void;
}

type ProcessEvent =
  | { type: 'SELECT_EXCEL'; payload: FileInfo }
  | { type: 'SELECT_IMAGE_SOURCE'; payload: FileInfo }
  | { type: 'START' }
  | { type: 'PROGRESS'; payload: { percent: number; current: string } }
  | { type: 'COMPLETE'; payload: ProcessingResult }
  | { type: 'ERROR'; payload: Error }
  | { type: 'RESET' }
  | { type: 'CANCEL' };

/**
 * 处理状态 Hook
 * 
 * @returns 状态管理对象
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { state, send, is, reset } = useProcessState();
 * 
 *   return (
 *     <div>
 *       {is('IDLE') && <IdleView />}
 *       {is('READY') && <ReadyView />}
 *       {is('PROCESSING') && <ProcessingView />}
 *       {is('COMPLETE') && <CompleteView />}
 *       {is('ERROR') && <ErrorView />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useProcessState(): UseProcessStateReturn {
  const [state, dispatch] = useReducer(processReducer, initialState);

  const send = useCallback((event: ProcessEvent) => {
    dispatch(event);
  }, []);

  const is = useCallback((phase: AppState['phase']) => {
    return state.phase === phase;
  }, [state.phase]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const cancel = useCallback(() => {
    dispatch({ type: 'CANCEL' });
    // 调用 IPC 取消处理
    ipcRenderer.invoke('cancel-process');
  }, []);

  return {
    state,
    send,
    is,
    reset,
    cancel
  };
}
```

---

## IPC 通道完整列表

### Renderer → Main 消息

| 通道名 | 类型 | 描述 | 负载类型 |
|--------|------|------|---------|
| `select-file` | invoke | 选择文件对话框 | `{ type: 'excel' \| 'image-source', accept?: string[] }` |
| `start-process` | invoke | 开始处理请求 | `{ excelPath: string, imageSourcePath: string, options?: ProcessOptions }` |
| `cancel-process` | invoke | 取消处理请求 | `{}` |
| `open-file` | invoke | 打开文件请求 | `{ path: string }` |
| `open-folder` | invoke | 打开文件夹请求 | `{ path: string }` |

### Main → Renderer 消息

| 通道名 | 类型 | 描述 | 负载类型 |
|--------|------|------|---------|
| `progress` | send/on | 进度更新推送 | `ProgressPayload` |
| `complete` | send/on | 处理完成推送 | `CompletePayload` |
| `error` | send/on | 错误事件推送 | `ErrorPayload` |
| `file-selected` | send/on | 文件选择验证推送 | `FileSelectedPayload` |

### IPC 消息负载类型

```typescript
// 进度更新
interface ProgressPayload {
  percent: number;        // 0-100
  current: string;        // 当前处理的 SKU 编码
  row: number;            // 当前行号
  total: number;          // 总行数
  processed: number;      // 已处理数
  success: number;        // 成功数
  failed: number;         // 失败数
}

// 处理完成
interface CompletePayload {
  stats: {
    total: number;
    success: number;
    failed: number;
    successRate: number;
  };
  outputPath: string;     // 输出文件路径
  errors: Array<{
    item: string;         // 项目编码
    message: string;      // 错误消息
    row: number;          // 行号
    column: string;       // 列号
  }>;
}

// 错误消息
interface ErrorPayload {
  type: 'file' | 'process' | 'system';
  code: string;           // 错误代码
  message: string;        // 错误消息
  details?: string;       // 详细信息
  row?: number;           // 相关行号
  column?: string;        // 相关列号
  item?: string;          // 相关项目编码
  recoverable: boolean;   // 是否可恢复
}
```

---

## TypeScript 类型定义

### AppState 接口

```typescript
// src/shared/types.ts

/**
 * 应用状态类型
 * 用于 useReducer 状态管理
 */
type AppState = 
  /** 初始状态，未选择任何文件 */
  | { phase: 'IDLE' }
  /** 文件已选择，可以开始处理 */
  | { 
      phase: 'READY'; 
      excelFile: FileInfo; 
      imageSource: FileInfo 
    }
  /** 处理进行中 */
  | { 
      phase: 'PROCESSING'; 
      progress: number;  // 0-100
      current: string;   // 当前处理的 SKU 编码
    }
  /** 处理完成 */
  | { 
      phase: 'COMPLETE'; 
      result: ProcessingResult 
    }
  /** 发生错误 */
  | { 
      phase: 'ERROR'; 
      error: Error 
    };
```

### Action 类型

```typescript
/**
 * Redux Action 类型定义
 */
type AppAction =
  | { type: 'FILE_SELECT_START' }
  | { type: 'FILE_SELECT_SUCCESS'; payload: { fileType: string; file: FileInfo } }
  | { type: 'FILE_SELECT_ERROR'; payload: string }
  | { type: 'FILE_SELECT_CANCELLED' }
  | { type: 'PROCESSING_START' }
  | { type: 'PROCESSING_UPDATE'; payload: ProgressInfo }
  | { type: 'PROCESSING_COMPLETE'; payload: ProcessingResult }
  | { type: 'PROCESSING_ERROR'; payload: ErrorInfo }
  | { type: 'PROCESSING_CANCEL' }
  | { type: 'PROCESSING_CANCELLED' }
  | { type: 'ERROR_RETRY' }
  | { type: 'ERROR_SKIP' }
  | { type: 'ERROR_CANCEL' }
  | { type: 'RESET' };
```

### 文件信息类型

```typescript
/**
 * 文件元数据接口
 */
interface FileInfo {
  /** 文件名（含扩展名） */
  name: string;
  /** 文件绝对路径 */
  path: string;
  /** 文件大小（字节） */
  size: number;
  /** 文件类型 */
  type: 'excel' | 'folder' | 'zip' | 'rar';
  /** 最后修改时间 */
  lastModified?: Date;
  /** 额外元数据 */
  metadata?: {
    /** Excel 行数 */
    rowCount?: number;
    /** 压缩包内文件数 */
    fileCount?: number;
    /** 文件夹内图片数 */
    imageCount?: number;
  };
}
```

### 处理结果类型

```typescript
/**
 * 处理结果接口
 */
interface ProcessingResult {
  /** 统计信息 */
  stats: {
    total: number;
    success: number;
    failed: number;
    successRate: number;
  };
  /** 输出文件路径 */
  outputPath: string;
  /** 错误详情列表 */
  errors: Array<{
    /** SKU 编码 */
    sku: string;
    /** 错误信息 */
    message: string;
    /** Excel 行号 */
    row: number;
    /** Excel 列号 */
    column: string;
  }>;
  /** 处理开始时间 */
  startTime: Date;
  /** 处理结束时间 */
  endTime: Date;
  /** 总耗时（毫秒） */
  duration: number;
}
```

---

## 代码示例

### 完整 App 组件示例

```tsx
import React, { useEffect } from 'react';
import { FilePicker, ProgressBar, ResultView, ErrorDialog, InfoPanel } from './components';
import { useProcessState } from './hooks/useProcessState';
import { ipcRenderer } from 'electron';

export function App() {
  const { state, send, is, reset, cancel } = useProcessState();

  // 监听 IPC 消息
  useEffect(() => {
    const unsubscribeProgress = ipcRenderer.on('progress', (event, data) => {
      send({ type: 'PROGRESS', payload: data });
    });

    const unsubscribeComplete = ipcRenderer.on('complete', (event, data) => {
      send({ type: 'COMPLETE', payload: data });
    });

    const unsubscribeError = ipcRenderer.on('error', (event, error) => {
      send({ type: 'ERROR', payload: new Error(error.message) });
    });

    return () => {
      unsubscribeProgress();
      unsubscribeComplete();
      unsubscribeError();
    };
  }, [send]);

  // IDLE 状态
  if (is('IDLE')) {
    return (
      <div className="app-container app-view--idle">
        <h1 className="app-title">ImageAutoInserter</h1>
        
        <FilePicker
          label="选择 Excel 文件"
          description="请选择要处理的 Excel 表格文件"
          icon="document"
          accept=".xlsx,.xls"
          value={null}
          onChange={(file) => file && send({ type: 'SELECT_EXCEL', payload: file })}
          data-testid="excel-picker"
        />

        <FilePicker
          label="选择图片源"
          description="选择包含商品图片的文件夹或压缩包"
          icon="zip"
          accept=".zip,.rar"
          value={null}
          onChange={(file) => file && send({ type: 'SELECT_IMAGE_SOURCE', payload: file })}
          disabled={true}
          data-testid="image-source-picker"
        />
      </div>
    );
  }

  // READY 状态
  if (is('READY')) {
    return (
      <div className="app-container app-view--ready">
        <InfoPanel
          title="Excel 文件已选择"
          type="success"
          bordered={true}
        >
          <div>文件名：{state.excelFile.name}</div>
          <div>路径：{state.excelFile.path}</div>
        </InfoPanel>

        <InfoPanel
          title="图片源已选择"
          type="success"
          bordered={true}
        >
          <div>文件名：{state.imageSource.name}</div>
          <div>类型：{state.imageSource.type}</div>
        </InfoPanel>

        <button 
          className="primary-button"
          onClick={() => {
            send({ type: 'START' });
            ipcRenderer.invoke('start-process', {
              excelPath: state.excelFile.path,
              imageSourcePath: state.imageSource.path
            });
          }}
        >
          开始处理
        </button>
      </div>
    );
  }

  // PROCESSING 状态
  if (is('PROCESSING')) {
    return (
      <div className="app-container app-view--processing">
        <InfoPanel title="正在处理..." type="info">
          <ProgressBar 
            value={state.progress} 
            showLabel={true}
            customLabel={`已完成 ${state.progress}%`}
          />
          <p>当前处理：{state.current}</p>
        </InfoPanel>

        <button className="secondary-button" onClick={cancel}>
          取消处理
        </button>
      </div>
    );
  }

  // COMPLETE 状态
  if (is('COMPLETE') && state.result) {
    return (
      <div className="app-container app-view--complete">
        <h2 className="success-title">✓ 处理完成！</h2>
        
        <ResultView
          stats={state.result.stats}
          onViewErrors={() => {
            // 显示错误详情
          }}
          onOpenFile={() => {
            ipcRenderer.invoke('open-file', state.result!.outputPath);
          }}
          onReset={reset}
        />
      </div>
    );
  }

  // ERROR 状态
  if (is('ERROR')) {
    return (
      <div className="app-container app-view--error">
        <ErrorDialog
          isOpen={true}
          title="处理错误"
          message={state.error?.message || '未知错误'}
          onClose={reset}
        />
      </div>
    );
  }

  return null;
}
```

---

**文档结束**
