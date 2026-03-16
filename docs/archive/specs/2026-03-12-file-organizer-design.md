# 文件自动整理系统设计规格（已修正）

**版本**: 1.1  
**日期**: 2026-03-13  
**状态**: 已实施并验证  
**类型**: 工具系统

---

## 1. 概述

### 1.1 目标

为 ImageAutoInserter 项目设计一套自动文件整理系统，解决开发过程中产生的各类文件（测试输出、错误报告、图片等）缺乏统一管理的问题。

### 1.2 核心需求

| 需求 | 描述 | 状态 |
|-----|------|------|
| **自动分类** | 每次生成/保存文件后，自动移动到对应分类目录 | ✅ 已实现 |
| **容易查找** | 通过索引维护原路径映射，支持快速查找 | ✅ 已实现 |
| **安全保护** | 不移动源代码、配置文件等关键文件 | ✅ 已实现 |
| **批量整理** | 支持扫描现有文件并批量整理 | ✅ 已实现 |

### 1.3 设计原则

1. **安全第一** - 排除 src/, .trae/, .git/ 等关键目录
2. **延迟处理** - 文件创建后延迟 3 秒移动，确保写入完成
3. **稳定性检查** - 移动前检查文件大小是否稳定
4. **冲突处理** - 目标文件存在时自动添加数字后缀
5. **可搜索** - 维护文件索引，支持原路径反向查找

---

## 2. 系统架构

### 2.1 目录结构

```
项目根目录/
├── file_organizer/               # 文件整理系统代码
│   ├── __init__.py
│   ├── __main__.py              # CLI 入口
│   ├── organizer.py             # 主程序 - 文件监听与调度
│   ├── classifier.py            # 分类规则引擎
│   ├── indexer.py               # 文件索引管理
│   └── config.yaml              # 配置文件
│
├── .organized/                   # 整理后的文件（实际使用）
│   ├── data/
│   │   ├── test-results/        # 测试输出 (TEST_OUTPUT_*.xlsx)
│   │   ├── processed/           # 处理后数据 (*_processed.xlsx)
│   │   ├── archives/            # 压缩包 (*.zip, *.rar, *.7z)
│   │   └── images/              # 图片 (C*.jpg, *.png)
│   │
│   ├── logs/
│   │   └── errors/              # 错误报告 (错误报告_*.txt)
│   │
│   ├── reports/                 # 测试报告 (TEST_REPORT*.md)
│   ├── experiments/
│   │   └── prototypes/          # HTML 原型
│   └── artifacts/
│       └── temp/                # 临时文件
│
├── src/                          # 源代码（排除）
├── .trae/                        # Skill 系统（排除）
├── docs/                         # 文档（排除）
└── Sample/                       # 示例数据目录
    └── .organized/               # 子目录独立整理
```

### 2.2 组件设计

```
file_organizer/
├── organizer.py         # FileOrganizer 类 - 核心逻辑
│   ├── FileChangeHandler    # 文件系统事件监听
│   ├── _is_file_stable()    # 文件稳定性检查
│   ├── _organize_file()     # 单文件整理
│   └── scan_and_organize()  # 批量扫描
│
├── classifier.py       # Classifier 类 - 规则匹配
│   ├── ClassificationRule   # 规则数据类
│   └── classify()          # 分类决策
│
├── indexer.py          # FileIndexer 类 - 索引管理
│   ├── add_entry()         # 添加索引记录
│   ├── find_by_original()  # 原路径查找
│   └── list_all()          # 列出所有记录
│
└── config.yaml         # 配置文件
```

---

## 3. 配置文件详解

### 3.1 配置结构

```yaml
version: "1.0"

# 监听路径
watch_paths:
  - "."

# 排除目录（永远不移动）
exclude_dirs:
  - "src/"
  - ".trae/"
  - "node_modules/"
  - ".git/"
  - "public/"
  - "docs/"
  - ".venv/"
  - "dist/"
  - "build/"
  - ".organized/"    # 避免循环整理

# 延迟时间（秒）
delay_seconds: 3

# 分类规则
rules:
  - name: "规则名称"
    patterns:
      - "匹配模式1"
      - "匹配模式2"
    target_dir: "目标目录/"
    source_dir: "可选的源目录限制"

# 默认分类
default_dir: "misc/"
```

### 3.2 实际分类规则

