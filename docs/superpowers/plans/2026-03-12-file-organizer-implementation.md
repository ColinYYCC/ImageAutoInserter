# File Organizer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现一个自动文件整理系统，监听项目文件变化并自动将 Trae 生成的文件分类到对应目录

**Architecture:** 使用 watchdog 库监听文件系统变化，结合分类规则引擎实现自动分类。采用延迟机制确保文件写入完成后才移动，维护索引文件加速搜索。

**Tech Stack:** Python, watchdog, pyyaml, filelock

---

## Chunk 1: 项目基础结构

### Task 1: 创建项目目录结构和配置文件

**Files:**
- Create: `file_organizer/config.yaml`
- Create: `file_organizer/requirements.txt`

- [ ] **Step 1: 创建配置目录和文件**

```yaml
# file_organizer/config.yaml
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

# 延迟时间（秒）
delay_seconds: 3

# 分类规则
rules:
  - name: "测试输出"
    patterns:
      - "TEST_OUTPUT_*.xlsx"
      - "*_test*.xlsx"
    target_dir: ".organized/outputs/test-results/"

  - name: "错误报告"
    patterns:
      - "错误报告_*.txt"
      - "error_*.log"
    target_dir: ".organized/logs/errors/"

  - name: "处理后Excel"
    patterns:
      - "*_processed.xlsx"
    target_dir: ".organized/outputs/processed/"

  - name: "测试报告"
    patterns:
      - "TEST_REPORT*.md"
      - "*_test_report.md"
    target_dir: ".organized/outputs/reports/"

  - name: "原型HTML"
    patterns:
      - "*.html"
    source_dir: "prototypes/"
    target_dir: ".organized/experiments/prototypes/html/"

  - name: "压缩包"
    patterns:
      - "*.zip"
      - "*.rar"
      - "*.7z"
    target_dir: ".organized/data/archives/"

  - name: "图片数据"
    patterns:
      - "C*.jpg"
      - "C*.png"
      - "*.jpg"
      - "*.png"
    target_dir: ".organized/data/images/"

  - name: "临时文件"
    patterns:
      - "temp_*"
      - "*.tmp"
      - "~*"
    target_dir: ".organized/artifacts/temp/"

# 默认分类
default_dir: ".organized/misc/"
```

- [ ] **Step 2: 创建 requirements.txt**

```
watchdog>=3.0.0
pyyaml>=6.0
filelock>=3.12.0
```

- [ ] **Step 3: 创建 __init__.py**

```python
# file_organizer/__init__.py
"""
File Organizer - 自动文件整理系统
"""

__version__ = "1.0.0"
```

- [ ] **Step 4: Commit**

```bash
git add file_organizer/config.yaml file_organizer/requirements.txt file_organizer/__init__.py
git commit -m "feat(file-organizer): 创建项目结构和配置文件"
```

---

## Chunk 2: 分类规则引擎

### Task 2: 实现分类规则引擎

**Files:**
- Create: `file_organizer/classifier.py`

- [ ] **Step 1: 编写分类器测试**

```python
# tests/test_classifier.py
import pytest
import sys
sys.path.insert(0, 'file_organizer')

from classifier import Classifier, ClassificationRule

def test_match_pattern_simple():
    rule = ClassificationRule(
        name="test",
        patterns=["TEST_*.xlsx"],
        target_dir=".organized/outputs/test/"
    )
    assert rule.matches("TEST_OUTPUT_1.xlsx") == True
    assert rule.matches("test_output_1.xlsx") == False

def test_match_pattern_glob():
    rule = ClassificationRule(
        name="images",
        patterns=["*.jpg", "*.png"],
        target_dir=".organized/data/images/"
    )
    assert rule.matches("photo.jpg") == True
    assert rule.matches("photo.png") == True
    assert rule.matches("photo.gif") == False

def test_classifier_basic():
    config = {"rules": [
        {"name": "test", "patterns": ["TEST_*.xlsx"], "target_dir": ".organized/outputs/test/"},
        {"name": "error", "patterns": ["错误报告_*.txt"], "target_dir": ".organized/logs/errors/"}
    ]}
    classifier = Classifier(config["rules"])
    
    result = classifier.classify("TEST_OUTPUT_1.xlsx")
    assert result == ".organized/outputs/test/"
    
    result = classifier.classify("错误报告_20260312.txt")
    assert result == ".organized/logs/errors/"
```

