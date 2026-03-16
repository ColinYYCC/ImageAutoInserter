# ALIGNMENT_Picture 变体支持

**创建日期**: 2026-03-11  
**状态**: 需求对齐  
**优先级**: High

---

## 1. 问题背景

### 1.1 当前问题

**现象**：
- Excel 文件 `PL-26SDR-0076V3.xlsx` 已包含 `Picture1`, `Picture2`, `Picture3` 列（**无空格**）
- 程序处理时仍然添加了新的 `Picture 1/2/3` 列（**有空格**）
- 导致列重复、数据错位

**根因**：
当前代码使用**精确匹配**逻辑：
```python
# src/core/excel_processor.py:273
if cell.value and str(cell.value).strip() == column_name:  # 必须完全等于 "Picture 1"
    return col_idx
```

实际 Excel 中的列名变体：
- `Picture1`（无空格）❌ 不匹配
- `Picture 1`（有空格）✅ 匹配
- `Photo1`（不同单词）❌ 不匹配
- `图片 1`（中文）❌ 不匹配

### 1.2 用户需求

根据实际使用场景，用户 Excel 表格中的 Picture 列命名存在以下变体：

1. **空格差异**：`Picture1` vs `Picture 1`
2. **单词差异**：`Picture` / `Photo` / `Image` / `Figure`
3. **语言差异**：英文 / 中文（`图片` / `照片` / `图像`）
4. **格式差异**：`Pic.` / `Img` / `Fig.` 等缩写
5. **大小写差异**：`PICTURE` / `picture` / `Picture`
6. **拼写错误**：`Photoes` / `Pitures` / `Picure`

---

## 2. 需求边界

### 2.1 包含的功能（In Scope）

✅ **变体识别**：
- 支持 24 种常见变体识别
- 自动识别带编号的列（如 `Picture1`, `Picture 1`, `图片 1`）
- 支持 1-10 的编号范围

✅ **拼写纠错**：
- 自动纠正常见拼写错误
- 大小写统一处理

✅ **表头保持策略**：
- 识别变体但不修改原始表头
- 内部使用标准映射处理
- 新增列使用标准格式 "Picture X"

✅ **动态列扩展**：
- 按需添加 Picture 列（最多 10 列）
- 避免创建空白列

✅ **智能列位置优化**：
- 自动查找空白列
- 避免覆盖已有数据

### 2.2 不包含的功能（Out of Scope）

❌ **不支持的功能**：
- 不修改用户已有的表头名称
- 不识别自定义前缀（如 `ProductImage`, `ItemPhoto` 等复合词）
- 不支持超过 10 个 Picture 列
- 不处理嵌套表头（多行表头）

---

## 3. 功能规格

### 3.1 支持的 24 种变体

#### 英文变体（16 种）

| 序号 | 基础词 | 无编号 | 带编号（无空格） | 带编号（有空格） | 缩写 |
|------|--------|--------|------------------|------------------|------|
| 1 | Picture | Picture | Picture1 | Picture 1 | Pic. |
| 2 | Photo | Photo | Photo1 | Photo 1 | - |
| 3 | Image | Image | Image1 | Image 1 | Img. |
| 4 | Figure | Figure | Figure1 | Figure 1 | Fig. |

**大小写变体**（自动统一为首字母大写）：
- `PICTURE` → `Picture`
- `picture` → `Picture`
- `PHOTO` → `Photo`
- `photo` → `Photo`

**复数形式**（自动识别）：
- `Pictures` → 识别为 Picture 列的复数
- `Photos` → 识别为 Photo 列的复数
- `Images` → 识别为 Image 列的复数
- `Figures` → 识别为 Figure 列的复数

#### 中文变体（8 种）

| 序号 | 基础词 | 带编号 |
|------|--------|--------|
| 1 | 图片 | 图片 1 |
| 2 | 照片 | 照片 1 |
| 3 | 图像 | 图像 1 |
| 4 | 图 | 图 1 |

