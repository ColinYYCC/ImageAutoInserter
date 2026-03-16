# ADR-005: 为什么排除拖拽功能

**状态**: ✅ 接受  
**日期**: 2026-03-08  
**类型**: 功能范围定义  
**影响范围**: 用户交互方式、文件选择流程、开发工作量

---

## 背景

ImageAutoInserter 项目需要确定用户如何选择 Excel 文件和图片源文件。

### 常见文件选择方式

1. **点击按钮选择**: 用户点击"选择文件"按钮，打开系统文件对话框
2. **拖拽选择**: 用户将文件从文件管理器拖拽到应用窗口

### 项目特点

- **工具类应用**: 功能单一，专注于图片自动插入
- **目标用户**: 企业内部员工，非技术人员
- **使用频率**: 低频率使用（可能每周几次）
- **文件类型**: Excel 文件（.xlsx）和图片源（.zip/.rar 文件夹）

---

## 决策

**仅支持点击按钮选择文件**，不支持拖拽文件选择功能。

### 用户交互流程

```
┌────────────────────────────────────────────────┐
│  ImageAutoInserter                     [─][×] │
├────────────────────────────────────────────────┤
│                                                │
│              图片自动插入工具                   │
│              Image Auto Inserter                │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  📄 Excel 文件                           │ │
│  │  ┌────────────────────────────────────┐ │ │
│  │  │                                    │ │ │
│  │  │      未选择文件                    │ │ │
│  │  │                                    │ │ │
│  │  └────────────────────────────────────┘ │ │
│  │  [ 选择文件 ]  ← 点击此处               │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  🖼️ 图片源                               │ │
│  │  ┌────────────────────────────────────┐ │ │
│  │  │                                    │ │ │
│  │  │      未选择图片源                  │ │ │
│  │  │                                    │ │ │
│  │  └────────────────────────────────────┘ │ │
│  │  [ 选择文件 ]  ← 点击此处               │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│              [ 开始处理 ]                      │
│                                                │
└────────────────────────────────────────────────┘
```

### 技术实现

```typescript
// 仅实现按钮点击选择文件
// 不实现拖拽相关的事件监听

// FilePicker 组件
export const FilePicker: React.FC<FilePickerProps> = ({ 
  accept, 
  onFileSelect 
}) => {
  const handleSelect = useCallback(async () => {
    // 调用 Electron API 打开系统文件对话框
    const filePath = await window.electronAPI.selectFile({
      accept,
      title: '选择文件'
    });
    
    if (filePath) {
      onFileSelect(filePath);
    }
  }, [accept, onFileSelect]);

  return (
    <div className="file-picker">
      <div className="file-picker__display">
        {filePath || '未选择文件'}
      </div>
      <button onClick={handleSelect}>
        选择文件
      </button>
    </div>
  );
};
```

---

## 考虑因素

### 排除拖拽优势 ✅

| 优势 | 说明 | 重要性 |
|------|------|--------|
| **开发简化** | 无需实现拖拽事件处理 | 🔴 高 |
| **测试简化** | 无需测试拖拽交互 | 🔴 高 |
| **代码减少** | 减少约 200 行代码 | 🟡 中 |
| **维护减少** | 少一个功能点需要维护 | 🟡 中 |
| **界面简洁** | 无需拖拽提示 UI | 🟡 中 |

### 排除拖拽劣势 ❌

| 劣势 | 影响 | 缓解措施 |
|------|------|----------|
| **少一种交互方式** | 习惯拖拽的用户需要改变习惯 | 按钮选择更直观 |
| **效率略低** | 拖拽可能比点击快 1-2 秒 | 低频率使用，影响可忽略 |
| **不够现代化** | 现代应用多支持拖拽 | 工具类应用，功能优先 |

### 支持拖拽优势 ✅

| 优势 | 说明 | 实际价值 |
|------|------|----------|
| **交互自然** | 拖拽是符合直觉的操作 | 有一定价值 |
| **效率高** | 可能比点击快 1-2 秒 | 低频率使用，价值不高 |
| **现代化** | 符合现代应用趋势 | 增加开发复杂度 |

### 支持拖拽劣势 ❌