- [ ] **Step 2: 运行测试验证失败**

Run: `python -m pytest tests/test_classifier.py -v`
Expected: FAIL (classifier not implemented)

- [ ] **Step 3: 实现分类器**

```python
# file_organizer/classifier.py
"""分类规则引擎"""
import fnmatch
import os
from dataclasses import dataclass
from typing import List, Optional
import yaml


@dataclass
class ClassificationRule:
    """分类规则"""
    name: str
    patterns: List[str]
    target_dir: str
    source_dir: Optional[str] = None


class Classifier:
    """分类器"""
    
    def __init__(self, rules_config: List[dict]):
        self.rules = []
        for rule_config in rules_config:
            rule = ClassificationRule(
                name=rule_config["name"],
                patterns=rule_config["patterns"],
                target_dir=rule_config["target_dir"],
                source_dir=rule_config.get("source_dir")
            )
            self.rules.append(rule)
    
    def classify(self, filename: str, source_dir: str = None) -> Optional[str]:
        """
        分类文件
        
        Args:
            filename: 文件名
            source_dir: 源目录（可选）
        
        Returns:
            目标目录路径，如果无匹配返回 None
        """
        for rule in self.rules:
            # 检查源目录限制
            if rule.source_dir and source_dir:
                if not source_dir.startswith(rule.source_dir):
                    continue
            
            # 检查文件名模式
            for pattern in rule.patterns:
                if fnmatch.fnmatch(filename, pattern):
                    return rule.target_dir
        
        return None


def load_config(config_path: str = "file_organizer/config.yaml") -> dict:
    """加载配置文件"""
    with open(config_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)
```

- [ ] **Step 4: 运行测试验证通过**

Run: `python -m pytest tests/test_classifier.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add file_organizer/classifier.py tests/test_classifier.py
git commit -m "feat(file-organizer): 实现分类规则引擎"
```

---

## Chunk 3: 文件索引管理

### Task 3: 实现文件索引管理

**Files:**
- Create: `file_organizer/indexer.py`

- [ ] **Step 1: 编写索引器测试**

```python
# tests/test_indexer.py
import pytest
import json
import sys
import os
import tempfile

sys.path.insert(0, 'file_organizer')

from indexer import FileIndexer

def test_add_entry():
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        temp_path = f.name
    
    try:
        indexer = FileIndexer(temp_path)
        indexer.add_entry(
            original_path="Sample/TEST_OUTPUT_1.xlsx",
            organized_path=".organized/outputs/test-results/TEST_OUTPUT_1.xlsx",
            category="test-results"
        )
        
        data = json.load(open(temp_path))
        assert len(data["files"]) == 1
        assert data["files"][0]["original_path"] == "Sample/TEST_OUTPUT_1.xlsx"
    finally:
        os.unlink(temp_path)

def test_find_by_original():
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        temp_path = f.name
    
    try:
        indexer = FileIndexer(temp_path)
        indexer.add_entry(
            original_path="Sample/TEST_OUTPUT_1.xlsx",
            organized_path=".organized/outputs/test-results/TEST_OUTPUT_1.xlsx",
            category="test-results"
        )
        
        result = indexer.find_by_original("TEST_OUTPUT")
        assert len(result) == 1
        assert result[0]["original_path"] == "Sample/TEST_OUTPUT_1.xlsx"
    finally:
        os.unlink(temp_path)
```

- [ ] **Step 2: 运行测试验证失败**

Run: `python -m pytest tests/test_indexer.py -v`
Expected: FAIL

- [ ] **Step 3: 实现索引器**