| 规则名称 | 匹配模式 | 目标目录 | 说明 |
|---------|---------|---------|------|
| 测试输出 | `TEST_OUTPUT_*.xlsx`, `*_test*.xlsx` | `data/test-results/` | 测试生成的 Excel |
| 错误报告 | `错误报告_*.txt`, `error_*.log` | `logs/errors/` | 错误日志 |
| 处理后Excel | `*_processed.xlsx` | `data/processed/` | 处理后的数据 |
| 测试报告 | `TEST_REPORT*.md`, `*_test_report.md` | `reports/` | Markdown 报告 |
| 原型HTML | `*.html` (source_dir: prototypes/) | `experiments/prototypes/` | HTML 原型 |
| 压缩包 | `*.zip`, `*.rar`, `*.7z` | `data/archives/` | 压缩文件 |
| 图片数据 | `C*.jpg`, `C*.png`, `*.jpg`, `*.png` | `data/images/` | 商品图片 |
| 临时文件 | `temp_*`, `*.tmp`, `~*` | `artifacts/temp/` | 临时文件 |

### 3.3 规则优先级

规则按配置顺序从上到下匹配，**第一个匹配的规则生效**。

---

## 4. 核心功能实现

### 4.1 文件监听与延迟处理

```python
class FileChangeHandler(FileSystemEventHandler):
    def on_created(self, event):
        # 1. 忽略目录和隐藏文件
        if event.is_directory or filename.startswith('.'):
            return
        
        # 2. 延迟处理（等待写入完成）
        time.sleep(self.organizer.config.get("delay_seconds", 3))
        
        # 3. 检查文件是否稳定
        if self.organizer._is_file_stable(event.src_path):
            self.organizer._organize_file(event.src_path)
```

### 4.2 文件稳定性检查

```python
def _is_file_stable(self, file_path: str, max_attempts: int = 3) -> bool:
    """检查文件是否已稳定（不再被写入）"""
    for _ in range(max_attempts):
        size1 = os.path.getsize(file_path)
        time.sleep(0.5)
        size2 = os.path.getsize(file_path)
        
        if size1 == size2:
            return True
    return False
```

### 4.3 安全移动与冲突处理

```python
def _safe_move_file(self, source: str, target: str) -> bool:
    """安全移动文件，处理冲突"""
    # 如果目标已存在，添加数字后缀
    if os.path.exists(target):
        base, ext = os.path.splitext(target)
        counter = 1
        while os.path.exists(target):
            target = f"{base}_{counter}{ext}"
            counter += 1
    
    shutil.move(source, target)
    return True
```

### 4.4 索引管理

```python
# 添加索引记录
self.indexer.add_entry(
    original_path=file_path,
    organized_path=target_path,
    category=target_dir.strip('./')
)

# 搜索示例
results = organizer.indexer.find_by_original("TEST_OUTPUT")
# 返回: [{"original_path": "...", "organized_path": "...", "category": "..."}]
```

---

## 5. CLI 命令

### 5.1 可用命令

```bash
# 启动文件监听
python -m file_organizer start

# 查看整理状态
python -m file_organizer status

# 搜索文件
python -m file_organizer find --query "TEST_OUTPUT"

# 扫描并整理现有文件
python -m file_organizer scan --path ./Sample

# 停止监听（Ctrl+C）
```

### 5.2 使用示例

```bash
# 1. 整理 Sample 目录下的现有文件
cd /Users/shimengyu/Documents/trae_projects/ImageAutoInserter
python -m file_organizer scan --path ./Sample

# 2. 启动监听（后台自动整理新文件）
python -m file_organizer start

# 3. 查找测试输出文件
python -m file_organizer find --query "TEST_OUTPUT"
```

---

## 6. 索引系统

### 6.1 索引文件格式

```json
{
  "index_version": 1,
  "last_updated": "2026-03-13T10:00:00Z",
  "files": [
    {
      "original_path": "Sample/TEST_OUTPUT_1.xlsx",
      "organized_path": "Sample/.organized/data/test-results/TEST_OUTPUT_1.xlsx",
      "category": "data/test-results",
      "moved_at": "2026-03-13T09:30:00Z"
    }
  ]
}
```

### 6.2 索引位置

- 主索引: `.organized/index.json`
- 子目录索引: `{subdir}/.organized/index.json`

### 6.3 并发安全机制

使用 `filelock` 库实现文件级锁，确保多进程/线程安全：

```python
from filelock import FileLock

# 创建锁文件
lock = FileLock(self.lock_path)  # .organized/index.json.lock

# 原子操作
with lock:
    data = self._load()
    # 修改数据
    self._save(data)
```