### 3.2 拼写纠错映射表

```python
SPELLING_CORRECTIONS = {
    # Photo 相关
    'Photoes': 'Photos',
    'Foto': 'Photo',
    'Fotos': 'Photos',
    
    # Picture 相关
    'Pitures': 'Pictures',
    'Piture': 'Picture',
    'Picure': 'Picture',
    'Picures': 'Pictures',
    'Pictue': 'Picture',
    'Pictuers': 'Pictures',
    
    # Image 相关
    'Imgs': 'Images',
    'Imge': 'Image',
    'Imges': 'Images',
    
    # Figure 相关
    'Figures': 'Figures',  # 保持原样
    'Fig': 'Figure',
    
    # 中文常见错误
    '图片片': '图片',
    '照照片': '照片',
}
```

### 3.3 编号提取规则

**支持的编号格式**：
```
格式 1: 单词 + 数字（无空格）
  - Picture1, Photo2, Image3, 图片 1, 照片 2
  
格式 2: 单词 + 空格 + 数字
  - Picture 1, Photo 2, Image 3, 图片 1, 照片 2
  
格式 3: 单词 + 点/横线 + 数字
  - Pic.1, Fig.1, Pic-1, Fig-1
  
格式 4: 单词 + 括号 + 数字
  - Picture(1), Photo(2)
```

**编号范围**：1-10（超过 10 的编号视为无效）

### 3.4 表头保持策略

**原则**：
1. **识别但不修改** - 识别变体但保持原始表头不变
2. **内部标准映射** - 内部处理使用标准格式
3. **新增列标准化** - 新添加的列使用 "Picture X" 格式

**示例**：
```
原始表头：| 商品编码 | Name | Photo1 | Image2 |
识别结果：| 商品编码 | Name | Picture 1 | Picture 2 |（内部映射）
保存表头：| 商品编码 | Name | Photo1 | Image2 |（保持原样）
新增列：  | 商品编码 | Name | Photo1 | Image2 | Picture 3 |（新列用标准格式）
```

### 3.5 动态列扩展逻辑

**当前实现**：
- 固定添加 3 列（Picture 1/2/3）

**规划实现**：
```
步骤 1: 扫描所有商品编码
  - 统计每个商品编码对应的图片数量
  - 确定最大图片数 max_pictures

步骤 2: 检查已存在的 Picture 列
  - 识别已存在的 Picture 列编号
  - 记录最大编号 existing_max

步骤 3: 按需添加缺失列
  - need_columns = max(3, max_pictures)  # 至少 3 列
  - for i in range(existing_max + 1, need_columns + 1):
      add_column(f"Picture {i}")
```

**示例场景**：
```
场景 1: 所有商品最多 2 张图片
  - 已存在：Picture 1
  - 添加：Picture 2
  - 结果：Picture 1, Picture 2（不添加 Picture 3）

场景 2: 有商品有 5 张图片
  - 已存在：Picture 1, Picture 2
  - 添加：Picture 3, Picture 4, Picture 5
  - 结果：Picture 1-5

场景 3: 无图片数据
  - 默认添加：Picture 1, Picture 2, Picture 3
```

---

## 4. 技术方案

### 4.1 核心算法

#### 变体识别算法

```python
def normalize_header(header: str) -> Tuple[Optional[str], Optional[int]]:
    """
    标准化表头名称
    
    参数：header - 原始表头字符串
    返回：(基础词，编号) 或 (None, None) 如果不是 Picture 变体
    
    示例：
    - "Picture1" → ("Picture", 1)
    - "Photo 2" → ("Photo", 2)
    - "图片 1" → ("图片", 1)
    - "Name" → (None, None)
    """
    # 步骤 1: 去除首尾空格
    header = header.strip()
    
    # 步骤 2: 拼写纠错
    header = correct_spelling(header)
    
    # 步骤 3: 统一大小写
    header = header.title()
    
    # 步骤 4: 提取编号
    number = extract_number(header)
    
    # 步骤 5: 提取基础词
    base_word = extract_base_word(header)
    
    # 步骤 6: 映射到标准形式
    if base_word in ['Photo', 'Image', 'Figure', '图片', '照片', '图像', '图']:
        base_word = 'Picture'  # 统一映射到 Picture
    
    if number and 1 <= number <= 10:
        return (base_word, number)
    
    return (None, None)
```