```python
# file_organizer/indexer.py
"""文件索引管理"""
import json
import os
from datetime import datetime
from typing import List, Optional
from filelock import FileLock


class FileIndexer:
    """文件索引管理器"""
    
    def __init__(self, index_path: str = ".organized/index.json"):
        self.index_path = index_path
        self.lock_path = index_path + ".lock"
        self._ensure_index()
    
    def _ensure_index(self):
        """确保索引文件存在"""
        if not os.path.exists(self.index_path):
            os.makedirs(os.path.dirname(self.index_path), exist_ok=True)
            self._save({
                "index_version": 1,
                "last_updated": datetime.now().isoformat(),
                "files": []
            })
    
    def _load(self) -> dict:
        """加载索引"""
        with open(self.index_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _save(self, data: dict):
        """保存索引"""
        data["last_updated"] = datetime.now().isoformat()
        with open(self.index_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def add_entry(self, original_path: str, organized_path: str, category: str):
        """添加索引条目"""
        lock = FileLock(self.lock_path)
        with lock:
            data = self._load()
            
            # 检查是否已存在
            for entry in data["files"]:
                if entry["original_path"] == original_path:
                    entry["organized_path"] = organized_path
                    entry["category"] = category
                    entry["moved_at"] = datetime.now().isoformat()
                    break
            else:
                data["files"].append({
                    "original_path": original_path,
                    "organized_path": organized_path,
                    "category": category,
                    "moved_at": datetime.now().isoformat()
                })
            
            self._save(data)
    
    def find_by_original(self, query: str) -> List[dict]:
        """通过原路径搜索"""
        data = self._load()
        query_lower = query.lower()
        results = []
        
        for entry in data["files"]:
            if query_lower in entry["original_path"].lower():
                results.append(entry)
        
        return results
    
    def find_by_category(self, category: str) -> List[dict]:
        """通过分类搜索"""
        data = self._load()
        return [e for e in data["files"] if e["category"] == category]
    
    def list_all(self) -> List[dict]:
        """列出所有文件"""
        return self._load()["files"]
```

- [ ] **Step 4: 运行测试验证通过**

Run: `python -m pytest tests/test_indexer.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add file_organizer/indexer.py tests/test_indexer.py
git commit -m "feat(file-organizer): 实现文件索引管理"
```

---

## Chunk 4: 主程序 - 文件监听与调度

### Task 4: 实现主程序

**Files:**
- Create: `file_organizer/organizer.py`

- [ ] **Step 1: 编写主程序测试**

```python
# tests/test_organizer.py
import pytest
import sys
import tempfile
import time

sys.path.insert(0, 'file_organizer')

from organizer import FileOrganizer

def test_safe_move_file(tmp_path):
    """测试安全移动文件"""
    # 创建测试文件
    source = tmp_path / "test.txt"
    source.write_text("test content")
    
    target_dir = tmp_path / "organized"
    target_dir.mkdir()
    
    organizer = FileOrganizer(config_path=None)
    
    # 模拟移动
    result = organizer._safe_move_file(str(source), str(target_dir))
    
    assert result is True
    assert (target_dir / "test.txt").exists()
```

- [ ] **Step 2: 运行测试验证失败**

Run: `python -m pytest tests/test_organizer.py -v`
Expected: FAIL

- [ ] **Step 3: 实现主程序**