**特性：**
- 自动创建 `.lock` 文件
- 上下文管理器确保锁释放
- 防止并发写入导致索引损坏

### 6.4 索引 API

```python
# 添加/更新条目
indexer.add_entry(
    original_path="Sample/test.xlsx",
    organized_path="Sample/.organized/data/test.xlsx",
    category="data"
)

# 按原路径搜索（支持部分匹配）
results = indexer.find_by_original("TEST_OUTPUT")
# 返回: [{"original_path": "...", "organized_path": "...", "category": "..."}]

# 按分类搜索
results = indexer.find_by_category("data/test-results")

# 列出所有条目
all_files = indexer.list_all()
```

### 6.5 重复条目处理

当添加已存在的 `original_path` 时：
- 自动更新 `organized_path` 和 `category`
- 更新 `moved_at` 时间戳
- 不创建重复条目

---

## 7. 安全机制

### 7.1 排除目录（绝对不移动）

| 目录 | 原因 |
|------|------|
| `src/` | 源代码 |
| `.trae/` | Skill 系统 |
| `.git/` | Git 仓库 |
| `node_modules/` | 依赖包 |
| `docs/` | 文档（手动管理） |
| `.organized/` | 避免循环整理 |

### 7.2 隐藏文件保护

- 所有以 `.` 开头的文件被忽略
- 包括 `.env`, `.gitignore` 等配置文件

### 7.3 文件稳定性保证

- 延迟 3 秒后处理
- 检查文件大小是否稳定（连续两次相同）
- 最多尝试 3 次

---

## 8. 使用流程

### 8.1 首次使用

```bash
# 1. 确保依赖已安装
pip install watchdog pyyaml

# 2. 扫描现有文件
python -m file_organizer scan --path ./Sample

# 3. 查看整理结果
python -m file_organizer status
```

### 8.2 日常工作流程

```
Trae 生成文件 → 系统检测到新文件
       ↓
延迟 3 秒 → 检查文件稳定
       ↓
匹配分类规则 → 移动到对应目录
       ↓
更新索引 → 记录原路径映射
```

### 8.3 查找文件示例

```bash
# 用户想找测试输出
$ python -m file_organizer find --query "TEST_OUTPUT"
找到 5 个结果:
  Sample/TEST_OUTPUT_1.xlsx -> Sample/.organized/data/test-results/TEST_OUTPUT_1.xlsx
  Sample/TEST_OUTPUT_2.xlsx -> Sample/.organized/data/test-results/TEST_OUTPUT_2.xlsx
  ...

# 用户想找错误报告
$ python -m file_organizer find --query "错误报告"
找到 2 个结果:
  错误报告_20260312_101530.txt -> .organized/logs/errors/错误报告_20260312_101530.txt
```

---

## 9. 技术实现

### 9.1 依赖

| 库 | 用途 | 版本 |
|---|------|------|
| `watchdog` | 跨平台文件系统监听 | >=3.0.0 |
| `pyyaml` | 配置文件解析 | >=6.0 |
| `filelock` | 文件级锁（并发安全） | >=3.0 |

### 9.2 核心类

#### FileOrganizer - 主类

```python
class FileOrganizer:
    def __init__(self, config_path: str = "file_organizer/config.yaml")
    def start(self)                           # 启动监听
    def stop(self)                            # 停止监听
    def scan_and_organize(self, root_path: str)  # 批量扫描
    def _organize_file(self, file_path: str)  # 单文件整理
    def _is_file_stable(self, file_path: str) -> bool  # 文件稳定性检查
    def _safe_move_file(self, source: str, target: str) -> bool  # 安全移动
```

#### Classifier - 分类器

```python
class ClassificationRule:
    """分类规则数据类"""
    name: str           # 规则名称
    patterns: List[str] # 匹配模式列表
    target_dir: str     # 目标目录
    source_dir: Optional[str]  # 可选的源目录限制
    
    def matches(self, filename: str) -> bool

class Classifier:
    def __init__(self, rules_config: List[dict])
    def classify(self, filename: str, source_dir: str = None) -> Optional[str]
```

#### FileIndexer - 索引器

```python
class FileIndexer:
    def __init__(self, index_path: str = ".organized/index.json")
    
    # 核心方法
    def add_entry(self, original_path: str, organized_path: str, category: str)
    def find_by_original(self, query: str) -> List[dict]      # 原路径搜索
    def find_by_category(self, category: str) -> List[dict]   # 分类搜索
    def list_all(self) -> List[dict]                          # 列出所有
    
    # 内部方法
    def _ensure_index(self)      # 确保索引文件存在
    def _load(self) -> dict      # 加载索引
    def _save(self, data: dict)  # 保存索引
```