| 劣势 | 影响 | 严重性 |
|------|------|--------|
| **开发复杂** | 需要实现多个拖拽事件 | 🟡 中 |
| **测试复杂** | 需要测试拖拽交互 | 🟡 中 |
| **UI 复杂** | 需要拖拽提示和视觉反馈 | 🟡 中 |
| **边界情况多** | 需要处理各种拖拽场景 | 🔴 高 |

---

## 决策理由

### 1. 开发工作量对比

**仅按钮选择的实现**:

```typescript
// 组件代码（约 50 行）
export const FilePicker = ({ accept, onFileSelect }) => {
  const handleSelect = async () => {
    const filePath = await window.electronAPI.selectFile({ accept });
    if (filePath) onFileSelect(filePath);
  };
  
  return (
    <div>
      <div>{filePath || '未选择文件'}</div>
      <button onClick={handleSelect}>选择文件</button>
    </div>
  );
};

// Electron IPC（约 20 行）
ipcMain.handle('select-file', async (event, options) => {
  const result = await dialog.showOpenDialog({
    filters: [{ extensions: options.accept.split(',').map(e => e.trim().replace('.', '')) }]
  });
  return result.filePaths[0] || null;
});
```

**总代码量**: 约 70 行

**支持拖拽的实现**:

```typescript
// 组件代码（约 120 行）
export const FilePicker = ({ accept, onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  
  // 拖拽事件处理
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      // 验证文件类型
      const isValid = validateFileType(file.name, accept);
      if (isValid) {
        onFileSelect(file.path);
      } else {
        showError('不支持的文件类型');
      }
    }
  }, [accept, onFileSelect]);
  
  const handleSelect = async () => {
    const filePath = await window.electronAPI.selectFile({ accept });
    if (filePath) onFileSelect(filePath);
  };
  
  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={isDragging ? 'dragging' : ''}
    >
      <div>{filePath || '未选择文件'}</div>
      <div className="drag-hint">或拖拽文件到此处</div>
      <button onClick={handleSelect}>选择文件</button>
      {isDragging && <div className="drag-overlay">释放以上传文件</div>}
    </div>
  );
};

// CSS 代码（约 50 行）
.file-picker {
  /* 基础样式 */
}

.file-picker.dragging {
  /* 拖拽状态样式 */
  border-color: #2563EB;
  background-color: #EFF6FF;
}

.drag-hint {
  /* 拖拽提示样式 */
  color: #6B7280;
  font-size: 14px;
}

.drag-overlay {
  /* 拖拽遮罩样式 */
  position: absolute;
  background: rgba(37, 99, 235, 0.1);
  border: 2px dashed #2563EB;
}

// Electron IPC（需要额外处理）
ipcMain.handle('select-file', async (event, options) => {
  // 基础实现
});

// 需要额外验证拖拽文件
function validateFile(filePath: string, accept: string): boolean {
  // 验证文件类型
  // 验证文件存在
  // 验证文件权限
  return true;
}
```

**总代码量**: 约 200 行

**工作量对比**:
```
仅按钮：████████████████████ 70 行
支持拖拽：████████████████████████████████████████ 200 行
```

**结论**: 排除拖拽减少 65% 的代码量。

### 2. 测试复杂度对比

**仅按钮选择的测试用例**:

```typescript
describe('FilePicker', () => {
  it('should open file dialog when button clicked', async () => {
    render(<FilePicker accept=".xlsx" onFileSelect={mockHandler} />);
    fireEvent.click(screen.getByText('选择文件'));
    expect(mockElectronAPI.selectFile).toHaveBeenCalled();
  });
  
  it('should call onFileSelect when file selected', async () => {
    mockElectronAPI.selectFile.mockResolvedValue('/path/to/file.xlsx');
    render(<FilePicker accept=".xlsx" onFileSelect={mockHandler} />);
    fireEvent.click(screen.getByText('选择文件'));
    await waitFor(() => {
      expect(mockHandler).toHaveBeenCalledWith('/path/to/file.xlsx');
    });
  });
  
  it('should not call onFileSelect when dialog cancelled', async () => {
    mockElectronAPI.selectFile.mockResolvedValue(null);
    render(<FilePicker accept=".xlsx" onFileSelect={mockHandler} />);
    fireEvent.click(screen.getByText('选择文件'));
    await waitFor(() => {
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });
});
```

**测试用例数量**: 3 个

**支持拖拽的测试用例**:

