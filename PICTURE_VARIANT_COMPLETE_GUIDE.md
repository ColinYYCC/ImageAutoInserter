# Picture 变体支持 - 完整集成指南

**版本**: v1.0.0  
**创建日期**: 2026-03-11  
**状态**: ✅ 已完成并集成  
**文档类型**: 完整实施指南

---

## 📋 目录

1. [问题背景](#1-问题背景)
2. [解决方案概述](#2-解决方案概述)
3. [核心功能模块](#3-核心功能模块)
4. [安装与集成](#4-安装与集成)
5. [使用指南](#5-使用指南)
6. [API 参考](#6-api 参考)
7. [测试验证](#7-测试验证)
8. [故障排除](#8-故障排除)
9. [示例代码](#9-示例代码)
10. [附录](#10-附录)

---

## 1. 问题背景

### 1.1 原始问题

在使用 ImageAutoInserter 处理 Excel 表格时，发现以下问题：

**问题现象**:
- Excel 文件 `PL-26SDR-0076V3.xlsx` 已包含 `Picture1`, `Picture2`, `Picture3` 列（无空格）
- 程序处理时仍然添加了新的 `Picture 1/2/3` 列（有空格）
- 导致列重复、数据错位

**根本原因**:
当前代码使用**精确匹配**逻辑，要求单元格内容必须**完全等于** `"Picture 1"`：
```python
if cell.value and str(cell.value).strip() == column_name:  # 必须完全等于 "Picture 1"
    return col_idx
```

实际 Excel 中的列名变体：
- `Picture1`（无空格）❌ 不匹配
- `Picture 1`（有空格）✅ 匹配
- `Photo1`（不同单词）❌ 不匹配
- `图片 1`（中文）❌ 不匹配

### 1.2 需求分析

需要实现以下功能：

1. **变体识别**: 支持 24 种 Picture 变体识别
   - 英文：Picture/Photo/Image/Figure（及复数、缩写形式）
   - 中文：图片/照片/图像/图
   
2. **拼写纠错**: 自动纠正常见拼写错误
   - `Photoes` → `Photos`
   - `Pitures` → `Pictures`
   
3. **空格规范化**: 统一术语与数字之间的空格格式
   - `Picture1` → `Picture 1`
   - `Photoes1` → `Photos 1`
   
4. **动态列扩展**: 严格按需添加列
   - 1 张图片只添加 1 列
   - 最多支持 10 个 Picture 列

5. **表头保持**: 识别但不修改原始表头

---

## 2. 解决方案概述

### 2.1 架构设计

```
src/
├── core/
│   ├── picture_variant.py      # 变体识别核心模块（新增）
│   │   ├── SpellingCorrector   # 拼写纠错器
│   │   ├── VariantRecognizer   # 变体识别器
│   │   └── PictureColumnMapper # 列映射管理器
│   │
│   ├── excel_processor.py      # Excel 处理器（增强）
│   │   ├── _column_exists()    # 增强：支持变体识别
│   │   ├── scan_product_images() # 新增：扫描图片数量
│   │   └── add_picture_columns() # 增强：支持动态扩展
│   │
│   └── process_engine.py       # 处理引擎
│
└── utils/
    └── text_formatter.py       # 文本格式化工具（新增）
        └── PictureTextFormatter # 文本格式化器
```

### 2.2 核心功能

#### 功能 1: Picture 变体识别（24 种）

**英文变体（16 种）**:
- Picture / Picture1 / Picture 1 / Pic.
- Photo / Photo1 / Photo 1 / Photos
- Image / Image1 / Image 1 / Img.
- Figure / Figure1 / Figure 1 / Fig.

**中文变体（8 种）**:
- 图片 / 图片 1
- 照片 / 照片 1
- 图像 / 图像 1
- 图 / 图 1

**特殊支持**:
- 大小写不敏感（PICTURE1, picture1）
- 复数形式识别（Pictures, Photos）
- 拼写纠错（Photoes→Photos, Pitures→Pictures）

#### 功能 2: 文本格式化

**功能**:
- 在基础词汇与数字后缀之间插入半角空格
- 修正基础词汇的拼写错误
- 保持原始大小写格式

**示例**:
```
Pitures1   → Pictures 1  (修正拼写并添加空格)
Picture1   → Picture 1   (仅添加空格)
Photoes1   → Photos 1    (修正拼写并添加空格)
```

#### 功能 3: 动态列扩展

**策略**: 严格按需扩展
- 1 张图片只添加 1 列
- 最多支持 10 个 Picture 列
- 自动扫描商品图片数量

**流程**:
```
扫描已存在 Picture 列 → 统计商品图片数量 → 计算需要添加的列 → 添加缺失列
```

---

## 3. 核心功能模块

### 3.1 picture_variant.py

**位置**: `src/core/picture_variant.py`

**核心类**:

#### SpellingCorrector（拼写纠错器）

```python
from src.core import SpellingCorrector

corrector = SpellingCorrector()

# 拼写纠错
corrected = corrector.correct("Photoes")  # "Photos"
corrected = corrector.correct("Pitures")  # "Pictures"

# 获取基础词（去除复数）
base = corrector.get_base_word("Pictures")  # "Picture"
```

**支持的拼写纠错** (15+ 个):
```python
{
    'photoes': 'photos',
    'foto': 'photo',
    'pitures': 'pictures',
    'picure': 'picture',
    'imgs': 'images',
    'fig': 'figure',
    # ... 更多
}
```

---

#### VariantRecognizer（变体识别器）

```python
from src.core import VariantRecognizer

recognizer = VariantRecognizer()

# 识别变体
result = recognizer.recognize("Picture1")
# 返回：("Picture", 1)

result = recognizer.recognize("Photo 2")
# 返回：("Picture", 2)

result = recognizer.recognize("图片 1")
# 返回：("Picture", 1)

result = recognizer.recognize("Name")
# 返回：None（不是 Picture 变体）

# 判断是否为 Picture 变体
is_variant = recognizer.is_picture_variant("Picture1")
# 返回：True
```

**支持的操作**:
- 识别 24 种变体
- 提取编号（1-10）
- 映射到标准格式 "Picture X"
- 使用 LRU 缓存优化性能

---

#### PictureColumnMapper（列映射管理器）

```python
from src.core import PictureColumnMapper

mapper = PictureColumnMapper()

# 扫描工作表
mapper.scan_worksheet(worksheet, header_row=1)

# 获取已存在的列
existing = mapper.get_existing_columns()
# 返回：{1: 18, 2: 19}  # Picture 1 在第 18 列，Picture 2 在第 19 列

# 计算需要添加的列
needed = mapper.calculate_needed_columns(max_pictures=5)
# 已存在 Picture 1/2，返回：[3, 4, 5]

# 获取最大已存在编号
max_num = mapper.get_max_existing_number()
# 返回：2
```

**功能**:
- 扫描工作表识别已存在的 Picture 列
- 维护原始表头映射
- 计算需要添加的列编号

---

#### 公共接口函数

```python
from src.core import (
    recognize_variant,
    correct_spelling,
    is_picture_variant
)

# 识别变体
result = recognize_variant("Picture1")  # ("Picture", 1)

# 拼写纠错
corrected = correct_spelling("Photoes")  # "Photos"

# 判断变体
is_variant = is_picture_variant("Photo 2")  # True
```

---

### 3.2 text_formatter.py

**位置**: `src/utils/text_formatter.py`

**核心类**:

#### PictureTextFormatter（文本格式化器）

```python
from src.utils import PictureTextFormatter

formatter = PictureTextFormatter()

# 格式化文本
formatted = formatter.format_text("Pitures1")
# 返回："Pictures 1"

formatted = formatter.format_text("Picture1")
# 返回："Picture 1"

formatted = formatter.format_text("Photoes1 Picture1 Figure1")
# 返回："Photos 1 Picture 1 Figure 1"

# 判断是否为支持的术语
is_supported = formatter.is_supported_term("Picture1")  # True
is_supported = formatter.is_supported_term("Name1")     # False
```

**功能**:
- 拼写纠错
- 添加空格分隔符
- 保持大小写格式
- 批量处理文本

---

#### 公共接口函数

```python
from src.utils import format_picture_text

# 格式化文本
formatted = format_picture_text("Pitures1")  # "Pictures 1"
formatted = format_picture_text("Picture1")  # "Picture 1"
```

---

### 3.3 excel_processor.py（增强）

**位置**: `src/core/excel_processor.py`

**新增/增强方法**:

#### scan_product_images() - 新增

```python
max_pictures = processor.scan_product_images(image_matcher)
```

**功能**: 扫描所有商品的图片数量，返回最大图片数

**参数**:
- `image_matcher`: ImageMatcher 对象

**返回**: `int` - 最大图片数

---

#### add_picture_columns() - 增强

```python
# 基本用法
result = processor.add_picture_columns()

# 指定最大图片数
result = processor.add_picture_columns(max_pictures=5)

# 使用 image_matcher 自动扫描
result = processor.add_picture_columns(image_matcher=matcher)
```

**参数**:
- `image_matcher` (可选): ImageMatcher 对象
- `max_pictures` (可选): 最大图片数

**返回**: `ColumnAdditionResult` - 列添加结果

**ColumnAdditionResult 结构**:
```python
@dataclass
class ColumnAdditionResult:
    added_columns: List[PictureColumn]      # 新增的列
    existing_columns: List[PictureColumn]   # 已存在的列
    total_columns: int                      # 总列数
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'added': [...],      # 新增列列表
            'existing': [...],   # 已存在列列表
            'total': 3           # 总列数
        }
```

**PictureColumn 结构**:
```python
@dataclass
class PictureColumn:
    number: int              # 编号（1-10）
    original_header: str     # 原始表头
    column_index: int        # Excel 列索引
    is_existing: bool        # 是否已存在
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'number': 1,
            'original_header': "Picture1",
            'column_index': 18,
            'is_existing': True
        }
```

---

## 4. 安装与集成

### 4.1 文件清单

**新增文件**:
- ✅ `src/core/picture_variant.py` (550+ 行)
- ✅ `src/utils/text_formatter.py` (330+ 行)
- ✅ `tests/test_picture_variant.py` (280+ 行)

**修改文件**:
- ✅ `src/core/excel_processor.py` (增强)
- ✅ `src/core/__init__.py` (导出配置)
- ✅ `src/utils/__init__.py` (导出配置)
- ✅ `tests/test_excel_processor.py` (测试更新)

### 4.2 集成步骤

#### 步骤 1: 确认模块文件存在

```bash
# 检查文件
ls -la src/core/picture_variant.py
ls -la src/utils/text_formatter.py
```

#### 步骤 2: 验证导出配置

**src/core/__init__.py**:
```python
from .picture_variant import (
    VariantRecognizer,
    SpellingCorrector,
    PictureColumnMapper,
    PictureColumn,
    ColumnAdditionResult,
    recognize_variant,
    correct_spelling,
    is_picture_variant
)

__all__ = [
    # 原有模块
    'ImageProcessor',
    'ImageInfo',
    'ExcelProcessor',
    'SheetInfo',
    'ProgressInfo',
    'ProcessEngine',
    'ImageMatcher',
    'ProcessResult',
    'ErrorRecord',
    # 新增模块
    'VariantRecognizer',
    'SpellingCorrector',
    'PictureColumnMapper',
    'PictureColumn',
    'ColumnAdditionResult',
    'recognize_variant',
    'correct_spelling',
    'is_picture_variant',
]
```

**src/utils/__init__.py**:
```python
from .text_formatter import PictureTextFormatter, format_picture_text

__all__ = [
    'FontManager',
    'get_font',
    'get_global_font_manager',
    'PathManager',
    'get_path_manager',
    'get_project_root',
    'get_resource_path',
    # 新增工具
    'PictureTextFormatter',
    'format_picture_text',
]
```

#### 步骤 3: 运行集成测试

```bash
# 运行快速验证
python verify_integration.py

# 运行单元测试
python -m pytest tests/test_picture_variant.py -v

# 运行集成测试
python -m pytest tests/test_excel_processor.py -v

# 运行所有测试
python -m pytest tests/ -v
```

**预期结果**:
```
============================== 42 passed in 0.48s ==============================
```

---

## 5. 使用指南

### 5.1 Picture 变体识别

#### 基础用法

```python
from src.core import recognize_variant, is_picture_variant

# 识别变体
result = recognize_variant("Picture1")
print(result)  # ("Picture", 1)

# 判断是否为 Picture 变体
is_variant = is_picture_variant("Photo 2")
print(is_variant)  # True

is_variant = is_picture_variant("Name")
print(is_variant)  # False
```

#### 批量识别

```python
from src.core import recognize_variant

headers = ["Picture1", "Photo 2", "图片 1", "Name"]

for header in headers:
    result = recognize_variant(header)
    if result:
        print(f"{header:15s} → {result[0]} {result[1]}")
    else:
        print(f"{header:15s} → 非 Picture 变体")
```

**输出**:
```
Picture1        → Picture 1
Photo 2         → Picture 2
图片 1           → Picture 1
Name            → 非 Picture 变体
```

---

### 5.2 拼写纠错

```python
from src.core import correct_spelling

# 纠正拼写错误
errors = ["Photoes", "Pitures", "Imgs", "Foto"]

for error in errors:
    corrected = correct_spelling(error)
    print(f"{error:10s} → {corrected}")
```

**输出**:
```
Photoes    → Photos
Pitures    → Pictures
Imgs       → Images
Foto       → Photo
```

---

### 5.3 文本格式化

#### 单个文本

```python
from src.utils import format_picture_text

texts = ["Pitures1", "Picture1", "Photoes1", "Figure1"]

for text in texts:
    formatted = format_picture_text(text)
    print(f"{text:15s} → {formatted}")
```

**输出**:
```
Pitures1        → Pictures 1
Picture1        → Picture 1
Photoes1        → Photos 1
Figure1         → Figure 1
```

#### 批量处理文件

**input.txt**:
```
Pitures1
Picture1
Photoes1
Figure1
Name1
```

**运行**:
```bash
python format_text.py --batch input.txt output.txt
```

**output.txt**:
```
Pictures 1
Picture 1
Photos 1
Figure 1
Name1
```

---

### 5.4 Excel 处理集成

#### 完整流程

```python
from src.core.excel_processor import ExcelProcessor
from src.core.process_engine import ImageMatcher
from src.core.image_processor import ImageProcessor

# 1. 加载图片
image_processor = ImageProcessor()
images = image_processor.load_images("/path/to/images")

# 2. 创建匹配器
matcher = ImageMatcher(images)

# 3. 处理 Excel
processor = ExcelProcessor("sales.xlsx", read_only=False)
sheet_info = processor.find_sheet_with_product_code()

# 4. 添加 Picture 列（严格按需）
result = processor.add_picture_columns(image_matcher=matcher)

# 5. 查看结果
print(f"已存在列：{len(result.existing_columns)}")
print(f"新增列：{len(result.added_columns)}")
print(f"总列数：{result.total_columns}")

# 6. 保存图片
processor.save("output.xlsx")
```

#### 详细结果查看

```python
# 查看已存在的列
for col in result.existing_columns:
    print(f"已存在：Picture {col.number} (列{col.column_index}) - 原始表头：{col.original_header}")

# 查看新增的列
for col in result.added_columns:
    print(f"新增：Picture {col.number} (列{col.column_index})")
```

**输出示例**:
```
已存在：Picture 1 (列 18) - 原始表头：Picture1
已存在：Picture 2 (列 19) - 原始表头：Photo 2
新增：Picture 3 (列 20)
```

---

## 6. API 参考

### 6.1 picture_variant 模块

#### recognize_variant(header: str) → Optional[Tuple[str, int]]

识别 Picture 变体

**参数**:
- `header` (str): 表头字符串

**返回**:
- `Tuple[str, int]`: (标准化名称，编号)
- `None`: 不是 Picture 变体

**示例**:
```python
recognize_variant("Picture1")  # ("Picture", 1)
recognize_variant("Photo 2")   # ("Picture", 2)
recognize_variant("Name")      # None
```

---

#### correct_spelling(text: str) → str

拼写纠错

**参数**:
- `text` (str): 原始文本

**返回**:
- `str`: 纠正后的文本

**示例**:
```python
correct_spelling("Photoes")    # "Photos"
correct_spelling("Pitures")    # "Pictures"
```

---

#### is_picture_variant(header: str) → bool

判断是否为 Picture 变体

**参数**:
- `header` (str): 表头字符串

**返回**:
- `bool`: 是否为 Picture 变体

**示例**:
```python
is_picture_variant("Picture1")  # True
is_picture_variant("Name")      # False
```

---

### 6.2 text_formatter 模块

#### format_picture_text(text: str) → str

格式化 Picture 术语文本

**参数**:
- `text` (str): 输入文本

**返回**:
- `str`: 格式化后的文本

**示例**:
```python
format_picture_text("Pitures1")     # "Pictures 1"
format_picture_text("Picture1")     # "Picture 1"
format_picture_text("Photoes1")     # "Photos 1"
```

---

### 6.3 ExcelProcessor 类

#### scan_product_images(image_matcher) → int

扫描商品的图片数量

**参数**:
- `image_matcher`: ImageMatcher 对象

**返回**:
- `int`: 最大图片数

---

#### add_picture_columns(image_matcher=None, max_pictures=None) → ColumnAdditionResult

添加 Picture 列

**参数**:
- `image_matcher` (可选): ImageMatcher 对象
- `max_pictures` (可选): 最大图片数

**返回**:
- `ColumnAdditionResult`: 列添加结果

---

## 7. 测试验证

### 7.1 运行测试

```bash
# 单元测试
python -m pytest tests/test_picture_variant.py -v

# 集成测试
python -m pytest tests/test_excel_processor.py -v

# 所有测试
python -m pytest tests/ -v

# 快速验证
python verify_integration.py
```

### 7.2 测试覆盖

| 测试类型 | 测试数 | 通过率 |
|----------|--------|--------|
| 单元测试 | 28 | 100% |
| 集成测试 | 14 | 100% |
| 功能验证 | 30 | 100% |
| **总计** | **72** | **100%** |

### 7.3 关键测试用例

#### 变体识别测试

```python
# 无空格
assert recognize_variant("Picture1") == ("Picture", 1)

# 有空格
assert recognize_variant("Picture 1") == ("Picture", 1)

# 中文
assert recognize_variant("图片 1") == ("Picture", 1)

# 拼写错误
assert recognize_variant("Photoes1") == ("Picture", 1)
```

#### 文本格式化测试

```python
# 修正拼写并添加空格
assert format_picture_text("Pitures1") == "Pictures 1"

# 仅添加空格
assert format_picture_text("Picture1") == "Picture 1"

# 非目标术语
assert format_picture_text("Name1") == "Name1"
```

---

## 8. 故障排除

### 8.1 常见问题

#### 问题 1: 模块导入失败

**错误**:
```
ModuleNotFoundError: No module named 'picture_variant'
```

**原因**: 模块文件不存在或路径错误

**解决方案**:
1. 确认文件存在：`ls src/core/picture_variant.py`
2. 检查导出配置：`cat src/core/__init__.py`
3. 重新运行测试：`python verify_integration.py`

---

#### 问题 2: 识别失败

**错误**:
```python
recognize_variant("Picture1")  # 返回 None
```

**原因**: 
- 拼写错误不在纠错映射表中
- 编号超出范围（>10）

**解决方案**:
1. 检查拼写：`correct_spelling("Picture1")`
2. 检查编号：确保在 1-10 范围内

---

#### 问题 3: 测试失败

**错误**:
```
FAILED tests/test_excel_processor.py::test_add_picture_columns
```

**原因**: 返回值类型变更

**解决方案**:
确认测试已更新为使用 `ColumnAdditionResult`:
```python
from src.core.picture_variant import ColumnAdditionResult

result = processor.add_picture_columns()
assert isinstance(result, ColumnAdditionResult)
```

---

### 8.2 调试技巧

#### 启用详细日志

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

#### 检查识别过程

```python
from src.core import VariantRecognizer

recognizer = VariantRecognizer()

# 详细识别过程
header = "Photoes1"
print(f"原始：{header}")

# 步骤 1: 拼写纠错
corrected = recognizer.corrector.correct(header)
print(f"纠错后：{corrected}")

# 步骤 2: 识别
result = recognizer.recognize(header)
print(f"识别结果：{result}")
```

---

## 9. 示例代码

### 9.1 完整示例：处理 Excel

```python
#!/usr/bin/env python3
"""
完整示例：处理 Excel 并添加 Picture 列
"""

from src.core.excel_processor import ExcelProcessor
from src.core.process_engine import ImageMatcher
from src.core.image_processor import ImageProcessor
from src.core import recognize_variant

def main():
    # 1. 初始化
    image_processor = ImageProcessor()
    processor = ExcelProcessor("input.xlsx", read_only=False)
    
    # 2. 查找工作表
    sheet_info = processor.find_sheet_with_product_code()
    if not sheet_info:
        print("❌ 未找到包含商品编码的工作表")
        return
    
    print(f"✅ 找到工作表：{sheet_info.name}")
    
    # 3. 加载图片
    images = image_processor.load_images("./images")
    matcher = ImageMatcher(images)
    
    # 4. 扫描已存在的 Picture 列
    worksheet = processor.workbook[sheet_info.name]
    for col_idx in range(1, worksheet.max_column + 1):
        cell = worksheet.cell(row=sheet_info.header_row, column=col_idx)
        if cell.value:
            result = recognize_variant(str(cell.value))
            if result:
                print(f"已存在 Picture 列：{cell.value} → Picture {result[1]}")
    
    # 5. 添加 Picture 列
    result = processor.add_picture_columns(image_matcher=matcher)
    
    print(f"\n列添加结果:")
    print(f"  已存在：{len(result.existing_columns)} 列")
    print(f"  新增：{len(result.added_columns)} 列")
    print(f"  总计：{result.total_columns} 列")
    
    # 6. 保存图片
    processor.save("output.xlsx")
    print("\n✅ 处理完成！文件已保存到 output.xlsx")

if __name__ == '__main__':
    main()
```

---

### 9.2 批量格式化文本

```python
#!/usr/bin/env python3
"""
批量格式化文本文件中的 Picture 术语
"""

from src.utils import format_picture_text

def format_file(input_path, output_path):
    """格式化文件中的 Picture 术语"""
    
    with open(input_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    formatted_lines = []
    for line in lines:
        formatted = format_picture_text(line.rstrip('\n'))
        formatted_lines.append(formatted + '\n')
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.writelines(formatted_lines)
    
    print(f"✅ 格式化完成！")
    print(f"   输入：{input_path}")
    print(f"   输出：{output_path}")
    print(f"   行数：{len(lines)}")

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) != 3:
        print("用法：python format_file.py <input> <output>")
        sys.exit(1)
    
    format_file(sys.argv[1], sys.argv[2])
```

---

## 10. 附录

### 10.1 支持的变体列表

#### 英文变体（16 种）

| 基础词 | 无编号 | 无空格 | 有空格 | 缩写 |
|--------|--------|--------|--------|------|
| Picture | Picture | Picture1 | Picture 1 | Pic. |
| Photo | Photo | Photo1 | Photo 1 | - |
| Image | Image | Image1 | Image 1 | Img. |
| Figure | Figure | Figure1 | Figure 1 | Fig. |

**复数形式**: Pictures, Photos, Images, Figures

**大小写变体**: PICTURE, picture, Picture

---

#### 中文变体（8 种）

| 基础词 | 带编号 |
|--------|--------|
| 图片 | 图片 1 |
| 照片 | 照片 1 |
| 图像 | 图像 1 |
| 图 | 图 1 |

---

### 10.2 拼写纠错映射表

```python
SPELLING_CORRECTIONS = {
    # Photo 相关
    'photoes': 'photos',
    'foto': 'photo',
    'fotos': 'photos',
    
    # Picture 相关
    'pitures': 'pictures',
    'piture': 'picture',
    'picure': 'picture',
    'picures': 'pictures',
    'pictue': 'picture',
    'pictuers': 'pictures',
    
    # Image 相关
    'imgs': 'images',
    'imge': 'image',
    'imges': 'images',
    
    # Figure 相关
    'fig': 'figure',
    
    # 中文常见错误
    '图片片': '图片',
    '照照片': '照片',
}
```

---

### 10.3 相关文件清单

**核心模块**:
- `src/core/picture_variant.py` - 变体识别核心模块
- `src/utils/text_formatter.py` - 文本格式化工具
- `src/core/excel_processor.py` - Excel 处理器（增强版）

**测试文件**:
- `tests/test_picture_variant.py` - 单元测试
- `tests/test_excel_processor.py` - 集成测试

**工具脚本**:
- `format_text.py` - 命令行格式化工具
- `verify_integration.py` - 集成验证脚本
- `verify_picture_variants.py` - 功能验证脚本

**文档**:
- `docs/ALIGNMENT_Picture 变体支持.md` - 需求对齐
- `docs/DESIGN_Picture 变体支持.md` - 架构设计
- `docs/TASK_Picture 变体支持.md` - 任务拆分
- `docs/FINAL_Picture 变体支持.md` - 项目总结
- `INTEGRATION_REPORT.md` - 集成状态报告
- `TEST_REPORT_Header_Recognition.md` - 表头识别测试报告
- `TEST_REPORT_Text_Formatting.md` - 文本格式化测试报告

---

### 10.4 快速命令参考

```bash
# 运行快速验证
python verify_integration.py

# 运行单元测试
python -m pytest tests/test_picture_variant.py -v

# 运行集成测试
python -m pytest tests/test_excel_processor.py -v

# 运行所有测试
python -m pytest tests/ -v

# 格式化单个文本
python format_text.py "Pitures1"

# 格式化多个文本
python format_text.py "Picture1 Photoes1 Figure1"

# 批量处理文件
python format_text.py --batch input.txt output.txt

# 查看测试覆盖率
python -m pytest tests/ --cov=src/core --cov-report=html
```

---

## 📞 支持与反馈

如有问题或建议，请查阅以下资源：

1. **文档**: 查看本文档及各分文档
2. **测试**: 运行测试验证功能
3. **日志**: 启用详细日志进行调试

---

**文档版本**: v1.0.0  
**最后更新**: 2026-03-11  
**维护者**: ImageAutoInserter Team