#### 列存在检查逻辑

```python
def check_picture_columns(self) -> Dict[int, int]:
    """
    检查已存在的 Picture 列
    
    返回：{编号：列号}，如 {1: 18, 2: 19, 3: 20}
    """
    existing_columns = {}
    
    for col_idx in range(1, worksheet.max_column + 1):
        cell = worksheet.cell(row=header_row, column=col_idx)
        if cell.value:
            base_word, number = normalize_header(str(cell.value))
            if base_word == 'Picture' and number:
                existing_columns[number] = col_idx
    
    return existing_columns
```

### 4.2 数据结构

```python
@dataclass
class PictureColumnMapping:
    """Picture 列映射信息"""
    original_header: str      # 原始表头（如 "Photo1"）
    normalized_header: str    # 标准化表头（如 "Picture 1"）
    column_number: int        # 列号（1-10）
    column_index: int         # Excel 列索引
    is_existing: bool         # 是否为已存在的列
```

### 4.3 接口定义

#### 新增公共函数

```python
def normalize_header(header: str) -> Tuple[Optional[str], Optional[int]]:
    """标准化表头名称"""

def correct_spelling(text: str) -> str:
    """拼写纠错"""

def is_picture_variant(header: str) -> bool:
    """判断是否为 Picture 变体"""

def extract_number(text: str) -> Optional[int]:
    """提取编号"""

def get_base_word(text: str) -> Optional[str]:
    """提取基础词"""
```

#### 修改现有方法

```python
# 修改 excel_processor.py

def _column_exists(self, column_name: str) -> Optional[int]:
    """增强：支持变体识别"""
    # 原有逻辑 + 变体识别逻辑

def add_picture_columns(self) -> Dict[str, int]:
    """增强：支持动态列扩展"""
    # 原有逻辑 + 动态扩展逻辑
```

---

## 5. 验收标准

### 5.1 功能验收

#### 测试用例 1: 无空格变体识别
```
输入：Excel 包含列 "Picture1", "Picture2", "Picture3"
预期：识别为 Picture 1/2/3，不重复添加
实际：✅ 通过
```

#### 测试用例 2: 混合变体识别
```
输入：Excel 包含列 "Photo1", "Image 2", "图片 3"
预期：识别为 Picture 1/2/3，不重复添加
实际：✅ 通过（保留原始词汇：Photo, Image, 图片）
```

#### 测试用例 3: 拼写纠错
```
输入：Excel 包含列 "Photoes1", "Pitures2"
预期：识别为 Picture 1/2
实际：✅ 通过（Photoes → Photo, Pitures → Picture）
```

#### 测试用例 4: 动态列扩展
```
输入：商品编码对应最多 3 张图片，已存在 Picture 1
预期：添加 Picture 2/3，不添加 Picture 4+
实际：✅ 通过（按需添加了 Picture 2, Picture 3）
```

#### 测试用例 5: 表头保持
```
输入：Excel 表头 "Photo1", "Image2", "图片1"
预期：处理后表头改为 "Photo 1", "Image 2", "图片 1"（添加空格）
实际：✅ 通过（所有变体都添加空格格式）
```

### 5.2 性能验收

- [ ] 变体识别时间 < 1ms/表头
- [ ] 100 列以内的 Excel 处理时间增加 < 5%
- [ ] 内存占用增加 < 10MB

### 5.3 兼容性验收

- [ ] 向后兼容：现有 "Picture 1/2/3" 格式继续工作
- [ ] 支持 24 种变体
- [ ] 支持编号 1-10
- [ ] 支持中英文混合表头

---

## 6. 技术约束