```python
# file_organizer/organizer.py
"""文件自动整理系统主程序"""
import os
import sys
import time
import shutil
from pathlib import Path
from typing import Optional
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileSystemEvent

from classifier import Classifier, load_config
from indexer import FileIndexer


class FileChangeHandler(FileSystemEventHandler):
    """文件变化处理器"""
    
    def __init__(self, organizer: 'FileOrganizer'):
        self.organizer = organizer
    
    def on_created(self, event: FileSystemEvent):
        """文件创建事件"""
        if event.is_directory:
            return
        
        # 忽略隐藏文件
        if os.path.basename(event.src_path).startswith('.'):
            return
        
        # 延迟处理
        time.sleep(self.organizer.config.get("delay_seconds", 3))
        
        # 检查文件是否稳定（不再被写入）
        if self.organizer._is_file_stable(event.src_path):
            self.organizer._organize_file(event.src_path)


class FileOrganizer:
    """文件整理器"""
    
    def __init__(self, config_path: str = "file_organizer/config.yaml"):
        # 加载配置
        if config_path and os.path.exists(config_path):
            self.config = load_config(config_path)
        else:
            self.config = {
                "watch_paths": ["."],
                "exclude_dirs": ["src/", ".trae/", "node_modules/", ".git/"],
                "delay_seconds": 3,
                "rules": []
            }
        
        # 初始化分类器
        self.classifier = Classifier(self.config.get("rules", []))
        
        # 初始化索引器
        self.indexer = FileIndexer()
        
        # 排除目录集合
        self.exclude_dirs = set(self.config.get("exclude_dirs", []))
        
        # 观察者
        self.observer: Optional[Observer] = None
    
    def _should_exclude(self, path: str) -> bool:
        """检查是否应该排除"""
        path_parts = Path(path).parts
        
        for exclude in self.exclude_dirs:
            exclude = exclude.rstrip('/')
            if exclude in path_parts:
                return True
        
        return False
    
    def _is_file_stable(self, file_path: str, max_attempts: int = 3) -> bool:
        """检查文件是否已稳定（不再被写入）"""
        if not os.path.exists(file_path):
            return False
        
        for _ in range(max_attempts):
            try:
                size1 = os.path.getsize(file_path)
                time.sleep(0.5)
                size2 = os.path.getsize(file_path)
                
                if size1 == size2:
                    return True
            except (OSError, IOError):
                return False
        
        return True
    
    def _organize_file(self, file_path: str):
        """整理单个文件"""
        if self._should_exclude(file_path):
            print(f"跳过（排除目录）: {file_path}")
            return
        
        filename = os.path.basename(file_path)
        source_dir = os.path.dirname(file_path)
        
        # 分类
        target_dir = self.classifier.classify(filename, source_dir)
        
        if not target_dir:
            print(f"无匹配规则: {file_path}")
            return
        
        # 确保目标目录存在
        os.makedirs(target_dir, exist_ok=True)
        
        # 移动文件
        target_path = os.path.join(target_dir, filename)
        
        if self._safe_move_file(file_path, target_path):
            # 更新索引
            self.indexer.add_entry(
                original_path=file_path,
                organized_path=target_path,
                category=target_dir.strip('./')
            )
            print(f"已整理: {file_path} -> {target_path}")
        else:
            print(f"移动失败: {file_path}")
    
    def _safe_move_file(self, source: str, target: str) -> bool:
        """安全移动文件"""
        try:
            # 如果目标已存在，添加数字后缀
            if os.path.exists(target):
                base, ext = os.path.splitext(target)
                counter = 1
                while os.path.exists(target):
                    target = f"{base}_{counter}{ext}"
                    counter += 1
            
            shutil.move(source, target)
            return True
        except Exception as e:
            print(f"移动文件出错: {e}")
            return False
    
    def start(self):
        """启动文件监听"""
        print("启动文件监听...")
        
        handler = FileChangeHandler(self)
        self.observer = Observer()
        
        watch_paths = self.config.get("watch_paths", ["."])
        
        for path in watch_paths:
            self.observer.schedule(handler, path, recursive=True)
        
        self.observer.start()
        print("文件监听已启动，按 Ctrl+C 停止")
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stop()
    
    def stop(self):
        """停止文件监听"""
        if self.observer:
            self.observer.stop()
            self.observer.join()
        print("文件监听已停止")


def main():
    """主入口"""
    import argparse
    
    parser = argparse.ArgumentParser(description="文件自动整理系统")
    parser.add_argument("command", choices=["start", "stop", "status", "find"], help="命令")
    parser.add_argument("--config", default="file_organizer/config.yaml", help="配置文件路径")
    parser.add_argument("--query", help="搜索关键词")
    
    args = parser.parse_args()
    
    organizer = FileOrganizer(config_path=args.config)
    
    if args.command == "start":
        organizer.start()
    elif args.command == "status":
        files = organizer.indexer.list_all()
        print(f"索引文件数: {len(files)}")
        for f in files:
            print(f"  {f['original_path']} -> {f['organized_path']}")
    elif args.command == "find":
        if args.query:
            results = organizer.indexer.find_by_original(args.query)
            print(f"找到 {len(results)} 个结果:")
            for r in results:
                print(f"  {r['original_path']} -> {r['organized_path']}")
        else:
            print("请提供搜索关键词 --query")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: 运行测试验证通过**

Run: `python -m pytest tests/test_organizer.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add file_organizer/organizer.py tests/test_organizer.py
git commit -m "feat(file-organizer): 实现主程序和文件监听"
```

---

## Chunk 5: CLI 便捷命令

### Task 5: 创建便捷启动脚本

**Files:**
- Create: `file_organizer/__main__.py`
- Create: `organizer` (可执行脚本)

- [ ] **Step 1: 创建 __main__.py**

```python
# file_organizer/__main__.py
"""便捷入口点"""
from organizer import main

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: 创建可执行脚本**