#### FileChangeHandler - 文件监听处理器

```python
class FileChangeHandler(FileSystemEventHandler):
    """watchdog 文件系统事件处理器"""
    
    def __init__(self, organizer: FileOrganizer)
    def on_created(self, event)   # 文件创建事件
    def on_modified(self, event)  # 文件修改事件（可选）
```

---

## 10. 扩展性

### 10.1 添加新规则

在 `file_organizer/config.yaml` 中添加：

```yaml
rules:
  - name: "新文件类型"
    patterns:
      - "new_*.xlsx"
      - "pattern_*.csv"
    target_dir: "data/new-type/"
```

### 10.2 修改排除目录

```yaml
exclude_dirs:
  - "src/"
  - ".trae/"
  - "my_custom_dir/"    # 添加自定义排除目录
```

---

## 11. 验收标准

### 11.1 核心功能

| # | 标准 | 验证方法 | 状态 |
|---|------|---------|------|
| 1 | TEST_OUTPUT 文件自动移动到 `.organized/data/test-results/` | 创建 TEST_OUTPUT_1.xlsx，检查目录 | ✅ 通过 |
| 2 | 错误报告自动移动到 `.organized/logs/errors/` | 运行处理，检查错误报告位置 | ✅ 通过 |
| 3 | 源代码目录不被移动 | 检查 src/ 目录完整性 | ✅ 通过 |
| 4 | 搜索功能正常 | `organizer find --query "TEST"` 返回正确结果 | ✅ 通过 |
| 5 | 延迟机制有效 | 文件创建后 3 秒才移动 | ✅ 通过 |
| 6 | 批量扫描功能正常 | `organizer scan --path ./Sample` 整理所有文件 | ✅ 通过 |
| 7 | 文件冲突处理 | 同名文件自动添加数字后缀 | ✅ 通过 |

### 11.2 索引系统

| # | 标准 | 验证方法 | 状态 |
|---|------|---------|------|
| 8 | 索引文件自动创建 | 首次运行时创建 `.organized/index.json` | ✅ 通过 |
| 9 | 索引更新正确 | 移动文件后索引包含正确记录 | ✅ 通过 |
| 10 | 重复条目更新 | 同一文件移动多次只保留一条记录 | ✅ 通过 |
| 11 | 分类搜索 | `find_by_category("data/test-results")` 返回正确结果 | ✅ 通过 |
| 12 | 并发安全 | 多进程同时写入索引不损坏数据 | ✅ 通过 |

### 11.3 CLI 功能

| # | 标准 | 验证方法 | 状态 |
|---|------|---------|------|
| 13 | start 命令 | `python -m file_organizer start` 启动监听 | ✅ 通过 |
| 14 | status 命令 | `python -m file_organizer status` 显示索引统计 | ✅ 通过 |
| 15 | find 命令 | `python -m file_organizer find --query "xxx"` 搜索 | ✅ 通过 |
| 16 | scan 命令 | `python -m file_organizer scan --path ./Sample` 扫描 | ✅ 通过 |

---

## 12. 已知问题与限制

### 12.1 当前限制

1. **监听范围**: 只能监听配置中指定的路径，不支持动态添加
2. **索引大小**: 索引文件可能随时间增长，需要定期清理
3. **跨设备移动**: 不支持跨文件系统移动（如从 SSD 到网络驱动器）

### 12.2 未来改进

- [ ] 添加索引压缩和归档功能
- [ ] 支持正则表达式匹配规则
- [ ] 添加 Web UI 管理界面
- [ ] 支持云存储同步

---

## 13. 更新日志

### v1.2 (2026-03-13)
- ✅ 添加索引系统详细说明（并发安全、API、重复条目处理）
- ✅ 补充 `filelock` 依赖说明
- ✅ 完善核心类文档（FileChangeHandler、ClassificationRule）
- ✅ 扩展验收标准（索引系统、CLI 功能）
- ✅ 添加 `find_by_category` 搜索功能说明

### v1.1 (2026-03-13)
- ✅ 修正 spec 文档，与实际代码保持一致
- ✅ 添加详细的配置说明
- ✅ 补充 CLI 命令示例
- ✅ 添加验收标准

### v1.0 (2026-03-12)
- 🎉 初始版本设计

---

**批准**: 已实现并验证  
**文档维护**: 随代码更新同步更新