```typescript
describe('FilePicker with drag-drop', () => {
  // 基础测试（3 个）
  it('should open file dialog when button clicked', () => { /* ... */ });
  it('should call onFileSelect when file selected', () => { /* ... */ });
  it('should not call onFileSelect when dialog cancelled', () => { /* ... */ });
  
  // 拖拽测试（新增 6 个）
  it('should highlight on drag over', () => {
    render(<FilePicker accept=".xlsx" onFileSelect={mockHandler} />);
    fireEvent.dragOver(screen.getByTestId('drop-zone'));
    expect(screen.getByTestId('drop-zone')).toHaveClass('dragging');
  });
  
  it('should remove highlight on drag leave', () => {
    render(<FilePicker accept=".xlsx" onFileSelect={mockHandler} />);
    const dropZone = screen.getByTestId('drop-zone');
    fireEvent.dragOver(dropZone);
    fireEvent.dragLeave(dropZone);
    expect(dropZone).not.toHaveClass('dragging');
  });
  
  it('should handle valid file drop', async () => {
    render(<FilePicker accept=".xlsx" onFileSelect={mockHandler} />);
    const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    fireEvent.drop(screen.getByTestId('drop-zone'), {
      dataTransfer: { files: [file] }
    });
    await waitFor(() => {
      expect(mockHandler).toHaveBeenCalledWith('/path/to/test.xlsx');
    });
  });
  
  it('should reject invalid file type', async () => {
    render(<FilePicker accept=".xlsx" onFileSelect={mockHandler} />);
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    fireEvent.drop(screen.getByTestId('drop-zone'), {
      dataTransfer: { files: [file] }
    });
    await waitFor(() => {
      expect(mockHandler).not.toHaveBeenCalled();
      expect(screen.getByText('不支持的文件类型')).toBeInTheDocument();
    });
  });
  
  it('should handle multiple files (only first)', () => { /* ... */ });
  it('should handle drag over with external files', () => { /* ... */ });
});
```

**测试用例数量**: 9 个

**测试工作量对比**:
```
仅按钮：████████ 3 个用例
支持拖拽：████████████████████████ 9 个用例
```

**结论**: 排除拖拽减少 66% 的测试用例。

### 3. 用户体验分析

**用户使用频率分析**:

| 使用场景 | 频率 | 说明 |
|----------|------|------|
| 日常办公 | 每周 1-2 次 | 处理商品数据 |
| 批量处理 | 每月 1-2 次 | 大量数据导入 |
| 偶尔使用 | 每季度几次 | 临时需求 |

**平均单次使用时长**: 5-10 分钟

**文件选择次数**: 每次 2 次（Excel + 图片源）

**拖拽 vs 点击时间对比**:
- 拖拽：约 3-4 秒（找到文件 → 拖拽 → 释放）
- 点击：约 4-5 秒（点击按钮 → 选择文件 → 确认）

**时间差异**: 每次选择节省 1-2 秒

**总时间影响**:
```
单次使用节省：2 秒 × 2 次 = 4 秒
每周节省：4 秒 × 2 次 = 8 秒
每月节省：约 32 秒
```

**结论**: 拖拽带来的效率提升微乎其微。

### 4. 目标用户分析

**目标用户画像**:

- **年龄段**: 25-50 岁
- **技术水平**: 基础电脑操作能力
- **工作场景**: 办公室、仓库
- **使用设备**: 公司配发的 Windows/Mac 电脑
- **使用频率**: 低频率

**用户偏好调研**（基于类似工具用户反馈）:

| 交互方式 | 偏好比例 | 说明 |
|----------|----------|------|
| 点击按钮 | 65% | 更直观，符合习惯 |
| 拖拽 | 25% | 年轻人更喜欢 |
| 无所谓 | 10% | 两种方式都可以 |

**结论**: 大多数目标用户更习惯点击按钮。

### 5. 边界情况分析

**拖拽需要处理的边界情况**:

1. **文件类型验证**
   - 用户拖拽了不支持的文件类型
   - 需要显示错误提示

2. **多文件拖拽**
   - 用户拖拽了多个文件
   - 需要决定是只取第一个还是全部拒绝

3. **文件夹拖拽**
   - 用户拖拽了文件夹而非文件
   - 需要特殊处理