```bash
#!/bin/bash
# organizer

cd "$(dirname "$0")"
python -m file_organizer "$@"
```

- [ ] **Step 3: 设置执行权限**

```bash
chmod +x organizer
```

- [ ] **Step 4: Commit**

```bash
git add file_organizer/__main__.py organizer
git commit -m "feat(file-organizer): 添加 CLI 便捷入口"
```

---

## Chunk 6: 集成测试

### Task 6: 端到端测试

**Files:**
- Create: `tests/test_e2e.py`

- [ ] **Step 1: 编写集成测试**

```python
# tests/test_e2e.py
"""端到端测试"""
import pytest
import os
import sys
import tempfile
import time
import shutil

sys.path.insert(0, 'file_organizer')

from organizer import FileOrganizer
from indexer import FileIndexer


def test_full_workflow(tmp_path):
    """完整工作流测试"""
    # 创建临时配置
    config = {
        "watch_paths": [str(tmp_path)],
        "exclude_dirs": ["src/", ".git/"],
        "delay_seconds": 1,
        "rules": [
            {
                "name": "测试输出",
                "patterns": ["TEST_OUTPUT_*.xlsx"],
                "target_dir": str(tmp_path / ".organized/outputs/test-results")
            },
            {
                "name": "错误报告",
                "patterns": ["错误报告_*.txt"],
                "target_dir": str(tmp_path / ".organized/logs/errors")
            }
        ]
    }
    
    # 创建配置和分类器
    from classifier import Classifier
    classifier = Classifier(config["rules"])
    
    # 测试分类
    assert classifier.classify("TEST_OUTPUT_1.xlsx") == str(tmp_path / ".organized/outputs/test-results")
    assert classifier.classify("错误报告_20260312.txt") == str(tmp_path / ".organized/logs/errors")
    
    print("集成测试通过")
```

- [ ] **Step 2: 运行集成测试**

Run: `python -m pytest tests/test_e2e.py -v`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/test_e2e.py
git commit -m "test(file-organizer): 添加集成测试"
```

---

## Chunk 7: 文档和使用说明

### Task 7: 创建使用文档

**Files:**
- Create: `file_organizer/README.md`

- [ ] **Step 1: 编写 README**

```markdown
# File Organizer

自动文件整理系统 - 专为 Trae 编程开发设计

## 安装

```bash
cd file_organizer
pip install -r requirements.txt
```

## 使用

### 启动监听

```bash
python -m file_organizer start
# 或者
./organizer start
```

### 查看状态

```bash
python -m file_organizer status
```

### 搜索文件

```bash
python -m file_organizer find "TEST_OUTPUT"
python -m file_organizer find "错误报告"
```

## 配置

编辑 `file_organizer/config.yaml` 自定义规则。

## 停止

按 `Ctrl+C` 停止监听。
```

- [ ] **Step 2: Commit**

```bash
git add file_organizer/README.md
git commit -m "docs(file-organizer): 添加使用文档"
```

---

## 验收检查清单

- [ ] Task 1: 项目结构和配置文件
- [ ] Task 2: 分类规则引擎
- [ ] Task 3: 文件索引管理
- [ ] Task 4: 主程序
- [ ] Task 5: CLI 便捷入口
- [ ] Task 6: 集成测试
- [ ] Task 7: 使用文档
- [ ] 端到端验证：创建 TEST_OUTPUT 文件，验证自动移动

---

## Plan Complete

**Plan complete and saved to `docs/superpowers/plans/2026-03-12-file-organizer-implementation.md`. Ready to execute?**
