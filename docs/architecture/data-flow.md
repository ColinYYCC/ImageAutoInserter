# GUI 重构项目数据流文档

> **版本**: v1.0  
> **创建日期**: 2026-03-08  
> **状态**: 设计完成  
> **适用范围**: ImageAutoInserter GUI 版本 (Electron + React + Python)  
> **配套文档**: [spec.md](../../.trae/specs/gui-redesign/spec.md), [mockup.md](./gui-redesign/mockup.md)

---

## 目录

1. [系统架构概览](#系统架构概览)
2. [文件选择流程](#文件选择流程)
3. [处理流程](#处理流程)
4. [状态同步流程](#状态同步流程)
5. [错误处理流程](#错误处理流程)
6. [IPC 消息格式](#ipc-消息格式)
7. [附录](#附录)

---

## 1. 系统架构概览

### 1.1 三层架构设计

本系统采用三层进程分离架构，确保 UI 响应性、系统安全性和功能可扩展性：

```mermaid
graph TB
    subgraph "Renderer Process (React 18)"
        UI[UI 组件层]
        HOOKS[自定义 Hooks]
        STATE[状态管理 useReducer]
        IPC_R[IPC Bridge]
    end
    
    subgraph "Main Process (Node.js/Electron)"
        WM[窗口管理]
        IPC_H[IPC 处理器]
        FM[文件系统]
        PM[进程管理]
    end
    
    subgraph "Python Process"
        PY[processor.py]
        EXCEL[Excel 处理]
        IMG[图片匹配]
        INSERT[图片嵌入]
    end
    
    UI --> HOOKS
    HOOKS --> STATE
    STATE --> IPC_R
    IPC_R -.IPC.-> IPC_H
    IPC_H --> WM
    IPC_H --> FM
    IPC_H --> PM
    PM -.spawn-.-> PY
    PY --> EXCEL
    PY --> IMG
    PY --> INSERT
```

### 1.2 进程职责划分

| 进程 | 技术栈 | 核心职责 | 关键模块 |
|------|--------|---------|---------|
| **Renderer** | React 18 + TS 5 | UI 渲染、用户交互、状态展示 | App.tsx, components/, hooks/ |
| **Main** | Node.js + Electron 28 | 窗口管理、文件操作、进程调度 | main.ts, ipc-handlers.ts, file-ops.ts |
| **Python** | Python 3.8+ | Excel 处理核心逻辑、图片嵌入 | processor.py |

### 1.3 IPC 通信机制

```mermaid
sequenceDiagram
    participant R as Renderer Process
    participant M as Main Process
    participant P as Python Process
    
    R->>M: ipcRenderer.invoke(channel, data)
    Note over R,M: 异步请求 - 等待响应
    
    M->>R: ipcMain.handle(channel, handler)
    Note over M,R: 注册处理器
    
    M->>R: webContents.send(channel, data)
    Note over M,R: 单向事件推送
    
    R->>M: ipcRenderer.on(channel, listener)
    Note over R,M: 订阅事件
    
    M->>P: child_process.spawn()
    Note over M,P: 启动 Python 进程
    
    P->>M: stdout.on('data')
    Note over P,M: 标准输出流
```

### 1.4 数据流向总览

```mermaid
graph LR
    User[用户] -->|点击/输入 | Renderer[Renderer Process]
    Renderer -->|IPC 请求 | Main[Main Process]
    Main -->|文件操作 | FileSystem[(文件系统)]
    Main -->|进程调用 | Python[Python Process]
    Python -->|Excel 处理 | ExcelFile[(Excel 文件)]
    Python -->|图片嵌入 | ExcelFile
    Python -->|进度/结果 | Main
    Main -->|IPC 响应 | Renderer
    Renderer -->|UI 更新 | User
```

---

## 2. 文件选择流程

### 2.1 Excel 文件选择流程

```mermaid
sequenceDiagram
    autonumber
    participant U as 用户
    participant R as Renderer (React)
    participant M as Main Process
    participant FS as 文件系统
    
    U->>R: 点击"选择 Excel 文件"按钮
    R->>R: dispatch({ type: 'FILE_SELECT_START' })
    Note over R: 状态：IDLE → FILE_SELECTING
    
    R->>M: ipcRenderer.invoke('select-file', { type: 'excel' })
    Note over R,M: 异步请求，等待用户选择
    
    M->>M: dialog.showOpenDialog({ filters: [{ name: 'Excel', extensions: ['xlsx'] }] })
    M->>U: 显示系统文件选择对话框
    
    alt 用户选择文件
        U->>M: 选择文件并确认
        M->>FS: 读取文件元数据
        
        FS-->>M: 返回 { path, name, size }
        M->>M: 验证文件格式 (.xlsx)
        
        alt 格式有效
            M-->>R: 返回 { success: true, file: FileInfo }
            R->>R: dispatch({ type: 'FILE_SELECT_SUCCESS', payload: { fileType: 'excel', file } })
            Note over R: 状态：FILE_SELECTING → EXCEL_SELECTED
            
            R->>U: 更新 UI，显示文件卡片
        else 格式无效
            M-->>R: 返回 { success: false, error: 'Invalid file type' }
            R->>R: dispatch({ type: 'FILE_SELECT_ERROR', payload: error })
            R->>U: 显示错误提示
        end
    else 用户取消
        U->>M: 点击取消
        M-->>R: 返回 { success: false, cancelled: true }
        R->>R: dispatch({ type: 'FILE_SELECT_CANCELLED' })
        Note over R: 状态：FILE_SELECTING → IDLE
    end
```

### 2.2 图片源选择流程

```mermaid
sequenceDiagram
    autonumber
    participant U as 用户
    participant R as Renderer (React)
    participant M as Main Process
    participant FS as 文件系统
    
    Note over U,R: 前置条件：Excel 文件已选择
    
    U->>R: 点击"选择图片源"按钮
    R->>R: dispatch({ type: 'FILE_SELECT_START' })
    Note over R: 状态：EXCEL_SELECTED → IMAGE_SELECTING
    
    R->>M: ipcRenderer.invoke('select-file', { type: 'image-source' })
    Note over R,M: 接受 folder/zip/rar
    
    M->>M: dialog.showOpenDialog({<br/>  filters: [<br/>    { name: 'Folder', extensions: [] },<br/>    { name: 'Archive', extensions: ['zip', 'rar'] }<br/>  ],<br/>  properties: ['openFile', 'openDirectory']<br/>})
    
    M->>U: 显示系统文件选择对话框
    
    alt 用户选择文件夹
        U->>M: 选择文件夹
        M->>FS: 扫描文件夹内容
        FS-->>M: 返回图片数量统计
        M->>M: 验证包含图片文件
        M-->>R: 返回 { success: true, file: { type: 'folder', path, imageCount } }
    else 用户选择压缩包
        U->>M: 选择 .zip/.rar 文件
        M->>FS: 读取压缩包元数据
        FS-->>M: 返回 { path, size }
        M->>M: 验证压缩包格式
        M-->>R: 返回 { success: true, file: { type: 'zip'|'rar', path, size } }
    else 用户取消
        U->>M: 点击取消
        M-->>R: 返回 { success: false, cancelled: true }
    end
    
    R->>R: dispatch({ type: 'FILE_SELECT_SUCCESS', payload: { fileType: 'image-source', file } })
    Note over R: 状态：IMAGE_SELECTING → READY
    
    R->>U: 更新 UI，激活"开始处理"按钮
```

### 2.3 文件验证流程

```mermaid
graph TD
    A[用户选择文件] --> B{文件类型判断}
    
    B -->|Excel 文件 | C{扩展名检查}
    C -->|.xlsx| D[验证 Excel 格式]
    C -->|其他 | E[❌ 错误：不支持的格式]
    
    D --> F{包含商品编码列？}
    F -->|是 | G[✅ Excel 验证通过]
    F -->|否 | H[❌ 错误：缺少必需列]
    
    B -->|图片源 - 文件夹 | I[扫描文件夹]
    I --> J{包含图片文件？}
    J -->|是 | K[✅ 文件夹验证通过]
    J -->|否 | L[❌ 错误：空文件夹]
    
    B -->|图片源 - 压缩包 | M{扩展名检查}
    M -->|.zip|.N[验证 ZIP 格式]
    M -->|.rar| O[验证 RAR 格式]
    M -->|其他 | P[❌ 错误：不支持的格式]
    
    N --> Q{格式有效？}
    Q -->|是 | R[✅ ZIP 验证通过]
    Q -->|否 | S[❌ 错误：损坏的压缩包]
    
    O --> T{格式有效？}
    T -->|是 | U[✅ RAR 验证通过]
    T -->|否 | V[❌ 错误：损坏的压缩包]
```

---

## 3. 处理流程

### 3.1 完整处理流程（用户 → Renderer → Main → Python）

```mermaid
sequenceDiagram
    autonumber
    participant U as 用户
    participant R as Renderer (React)
    participant M as Main Process
    participant P as Python Process
    participant XL as Excel 文件
    
    Note over U,XL: 阶段 1: 启动处理
    U->>R: 点击"开始处理"按钮
    R->>R: dispatch({ type: 'PROCESSING_START' })
    Note over R: 状态：READY → PROCESSING
    
    R->>M: ipcRenderer.invoke('start-process', {<br/>  excelPath: '/path/to/file.xlsx',<br/>  imageSourcePath: '/path/to/images.zip'<br/>})
    
    M->>M: 创建 Python 子进程
    M->>P: spawn('python', ['processor.py', args])
    Note over M,P: 通过 stdin/stdout 通信
    
    Note over U,XL: 阶段 2: Python 处理循环
    loop 遍历 Excel 每一行
        P->>XL: 读取当前行商品编码
        XL-->>P: 返回编码值 (如 C000123456)
        
        P->>P: 在图片源中查找匹配图片
        P->>XL: 定位到对应单元格
        P->>XL: 嵌入图片到单元格
        XL-->>P: 确认嵌入成功
        
        P->>M: stdout.write(JSON.stringify({<br/>  type: 'progress',<br/>  current: 'C000123456',<br/>  row: 45<br/>}))
        
        M->>M: 解析进度数据
        M->>R: webContents.send('progress', {<br/>  percent: 67,<br/>  current: 'C000123456',<br/>  row: 45,<br/>  total: 100<br/>})
        
        R->>R: dispatch({ type: 'PROCESSING_UPDATE', payload: progress })
        Note over R: 更新进度条和当前项目显示
        R->>U: UI 实时更新
    end
    
    Note over U,XL: 阶段 3: 处理完成
    P->>XL: 保存修改后的 Excel
    XL-->>P: 保存成功
    
    P->>M: stdout.write(JSON.stringify({<br/>  type: 'complete',<br/>  result: { total, success, failed, errors }<br/>}))
    P->>M: process.exit(0)
    
    M->>M: 清理 Python 进程
    M->>R: webContents.send('complete', result)
    
    R->>R: dispatch({ type: 'PROCESSING_COMPLETE', payload: result })
    Note over R: 状态：PROCESSING → COMPLETE
    
    R->>U: 显示处理完成界面（统计卡片 + 操作按钮）
```

### 3.2 进度更新数据流

```mermaid
graph LR
    A[Python 处理行] --> B[stdout.write JSON]
    B --> C{Main Process 监听}
    C --> D[解析进度数据]
    D --> E[webContents.send 'progress']
    E --> F{Renderer 监听}
    F --> G[dispatch PROCESSING_UPDATE]
    G --> H[useReducer 更新 state]
    H --> I[React 重新渲染]
    I --> J[更新进度条宽度]
    I --> K[更新当前项目文字]
    I --> L[更新统计信息]
```

### 3.3 行处理循环详细流程

```mermaid
flowchart TD
    Start[开始处理] --> Init[初始化 Excel 应用]
    Init --> ReadHeader[读取表头确定编码列]
    ReadHeader --> GetRowCount[获取总行数]
    
    GetRowCount --> LoopStart{行索引 < 总行数？}
    
    LoopStart -->|是 | ReadCode[读取当前行商品编码]
    ReadCode --> ValidateCode{编码有效？}
    
    ValidateCode -->|无效 | SkipRow[跳过该行，记录错误]
    SkipRow --> UpdateProgress[发送进度更新]
    
    ValidateCode -->|有效 | SearchImage[在图片源中搜索匹配图片]
    SearchImage --> FoundCheck{找到图片？}
    
    FoundCheck -->|未找到 | LogError[记录错误：图片不存在]
    LogError --> UpdateProgress
    
    FoundCheck -->|找到 | LoadImage[加载图片文件]
    LoadImage --> ResizeImage[调整图片尺寸]
    ResizeImage --> InsertImage[嵌入图片到单元格]
    
    InsertImage --> SaveCheck{保存成功？}
    SaveCheck -->|成功 | IncrementSuccess[成功数 +1]
    SaveCheck -->|失败 | IncrementFailed[失败数 +1]
    
    IncrementSuccess --> UpdateProgress
    IncrementFailed --> UpdateProgress
    
    UpdateProgress --> IncrementRow[行索引 +1]
    IncrementRow --> LoopStart
    
    LoopStart -->|否 | SaveExcel[保存修改后的 Excel 文件]
    SaveExcel --> SendComplete[发送完成消息]
    SendComplete --> End[处理结束]
```

### 3.4 取消处理流程

```mermaid
sequenceDiagram
    autonumber
    participant U as 用户
    participant R as Renderer (React)
    participant M as Main Process
    participant P as Python Process
    
    Note over U,P: 处理进行中...
    
    U->>R: 点击"取消"按钮
    R->>R: dispatch({ type: 'PROCESSING_CANCEL' })
    
    R->>M: ipcRenderer.invoke('cancel-process')
    Note over R,M: 请求取消
    
    M->>P: process.kill('SIGTERM')
    Note over M,P: 终止 Python 进程
    
    P->>P: 捕获终止信号
    P->>P: 清理临时文件
    P->>P: 关闭 Excel 应用
    
    P->>M: 进程退出 (code: null, signal: 'SIGTERM')
    M->>M: 清理进程资源
    
    M->>R: 返回 { success: false, cancelled: true }
    R->>R: dispatch({ type: 'PROCESSING_CANCELLED' })
    Note over R: 状态：PROCESSING → IDLE
    
    R->>U: 显示取消确认提示
```

---

## 4. 状态同步流程

### 4.1 状态机转换图

基于 [spec.md](../../.trae/specs/gui-redesign/spec.md#状态机设计) 定义的状态机：

```mermaid
stateDiagram-v2
    [*] --> IDLE: 应用启动
    
    IDLE --> READY: 选择 Excel 文件<br/>选择图片源
    READY --> PROCESSING: 点击"开始处理"
    
    PROCESSING --> COMPLETE: 处理成功
    PROCESSING --> ERROR: 发生错误
    PROCESSING --> IDLE: 用户取消
    
    COMPLETE --> IDLE: 点击"返回首页"
    
    ERROR --> IDLE: 关闭错误对话框
    ERROR --> READY: 重试（保留文件选择）
    
    note right of IDLE
        初始状态
        显示两个文件选择卡片
    end note
    
    note right of READY
        文件已选择
        开始处理按钮激活
    end note
    
    note right of PROCESSING
        显示进度条
        可取消操作
    end note
    
    note right of COMPLETE
        显示统计结果
        提供操作按钮
    end note
    
    note right of ERROR
        显示错误信息
        提供重试选项
    end note
```

### 4.2 useReducer 数据流图

```mermaid
graph TB
    subgraph "Action Dispatch"
        U[用户交互] --> A1[FILE_SELECT_START]
        U --> A2[FILE_SELECT_SUCCESS]
        U --> A3[FILE_SELECT_ERROR]
        U --> A4[PROCESSING_START]
        U --> A5[PROCESSING_UPDATE]
        U --> A6[PROCESSING_COMPLETE]
        U --> A7[PROCESSING_ERROR]
        U --> A8[PROCESSING_CANCEL]
        U --> A9[RESET]
    end
    
    subgraph "useReducer"
        S[当前 State] --> R[Reducer Function]
        A1 --> R
        A2 --> R
        A3 --> R
        A4 --> R
        A5 --> R
        A6 --> R
        A7 --> R
        A8 --> R
        A9 --> R
        
        R --> N[新 State]
    end
    
    subgraph "State Phases"
        N --> P1{phase 字段}
        P1 -->|'IDLE'| IDLE[IDLE 状态]
        P1 -->|'READY'| READY[READY 状态]
        P1 -->|'PROCESSING'| PROC[PROCESSING 状态]
        P1 -->|'COMPLETE'| COMP[COMPLETE 状态]
        P1 -->|'ERROR'| ERR[ERROR 状态]
    end
    
    subgraph "UI Render"
        IDLE --> V1[渲染文件选择卡片]
        READY --> V2[显示文件信息 + 开始按钮]
        PROC --> V3[显示进度条 + 取消按钮]
        COMP --> V4[显示统计 + 操作按钮]
        ERR --> V5[显示错误对话框]
    end
    
    N --> UI[React 组件]
    UI --> V1
    UI --> V2
    UI --> V3
    UI --> V4
    UI --> V5
```

### 4.3 Action Dispatch 和 State 更新流程

```mermaid
sequenceDiagram
    autonumber
    participant U as 用户
    participant C as React Component
    participant H as Hook (useDispatch)
    participant R as Reducer
    participant S as State
    participant V as View (Render)
    
    Note over U,V: 示例：用户选择文件
    
    U->>C: 点击"选择 Excel 文件"
    C->>H: dispatch({ type: 'FILE_SELECT_START' })
    
    H->>R: reducer(currentState, action)
    Note over R: 匹配 FILE_SELECT_START case
    
    R->>S: 返回新 state:<br/>{ phase: 'FILE_SELECTING', ... }
    Note over S: 不可变更新，创建新对象
    
    S->>V: React 检测到 state 变化
    V->>V: 重新渲染组件
    
    Note over U,V: 异步操作完成后...
    
    H->>R: dispatch({<br/>  type: 'FILE_SELECT_SUCCESS',<br/>  payload: { fileType: 'excel', file }<br/>})
    
    R->>S: 返回新 state:<br/>{ phase: 'EXCEL_SELECTED', excelFile: file, ... }
    
    S->>V: React 再次重新渲染
    V->>U: 显示文件卡片（实线边框）
```

### 4.4 状态字段详细说明

```typescript
// 完整 State 类型定义
interface AppState {
  // 当前阶段（决定渲染哪个视图）
  phase: 'IDLE' | 'READY' | 'PROCESSING' | 'COMPLETE' | 'ERROR';
  
  // 文件选择信息（READY 阶段使用）
  excelFile: FileInfo | null;
  imageSource: FileInfo | null;
  
  // 处理进度（PROCESSING 阶段使用）
  progress: {
    percent: number;      // 0-100
    current: string;      // 当前处理的项目编码
    row: number;          // 当前行号
    total: number;        // 总行数
  } | null;
  
  // 处理结果（COMPLETE 阶段使用）
  result: ProcessingResult | null;
  
  // 错误信息（ERROR 阶段使用）
  error: {
    type: 'file' | 'process' | 'system';
    message: string;
    details?: string;
  } | null;
}

// 文件信息类型
interface FileInfo {
  name: string;           // 文件名
  path: string;           // 完整路径
  size: number;           // 文件大小（字节）
  type: 'excel' | 'folder' | 'zip' | 'rar';
  imageCount?: number;    // 图片数量（仅图片源）
}

// 处理结果类型
interface ProcessingResult {
  total: number;          // 总项目数
  success: number;        // 成功数
  failed: number;         // 失败数
  successRate: number;    // 成功率（百分比）
  errors: Array<{         // 错误详情列表
    item: string;         // 项目编码
    message: string;      // 错误消息
    row: number;          // 行号
    column: string;       // 列号
  }>;
}
```

---

## 5. 错误处理流程

### 5.1 错误分类和处理图

```mermaid
graph TD
    A[错误发生] --> B{错误类型判断}
    
    B -->|文件错误 | C[FileError]
    C --> C1[文件不存在]
    C --> C2[文件格式不支持]
    C --> C3[文件损坏]
    C --> C4[权限不足]
    
    B -->|处理错误 | D[ProcessError]
    D --> D1[图片未找到]
    D --> D2[Excel 格式错误]
    D --> D3[单元格嵌入失败]
    D --> D4[编码列不存在]
    
    B -->|系统错误 | E[SystemError]
    E --> E1[Python 进程崩溃]
    E --> E2[内存不足]
    E --> E3[IPC 通信失败]
    E --> E4[未知异常]
    
    C1 --> F{错误级别}
    C2 --> F
    C3 --> F
    C4 --> F
    D1 --> F
    D2 --> F
    D3 --> F
    D4 --> F
    E1 --> F
    E2 --> F
    E3 --> F
    E4 --> F
    
    F -->|轻微 | G[显示 Toast 提示<br/>继续处理]
    F -->|中等 | H[显示错误对话框<br/>提供跳过选项]
    F -->|严重 | I[终止处理<br/>显示完整错误报告]
    
    G --> J[记录错误日志]
    H --> K{用户选择}
    K -->|跳过 | L[跳过当前项<br/>继续下一项]
    K -->|重试 | M[重试当前操作]
    K -->|取消 | N[终止流程]
    
    I --> O[显示错误详情页]
    O --> P[提供错误日志导出]
    
    J --> Q[更新错误统计]
    L --> Q
    M --> Q
    N --> Q
```

### 5.2 错误日志格式（JSON 结构）

```json
{
  "timestamp": "2026-03-08T14:30:45.123Z",
  "errorId": "err_20260308_143045_001",
  "sessionId": "session_abc123",
  
  "error": {
    "type": "process",
    "category": "image_not_found",
    "severity": "medium",
    "message": "图片文件未找到",
    "details": "商品编码 C000123789 对应的图片不存在"
  },
  
  "context": {
    "excelFile": "/Users/shimengyu/Documents/product_list.xlsx",
    "imageSource": "/Users/shimengyu/Downloads/product_images.zip",
    "currentRow": 45,
    "currentColumn": "C",
    "currentItem": "C000123789",
    "progress": {
      "percent": 67,
      "processed": 67,
      "total": 100
    }
  },
  
  "stack": {
    "python": [
      "File \"processor.py\", line 156, in process_row",
      "  image = find_matching_image(item_code, image_source)",
      "File \"processor.py\", line 89, in find_matching_image",
      "  raise FileNotFoundError(f\"Image not found: {item_code}\")"
    ],
    "main": [
      "at PythonProcess.handle (/src/main/python-bridge.ts:45:12)",
      "at EventEmitter.<anonymous> (/src/main/ipc-handlers.ts:78:5)"
    ]
  },
  
  "userAction": {
    "action": "skip",
    "timestamp": "2026-03-08T14:30:46.456Z"
  },
  
  "system": {
    "platform": "darwin",
    "arch": "arm64",
    "nodeVersion": "v18.16.0",
    "pythonVersion": "3.9.7",
    "electronVersion": "28.0.0",
    "memoryUsage": {
      "heapUsed": "145MB",
      "heapTotal": "256MB",
      "rss": "312MB"
    }
  }
}
```

### 5.3 用户操作流程（重试/跳过/取消）

```mermaid
sequenceDiagram
    autonumber
    participant U as 用户
    participant R as Renderer (React)
    participant M as Main Process
    participant P as Python Process
    
    Note over U,P: 错误发生场景
    
    P->>M: stdout.write(JSON.stringify({<br/>  type: 'error',<br/>  error: { code, message, row }<br/>}))
    
    M->>R: webContents.send('error', errorData)
    R->>R: dispatch({ type: 'PROCESSING_ERROR', payload: errorData })
    Note over R: 状态：PROCESSING → ERROR
    
    R->>U: 显示错误对话框<br/>（错误信息 + 操作按钮）
    
    Note over U,R: 用户选择 1: 重试
    U->>R: 点击"重试"按钮
    R->>R: dispatch({ type: 'ERROR_RETRY' })
    Note over R: 状态：ERROR → PROCESSING
    
    R->>M: ipcRenderer.invoke('retry-operation', { row })
    M->>P: 重新执行当前行处理
    
    alt 重试成功
        P-->>M: 返回成功
        M-->>R: 返回成功
        R->>R: dispatch({ type: 'PROCESSING_UPDATE' })
        Note over R: 继续处理
    else 重试失败
        P-->>M: 返回失败
        M-->>R: 返回失败
        R->>U: 再次显示错误对话框
    end
    
    Note over U,R: 用户选择 2: 跳过
    U->>R: 点击"跳过"按钮
    R->>R: dispatch({ type: 'ERROR_SKIP' })
    Note over R: 状态：ERROR → PROCESSING
    
    R->>M: ipcRenderer.invoke('skip-operation', { row })
    M->>P: 跳过当前行，处理下一行
    
    P-->>M: 继续处理
    M->>R: webContents.send('progress', ...)
    R->>R: dispatch({ type: 'PROCESSING_UPDATE' })
    
    Note over U,R: 用户选择 3: 取消
    U->>R: 点击"取消"按钮
    R->>R: dispatch({ type: 'ERROR_CANCEL' })
    Note over R: 状态：ERROR → IDLE
    
    R->>M: ipcRenderer.invoke('cancel-process')
    M->>P: process.kill()
    
    P->>P: 清理并退出
    M->>M: 清理资源
    M->>R: 返回取消确认
    R->>U: 显示取消确认界面
```

### 5.4 错误恢复策略

| 错误类型 | 严重级别 | 恢复策略 | 用户操作 |
|---------|---------|---------|---------|
| **文件不存在** | 中等 | 提示用户检查路径，提供重试 | 重试/跳过/取消 |
| **文件格式不支持** | 严重 | 终止处理，显示支持格式列表 | 取消/重新选择 |
| **图片未找到** | 轻微 | 记录错误，继续下一项 | 自动跳过 |
| **Excel 嵌入失败** | 中等 | 重试 3 次，失败则跳过 | 重试/跳过/取消 |
| **Python 进程崩溃** | 严重 | 重启进程，恢复到最后检查点 | 重试/取消 |
| **内存不足** | 严重 | 释放资源，建议分批处理 | 取消 |
| **权限错误** | 中等 | 提示用户检查文件权限 | 重试/取消 |

---

## 6. IPC 消息格式

### 6.1 Renderer → Main 消息

#### 6.1.1 select-file（选择文件）

```typescript
// 请求
interface SelectFileRequest {
  channel: 'select-file';
  payload: {
    type: 'excel' | 'image-source';
    accept?: string[];  // 可选，自定义接受的文件扩展名
  };
}

// 响应
interface SelectFileResponse {
  success: boolean;
  cancelled?: boolean;
  file?: FileInfo;
  error?: string;
}

// 使用示例
const result = await ipcRenderer.invoke('select-file', {
  type: 'excel',
  accept: ['.xlsx']
});

if (result.success) {
  console.log('Selected file:', result.file);
}
```

#### 6.1.2 start-process（开始处理）

```typescript
// 请求
interface StartProcessRequest {
  channel: 'start-process';
  payload: {
    excelPath: string;      // Excel 文件绝对路径
    imageSourcePath: string; // 图片源绝对路径
    options?: {
      skipExisting?: boolean;  // 跳过已嵌入图片的单元格
      columnMapping?: {        // 列映射配置
        itemCode: string;      // 商品编码列（默认：'C'）
        targetColumn: string;  // 目标列（默认：'D'）
      };
    };
  };
}

// 响应（立即返回，实际结果通过事件推送）
interface StartProcessResponse {
  success: boolean;
  processId?: number;
  error?: string;
}

// 使用示例
const result = await ipcRenderer.invoke('start-process', {
  excelPath: '/Users/shimengyu/Documents/product_list.xlsx',
  imageSourcePath: '/Users/shimengyu/Downloads/product_images.zip',
  options: {
    skipExisting: true,
    columnMapping: {
      itemCode: 'C',
      targetColumn: 'D'
    }
  }
});
```

#### 6.1.3 cancel-process（取消处理）

```typescript
// 请求
interface CancelProcessRequest {
  channel: 'cancel-process';
  payload: {};
}

// 响应
interface CancelProcessResponse {
  success: boolean;
  cancelled: boolean;
  error?: string;
}

// 使用示例
const result = await ipcRenderer.invoke('cancel-process');
if (result.cancelled) {
  console.log('Process cancelled by user');
}
```

#### 6.1.4 open-file（打开文件）

```typescript
// 请求
interface OpenFileRequest {
  channel: 'open-file';
  payload: {
    path: string;  // 文件绝对路径
  };
}

// 响应
interface OpenFileResponse {
  success: boolean;
  error?: string;
}

// 使用示例
await ipcRenderer.invoke('open-file', {
  path: '/Users/shimengyu/Documents/product_list_processed.xlsx'
});
```

#### 6.1.5 retry-operation（重试操作）

```typescript
// 请求
interface RetryOperationRequest {
  channel: 'retry-operation';
  payload: {
    row: number;        // 行号
    itemCode: string;   // 商品编码
  };
}

// 响应
interface RetryOperationResponse {
  success: boolean;
  error?: string;
}
```

#### 6.1.6 skip-operation（跳过操作）

```typescript
// 请求
interface SkipOperationRequest {
  channel: 'skip-operation';
  payload: {
    row: number;  // 行号
  };
}

// 响应
interface SkipOperationResponse {
  success: boolean;
}
```

### 6.2 Main → Renderer 消息

#### 6.2.1 progress（进度更新）

```typescript
// 事件
interface ProgressEvent {
  channel: 'progress';
  payload: {
    percent: number;        // 进度百分比 (0-100)
    current: string;        // 当前处理的项目编码
    row: number;            // 当前行号
    total: number;          // 总行数
    processed: number;      // 已处理数
    success: number;        // 成功数
    failed: number;         // 失败数
    estimatedRemaining?: string; // 预计剩余时间（可选）
  };
}

// 监听示例
ipcRenderer.on('progress', (event, data) => {
  dispatch({
    type: 'PROCESSING_UPDATE',
    payload: {
      percent: data.percent,
      current: data.current,
      row: data.row,
      total: data.total
    }
  });
});
```

#### 6.2.2 complete（处理完成）

```typescript
// 事件
interface CompleteEvent {
  channel: 'complete';
  payload: ProcessingResult;
}

interface ProcessingResult {
  total: number;          // 总项目数
  success: number;        // 成功数
  failed: number;         // 失败数
  successRate: number;    // 成功率（百分比）
  outputFile: string;     // 输出文件路径
  errors: Array<{
    item: string;         // 项目编码
    message: string;      // 错误消息
    row: number;          // 行号
    column: string;       // 列号
  }>;
}

// 监听示例
ipcRenderer.on('complete', (event, result) => {
  dispatch({
    type: 'PROCESSING_COMPLETE',
    payload: result
  });
});
```

#### 6.2.3 error（错误发生）

```typescript
// 事件
interface ErrorEvent {
  channel: 'error';
  payload: {
    type: 'file' | 'process' | 'system';
    code: string;         // 错误代码
    message: string;      // 错误消息
    details?: string;     // 详细信息
    row?: number;         // 相关行号
    column?: string;      // 相关列号
    item?: string;        // 相关项目编码
    recoverable: boolean; // 是否可恢复
  };
}

// 监听示例
ipcRenderer.on('error', (event, error) => {
  dispatch({
    type: 'PROCESSING_ERROR',
    payload: {
      type: error.type,
      message: error.message,
      details: error.details,
      recoverable: error.recoverable
    }
  });
});
```

#### 6.2.4 file-selected（文件已选择 - 可选）

```typescript
// 事件（用于文件选择后的额外验证）
interface FileSelectedEvent {
  channel: 'file-selected';
  payload: {
    fileType: 'excel' | 'image-source';
    file: FileInfo;
    validation?: {
      valid: boolean;
      warnings?: string[];
      info?: {
        imageCount?: number;
        rowCount?: number;
      };
    };
  };
}
```

### 6.3 IPC 通道完整列表

| 方向 | 通道名 | 类型 | 描述 |
|------|--------|------|------|
| **R→M** | `select-file` | invoke | 选择文件对话框 |
| **R→M** | `start-process` | invoke | 开始处理请求 |
| **R→M** | `cancel-process` | invoke | 取消处理请求 |
| **R→M** | `open-file` | invoke | 打开文件请求 |
| **R→M** | `retry-operation` | invoke | 重试操作请求 |
| **R→M** | `skip-operation` | invoke | 跳过操作请求 |
| **M→R** | `progress` | send/on | 进度更新推送 |
| **M→R** | `complete` | send/on | 处理完成推送 |
| **M→R** | `error` | send/on | 错误事件推送 |
| **M→R** | `file-selected` | send/on | 文件选择验证推送 |

---

## 7. 附录

### 7.1 TypeScript 类型定义汇总

```typescript
// src/shared/types.ts

// ============ 状态类型 ============
type AppStatePhase = 'IDLE' | 'READY' | 'PROCESSING' | 'COMPLETE' | 'ERROR';

interface AppState {
  phase: AppStatePhase;
  excelFile: FileInfo | null;
  imageSource: FileInfo | null;
  progress: ProgressInfo | null;
  result: ProcessingResult | null;
  error: ErrorInfo | null;
}

// ============ 文件类型 ============
interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: 'excel' | 'folder' | 'zip' | 'rar';
  imageCount?: number;
}

// ============ 进度类型 ============
interface ProgressInfo {
  percent: number;
  current: string;
  row: number;
  total: number;
  processed: number;
  success: number;
  failed: number;
  estimatedRemaining?: string;
}

// ============ 结果类型 ============
interface ProcessingResult {
  total: number;
  success: number;
  failed: number;
  successRate: number;
  outputFile: string;
  errors: ProcessingError[];
}

interface ProcessingError {
  item: string;
  message: string;
  row: number;
  column: string;
}

// ============ 错误类型 ============
interface ErrorInfo {
  type: 'file' | 'process' | 'system';
  code: string;
  message: string;
  details?: string;
  row?: number;
  column?: string;
  item?: string;
  recoverable: boolean;
}

// ============ Action 类型 ============
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

// ============ IPC 请求/响应类型 ============
interface IPCRequest<T = any> {
  channel: string;
  payload: T;
}

interface IPCResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### 7.2 Reducer 实现示例

```typescript
// src/renderer/state/appReducer.ts

import { AppState, AppAction } from '../shared/types';

const initialState: AppState = {
  phase: 'IDLE',
  excelFile: null,
  imageSource: null,
  progress: null,
  result: null,
  error: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'FILE_SELECT_START':
      return {
        ...state,
        phase: 'FILE_SELECTING' as any,
      };
    
    case 'FILE_SELECT_SUCCESS':
      return {
        ...state,
        [action.payload.fileType === 'excel' ? 'excelFile' : 'imageSource']: action.payload.file,
        phase: action.payload.fileType === 'image-source' && state.excelFile 
          ? 'READY' 
          : state.phase,
      };
    
    case 'PROCESSING_START':
      return {
        ...state,
        phase: 'PROCESSING',
        progress: {
          percent: 0,
          current: '',
          row: 0,
          total: 0,
          processed: 0,
          success: 0,
          failed: 0,
        },
      };
    
    case 'PROCESSING_UPDATE':
      return {
        ...state,
        progress: action.payload,
      };
    
    case 'PROCESSING_COMPLETE':
      return {
        ...state,
        phase: 'COMPLETE',
        result: action.payload,
        progress: null,
      };
    
    case 'PROCESSING_ERROR':
      return {
        ...state,
        phase: 'ERROR',
        error: action.payload,
        progress: null,
      };
    
    case 'RESET':
      return initialState;
    
    default:
      return state;
  }
}
```

### 7.3 相关文档索引

| 文档 | 路径 | 描述 |
|------|------|------|
| **规格文档** | `.trae/specs/gui-redesign/spec.md` | GUI 设计规格说明书 |
| **任务分解** | `.trae/specs/gui-redesign/tasks.md` | 任务拆分文档 |
| **验收清单** | `.trae/specs/gui-redesign/checklist.md` | 验收标准清单 |
| **Mockup** | `docs/design/gui-redesign/mockup.md` | 视觉设计 Mockup |
| **Wireframe** | `docs/design/gui-redesign/wireframe.md` | 线框图 |
| **ADR** | `docs/architecture/adr/README.md` | 架构决策记录 |

### 7.4 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2026-03-08 | 初始版本，完成所有数据流设计 | Backend Architect |

---

**文档结束**