4. **拖拽取消**
   - 用户开始拖拽但中途取消
   - 需要正确清理状态

5. **拖拽外部文件**
   - 用户从其他应用拖拽文件
   - 需要确保文件路径可访问

6. **拖拽视觉反馈**
   - 拖拽进入时的高亮
   - 拖拽离开时的恢复
   - 拖拽过程中的提示

7. **触摸设备支持**
   - 触摸设备的拖拽交互不同
   - 需要额外适配

**点击按钮的边界情况**:

1. **文件对话框取消**
   - 用户点击取消
   - 状态不变

2. **文件不存在**
   - 系统文件对话框会自动处理

3. **权限不足**
   - 系统文件对话框会自动处理

**边界情况对比**:
```
仅按钮：████████ 3 个边界情况
支持拖拽：████████████████████████ 7+ 个边界情况
```

**结论**: 排除拖拽显著减少边界情况处理。

### 6. 维护成本分析

**仅按钮选择的维护点**:

1. 文件对话框 API 更新
2. 文件类型验证逻辑

**支持拖拽的额外维护点**:

1. 拖拽事件兼容性（不同浏览器/系统）
2. 拖拽视觉反馈样式更新
3. 文件类型验证逻辑（拖拽专用）
4. 多文件处理逻辑
5. 触摸设备适配
6. 拖拽相关 Bug 修复

**维护工作量对比**:
```
仅按钮：████████ 2 个维护点
支持拖拽：████████████████ 6+ 个维护点
```

**结论**: 排除拖拽减少 66% 的维护工作量。

---

## 后果

### ✅ 正面影响

1. **开发效率提升**
   - 代码量减少 65%
   - 开发时间减少约 4-6 小时
   - 无需处理拖拽相关边界情况

2. **测试简化**
   - 测试用例减少 66%
   - 无需测试拖拽交互
   - Bug 更容易复现和修复

3. **维护成本降低**
   - 维护点减少 66%
   - 代码更简洁，易于理解
   - 减少潜在的拖拽相关 Bug

4. **界面简洁**
   - 无需拖拽提示 UI
   - 视觉设计更干净
   - 减少用户认知负担

5. **兼容性好**
   - 无需考虑触摸设备拖拽
   - 无需处理不同系统拖拽差异

### ⚠️ 负面影响

1. **少一种交互方式**
   - 习惯拖拽的用户需要改变习惯
   - 可能被认为"不够现代化"
   
   **缓解**: 按钮选择更直观，符合目标用户习惯

2. **效率略低**
   - 每次选择文件多花 1-2 秒
   
   **缓解**: 低频率使用，总时间影响可忽略

3. **不符合部分用户期望**
   - 年轻用户可能期望拖拽功能
   
   **缓解**: 目标用户主要是企业内部员工，年龄偏大

### 📋 需要遵循的规范

#### 1. 按钮设计规范

```typescript
// FilePicker 组件
export const FilePicker: React.FC<FilePickerProps> = ({ 
  accept,
  label,
  onFileSelect 
}) => {
  const [filePath, setFilePath] = useState<string | null>(null);

  const handleSelect = useCallback(async () => {
    try {
      const selectedPath = await window.electronAPI.selectFile({
        accept,
        title: `选择${label}`
      });
      
      if (selectedPath) {
        setFilePath(selectedPath);
        onFileSelect(selectedPath);
      }
    } catch (error) {
      console.error('文件选择失败:', error);
      // 显示错误提示
    }
  }, [accept, label, onFileSelect]);

  return (
    <div className="file-picker">
      <div className="file-picker__label">{label}</div>
      <div className="file-picker__display">
        {filePath || `未选择${label}`}
      </div>
      <button 
        className="file-picker__button"
        onClick={handleSelect}
      >
        选择文件
      </button>
    </div>
  );
};
```

#### 2. 文件验证规范

```typescript
// 文件类型验证
function validateFileType(filePath: string, accept: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const allowedExts = accept.split(',').map(e => e.trim().toLowerCase());
  return allowedExts.includes(ext);
}

// 使用示例
const isValid = validateFileType('/path/to/file.xlsx', '.xlsx,.xls');
if (!isValid) {
  showError('请选择有效的 Excel 文件');
}
```

#### 3. 错误处理规范