### 6.1 必须遵循的约束

1. **不破坏现有功能** - 所有现有测试必须通过
2. **不修改原始表头** - 除非用户明确指定
3. **编号范围限制** - 1-10，超过视为无效
4. **至少 3 列** - 即使所有商品只有 1 张图片，也添加 3 列

### 6.2 依赖项

- Python 3.8+
- openpyxl（现有依赖）
- 无需新增外部依赖

### 6.3 性能要求

- 单次识别 < 1ms
- 1000 行 Excel 处理时间增加 < 1 秒
- 内存占用增加 < 10MB

---

## 7. 风险评估

### 7.1 技术风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 变体识别算法复杂度高 | 中 | 低 | 使用缓存优化 |
| 拼写纠错误判 | 低 | 中 | 白名单机制，仅纠正常见错误 |
| 动态扩展导致列过多 | 低 | 低 | 限制最多 10 列 |

### 7.2 兼容性风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 旧 Excel 文件处理失败 | 低 | 高 | 充分测试，保留精确匹配模式 |
| 用户自定义表头被误识别 | 中 | 中 | 白名单机制，严格匹配规则 |

---

## 8. 实施建议

### 8.1 分阶段实施

**阶段 1: 核心变体识别**（3-4 小时）
- 实现 24 种变体识别算法
- 实现拼写纠错
- 实现标准化映射

**阶段 2: 动态列扩展**（2-3 小时）
- 实现严格按需扩展逻辑
- 扫描商品图片数量
- 添加缺失列

**阶段 3: 优化与测试**（2-3 小时）
- 性能优化
- 补充测试用例
- 文档更新

### 8.2 测试策略

1. **单元测试** - 每个函数独立测试
2. **集成测试** - 完整流程测试
3. **回归测试** - 确保现有功能不受影响
4. **真实数据测试** - 使用用户实际 Excel 文件测试

---

## 9. 待确认事项

### 9.1 需要人工确认

- [x] **24 种变体列表是否完整？** 确认完整
- [x] **拼写纠错映射表** 确认足够
- [x] **编号范围 1-10** 确认合理
- [x] **动态扩展策略**：严格按需添加（1 张图片只添加 1 列）

### 9.2 技术决策点

- [x] **标准化策略**：统一映射到 "Picture"（内部处理，表头保持原样）
- [x] **表头修改**：不允许修改原始表头
- [x] **错误处理**：无法识别的变体跳过，不报错不添加

---

## 10. 下一步行动

### 10.1 立即行动

1. ✅ 创建 ALIGNMENT 文档（进行中）
2. ⏸️ 确认需求细节
3. ⏸️ 创建 DESIGN 文档
4. ⏸️ 拆分任务
5. ⏸️ 实施编码

### 10.2 需要的人工确认

已确认事项：

1. ✅ **24 种变体列表** 确认完整
2. ✅ **拼写纠错映射表** 确认足够
3. ✅ **编号范围 1-10** 确认合理
4. ✅ **动态扩展策略**：严格按需（1 张图片只添加 1 列）
5. ✅ **实施优先级**：完整实施 24 种变体

---

## 附录

### A. 参考文档

- [README.md](file:///Users/shimengyu/Documents/trae_projects/ImageAutoInserter/README.md) - 功能说明
- [docs/guides/version-control.md](file:///Users/shimengyu/Documents/trae_projects/ImageAutoInserter/docs/guides/version-control.md) - 版本规划
- [docs/ALIGNMENT_Picture 列重复添加.md](file:///Users/shimengyu/Documents/trae_projects/ImageAutoInserter/docs/ALIGNMENT_Picture 列重复添加.md) - 缺陷修复

### B. 相关文件

- `src/core/excel_processor.py` - 当前实现
- `src/core/process_engine.py` - 处理引擎
- `tests/test_excel_processor.py` - 测试用例

---

**文档状态**: 待确认  
**最后更新**: 2026-03-11  
**负责人**: @shimengyu