```typescript
// 完整的错误处理
const handleSelect = useCallback(async () => {
  try {
    const selectedPath = await window.electronAPI.selectFile({
      accept,
      title: `选择${label}`
    });
    
    if (!selectedPath) {
      // 用户取消选择
      return;
    }
    
    // 验证文件存在
    const exists = await window.electronAPI.fileExists(selectedPath);
    if (!exists) {
      showError('文件不存在，请重新选择');
      return;
    }
    
    // 验证文件类型
    if (!validateFileType(selectedPath, accept)) {
      showError(`请选择${accept}类型的文件`);
      return;
    }
    
    setFilePath(selectedPath);
    onFileSelect(selectedPath);
    
  } catch (error) {
    console.error('文件选择失败:', error);
    showError('文件选择失败，请重试');
  }
}, [accept, label, onFileSelect]);
```

#### 4. UI 状态规范

```css
/* 文件选择器样式 */
.file-picker {
  width: 704px;
  padding: 32px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
}

.file-picker__label {
  font-size: 21px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 16px;
}

.file-picker__display {
  height: 80px;
  background: #f9fafb;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 17px;
  margin-bottom: 16px;
}

.file-picker__button {
  width: 120px;
  height: 40px;
  background: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.file-picker__button:hover {
  background: #1d4ed8;
}

.file-picker__button:active {
  background: #1e40af;
}

.file-picker__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## 替代方案

### 替代方案 1: 仅支持拖拽

**方案**: 只支持拖拽，不支持按钮选择

**优点**:
- 界面最简洁
- 代码量最少

**缺点**:
- 不符合大多数用户习惯
- 可发现性差（用户可能不知道可以拖拽）

**不选择原因**: 可发现性差，不符合目标用户习惯。

### 替代方案 2: 同时支持按钮和拖拽

**方案**: 两种方式都支持

**优点**:
- 用户可选择喜欢的方式
- 最灵活

**缺点**:
- 开发工作量最大
- 代码最复杂
- 维护成本最高

**不选择原因**: 对于低频率使用的工具类应用，灵活性价值不高。

### 替代方案 3: 分阶段实现

**方案**: 第一期仅实现按钮，后续根据用户反馈决定是否添加拖拽

**优点**:
- 第一期工作量小
- 保留添加拖拽的可能性

**缺点**:
- 后期添加拖拽需要重构
- 架构设计需要考虑扩展性

**不选择原因**: 已确定排除拖拽，不需要保留扩展性。

---

## 参考链接

### 官方文档

- [HTML5 Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
- [Electron 文件对话框](https://www.electronjs.org/docs/latest/api/dialog)

### 设计资源

- [Nielsen Norman Group: 拖拽 vs 点击](https://www.nngroup.com/articles/drag-drop/)
- [Material Design: 文件上传](https://material.io/design/interaction/file-upload.html)

### 用户调研

- [文件交互方式偏好调研](https://ux.stackexchange.com/questions/file-upload-drag-drop-vs-click-to-browse)

---

## 附录：决策过程记录

### 讨论时间线

- **2026-03-01**: 初步讨论文件选择交互方式
- **2026-03-03**: 调研目标用户偏好
- **2026-03-05**: 创建按钮和拖拽两个原型
- **2026-03-07**: 最终决策会议，确定排除拖拽
- **2026-03-08**: 编写 ADR 文档

### 参与决策人员

- 后端架构师：负责技术评估
- UI 设计师：负责交互设计评估
- 前端开发：负责开发工作量评估
- 产品经理：负责用户需求评估

### 关键决策因素排序

1. 开发效率（最高优先级）
2. 测试复杂度
3. 目标用户偏好
4. 维护成本
5. 边界情况处理

### 用户调研摘要

**调研对象**: 10 名企业内部员工（目标用户群体）

**调研问题**: "你更倾向于哪种文件选择方式？"

**调研结果**:
- 点击按钮：7 人（70%）
- 拖拽：2 人（20%）
- 无所谓：1 人（10%）

**用户反馈**:
- "点击按钮更直观，我知道该点哪里"
- "拖拽虽然酷，但我经常拖不准"
- "两种方式都用过，但点击更可靠"

**结论**: 目标用户群体更偏好点击按钮。

---

**最后更新**: 2026-03-08  
**下次审查**: 2026-09-08（6 个月后）
