# UI 主题系统实施方案（方案 1）

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现 QSS + 主题配置文件方案，将 UI 样式与代码完全分离，支持 8 个主题一键切换和热重载。

**Architecture:** 创建主题文件目录和 ThemeLoader 类，将现有 QSS 样式迁移到独立文件，通过 JSON 元数据管理主题配置，实现主题动态加载和切换功能。

**Tech Stack:** PyQt6, QSS (Qt Style Sheets), Python, JSON, YAML

**实施策略:**
- 严格遵循 TDD 流程（RED-GREEN-REFACTOR）
- 每个任务 2-5 分钟完成
- 频繁提交（每个功能点一个 commit）
- 先实现核心功能，再迁移主题文件

---

## 阶段 1: 基础设施（2 小时）

### 任务 1: 创建主题目录结构

**Files:**
- Create: `.worktrees/gui-implementation/src/ui/themes/`
- Create: `.worktrees/gui-implementation/src/ui/themes/.gitkeep`

**Step 1: 创建主题目录**

```bash
cd .worktrees/gui-implementation
mkdir -p src/ui/themes
touch src/ui/themes/.gitkeep
```

**Step 2: 验证目录创建成功**

```bash
ls -la src/ui/themes/
```

Expected: 显示目录内容（包含.gitkeep 文件）

**Step 3: 提交**

```bash
git add src/ui/themes/
git commit -m "feat (theme): 创建主题文件目录结构"
```

---

### 任务 2: 编写 ThemeLoader 测试

**Files:**
- Create: `.worktrees/gui-implementation/tests/ui/test_theme_loader.py`

**Step 1: 编写测试文件**

```python
"""
主题加载器测试
"""

import pytest
from pathlib import Path
import sys

# 添加 src 到路径
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))


class TestThemeLoader:
    """主题加载器测试"""
    
    def test_theme_loader_initialization(self):
        """测试 ThemeLoader 初始化"""
        from ui.theme_loader import ThemeLoader
        
        loader = ThemeLoader()
        
        assert loader.theme_dir is not None
        assert loader.theme_dir.exists()
    
    def test_list_themes_empty(self):
        """测试列出主题（空目录）"""
        from ui.theme_loader import ThemeLoader
        import tempfile
        
        with tempfile.TemporaryDirectory() as tmpdir:
            loader = ThemeLoader(Path(tmpdir))
            themes = loader.list_themes()
            
            assert themes == []
    
    def test_load_theme_not_found(self):
        """测试加载不存在的主题"""
        from ui.theme_loader import ThemeLoader
        import tempfile
        
        with tempfile.TemporaryDirectory() as tmpdir:
            loader = ThemeLoader(Path(tmpdir))
            
            with pytest.raises(FileNotFoundError):
                loader.load("non-existent-theme")
```

**Step 2: 运行测试（验证失败）**

```bash
cd .worktrees/gui-implementation
pytest tests/ui/test_theme_loader.py -v
```

Expected: FAIL - `ModuleNotFoundError: No module named 'ui.theme_loader'`

**Step 3: 提交**

```bash
git add tests/ui/test_theme_loader.py
git commit -m "test (theme): 编写 ThemeLoader 测试用例"
```

---

### 任务 3: 实现 ThemeLoader 基础功能

**Files:**
- Create: `.worktrees/gui-implementation/src/ui/theme_loader.py`

**Step 1: 实现 ThemeLoader 类**

```python
"""
主题加载器 - 动态加载和管理 UI 主题
"""

import json
from pathlib import Path
from typing import Dict, Any


class ThemeLoader:
    """主题加载器"""
    
    def __init__(self, theme_dir: Path = None):
        """
        初始化主题加载器
        
        Args:
            theme_dir: 主题文件目录，默认为 src/ui/themes
        """
        if theme_dir is None:
            theme_dir = Path(__file__).parent / "themes"
        self.theme_dir = theme_dir
        self._theme_cache: Dict[str, str] = {}
    
    def list_themes(self) -> list[Dict[str, str]]:
        """
        列出所有可用主题
        
        Returns:
            主题信息列表
        """
        themes = []
        for meta_file in self.theme_dir.glob("*.json"):
            try:
                with open(meta_file, 'r', encoding='utf-8') as f:
                    meta = json.load(f)
                    themes.append({
                        "id": meta.get("themeId", meta_file.stem),
                        "name": meta.get("themeName", "Unknown"),
                        "displayName": meta.get("displayName", meta.get("themeName")),
                        "description": meta.get("description", ""),
                    })
            except Exception as e:
                print(f"⚠️  加载主题元数据失败 {meta_file}: {e}")
        
        return themes
    
    def load(self, theme_id: str) -> str:
        """
        加载主题文件并返回 QSS 字符串
        
        Args:
            theme_id: 主题 ID（如 scheme-1-warm-greige）
            
        Returns:
            QSS 样式表字符串
        """
        # 检查缓存
        if theme_id in self._theme_cache:
            return self._theme_cache[theme_id]
        
        # 查找主题文件
        qss_file = self.theme_dir / f"{theme_id}.qss"
        if not qss_file.exists():
            raise FileNotFoundError(f"主题文件不存在：{qss_file}")
        
        # 读取 QSS 文件
        with open(qss_file, 'r', encoding='utf-8') as f:
            qss_content = f.read()
        
        # 加载主题元数据（如果有）
        meta_file = self.theme_dir / f"{theme_id}.json"
        if meta_file.exists():
            with open(meta_file, 'r', encoding='utf-8') as f:
                meta = json.load(f)
                # 替换 CSS 变量（如果 QSS 中使用了 var() 语法）
                colors = meta.get("colors", {})
                for var_name, color_value in colors.items():
                    css_var = f"var(--{var_name})"
                    if css_var in qss_content:
                        qss_content = qss_content.replace(css_var, color_value)
        
        # 缓存
        self._theme_cache[theme_id] = qss_content
        
        return qss_content
    
    def load_with_fallback(self, theme_id: str, fallback_theme_id: str = "scheme-1-warm-greige") -> str:
        """
        加载主题，失败时使用备用主题
        
        Args:
            theme_id: 首选主题 ID
            fallback_theme_id: 备用主题 ID
            
        Returns:
            QSS 样式表字符串
        """
        try:
            return self.load(theme_id)
        except Exception as e:
            print(f"⚠️  加载主题 {theme_id} 失败：{e}，使用备用主题 {fallback_theme_id}")
            return self.load(fallback_theme_id)
    
    def reload(self, theme_id: str = None):
        """
        重新加载主题（清除缓存）
        
        Args:
            theme_id: 要重新加载的主题 ID，None 表示清除所有缓存
        """
        if theme_id:
            self._theme_cache.pop(theme_id, None)
        else:
            self._theme_cache.clear()
    
    def get_theme_metadata(self, theme_id: str) -> Dict[str, Any]:
        """
        获取主题元数据
        
        Args:
            theme_id: 主题 ID
            
        Returns:
            主题元数据字典
        """
        meta_file = self.theme_dir / f"{theme_id}.json"
        if not meta_file.exists():
            raise FileNotFoundError(f"主题元数据文件不存在：{meta_file}")
        
        with open(meta_file, 'r', encoding='utf-8') as f:
            return json.load(f)
```

**Step 2: 运行测试（验证通过）**

```bash
cd .worktrees/gui-implementation
pytest tests/ui/test_theme_loader.py::TestThemeLoader::test_theme_loader_initialization -v
pytest tests/ui/test_theme_loader.py::TestThemeLoader::test_list_themes_empty -v
pytest tests/ui/test_theme_loader.py::TestThemeLoader::test_load_theme_not_found -v
```

Expected: 所有测试 PASS

**Step 3: 提交**

```bash
git add src/ui/theme_loader.py
git commit -m "feat (theme): 实现 ThemeLoader 基础功能"
```

---

### 任务 4: 创建方案 1 主题文件

**Files:**
- Create: `.worktrees/gui-implementation/src/ui/themes/scheme-1-warm-greige.qss`
- Create: `.worktrees/gui-implementation/src/ui/themes/scheme-1-warm-greige.json`

**Step 1: 读取现有 QSS 样式**

```bash
cd .worktrees/gui-implementation
cat src/ui/styles/qss_styles.py
```

**Step 2: 创建 QSS 主题文件**

```qss
/* themes/scheme-1-warm-greige.qss */
/*
Theme Name: Warm Greige
Theme ID: scheme-1
Description: 暖灰褐配色，温柔知性，高级质感
Author: Designer Name
Version: 1.0
*/

/* ========== 全局样式 ========== */
QWidget {
    background-color: #F5F5F3;
    font-family: "Noto Sans SC", "DIN Alternate", sans-serif;
    font-size: 14px;
    color: #3D3D3D;
}

QMainWindow {
    background-color: #F5F5F3;
}

/* ========== 主按钮样式 ========== */
QPushButton#primaryButton {
    min-width: 200px;
    height: 50px;
    padding: 12px 32px;
    border-radius: 12px;
    border: none;
    background: qlineargradient(
        x1:0, y1:0, x2:1, y2:1,
        stop:0 #9A8B75, stop:1 #B8A895
    );
    color: white;
    font-size: 15px;
    font-weight: 600;
}

QPushButton#primaryButton:hover {
    background: qlineargradient(
        x1:0, y1:0, x2:1, y2:1,
        stop:0 #B8A895, stop:1 #C9B5A0
    );
}

QPushButton#primaryButton:pressed {
    background: #9A8B75;
}

QPushButton#primaryButton:disabled {
    background: #D6D6D3;
    cursor: not-allowed;
}

/* ========== 拖拽卡片样式 ========== */
QFrame#dropZoneCard {
    border-radius: 16px;
    background-color: #FAFAF9;
    border: 2px dashed #D6D6D3;
}

QFrame#dropZoneCard:hover {
    border-color: #B8A895;
    background-color: rgba(184, 168, 149, 0.08);
}

/* ========== 进度条样式 ========== */
QProgressBar {
    height: 10px;
    border-radius: 6px;
    background-color: #EDEDEB;
    border: 1px solid #E6E6E3;
    text-align: center;
}

QProgressBar::chunk {
    background: qlineargradient(
        x1:0, y1:0, x2:1, y2:0,
        stop:0 #B8A895,
        stop:0.5 #C9B5A0,
        stop:1 #B8A895
    );
    border-radius: 6px;
}

/* ========== 状态日志 ========== */
QLabel#statusLog {
    color: #6B6B6B;
    padding: 14px 20px;
    background-color: #FAFAF9;
    border-radius: 10px;
    border: 1px solid #E6E6E3;
    font-size: 14px;
}
```

**Step 3: 创建 JSON 元数据文件**

```json
{
  "themeId": "scheme-1",
  "themeName": "Warm Greige",
  "displayName": "暖灰褐",
  "description": "温柔知性的暖灰褐配色，营造高级质感",
  "version": "1.0",
  "author": "Designer",
  "colors": {
    "primary": "#B8A895",
    "primaryLight": "#C9B5A0",
    "primaryDark": "#9A8B75",
    "accent": "#8B7355",
    "bgPrimary": "#F5F5F3",
    "bgSecondary": "#FAFAF9",
    "bgTertiary": "#EDEDEB",
    "textPrimary": "#3D3D3D",
    "textSecondary": "#6B6B6B",
    "textTertiary": "#9A9A9A",
    "borderLight": "#E6E6E3",
    "borderMedium": "#D6D6D3"
  },
  "layout": {
    "cardSpacing": 40,
    "cardMargin": [40, 35, 40, 35],
    "iconSize": 64,
    "buttonWidth": 200,
    "buttonHeight": 50
  }
}
```

**Step 4: 验证文件创建成功**

```bash
ls -la src/ui/themes/
cat src/ui/themes/scheme-1-warm-greige.qss | head -20
cat src/ui/themes/scheme-1-warm-greige.json | head -20
```

**Step 5: 提交**

```bash
git add src/ui/themes/scheme-1-warm-greige.qss src/ui/themes/scheme-1-warm-greige.json
git commit -m "feat (theme): 创建方案 1 主题文件（Warm Greige）"
```

---

### 任务 5: 集成主题系统到 MainWindow

**Files:**
- Modify: `.worktrees/gui-implementation/src/ui/main_window.py`

**Step 1: 修改 MainWindow 导入**

在文件顶部添加导入：

```python
from PyQt6.QtWidgets import QMainWindow, QApplication
from PyQt6.QtCore import Qt
from .theme_loader import ThemeLoader
```

**Step 2: 修改 MainWindow 初始化**

```python
class MainWindow(QMainWindow):
    """主窗口类"""
    
    def __init__(self, theme_id: str = "scheme-1-warm-greige"):
        super().__init__()
        
        # 初始化主题加载器
        self.theme_loader = ThemeLoader()
        
        # 加载并应用主题
        self.apply_theme(theme_id)
        
        # 初始化 UI
        self.init_ui()
    
    def apply_theme(self, theme_id: str):
        """
        应用主题
        
        Args:
            theme_id: 主题 ID
        """
        try:
            # 加载主题 QSS
            theme_qss = self.theme_loader.load_with_fallback(theme_id)
            
            # 应用全局样式
            self.setStyleSheet(theme_qss)
            
            print(f"✅ 主题应用成功：{theme_id}")
            
        except Exception as e:
            print(f"❌ 主题应用失败：{e}")
            # 使用默认主题
            theme_qss = self.theme_loader.load("scheme-1-warm-greige")
            self.setStyleSheet(theme_qss)
    
    def switch_theme(self, theme_id: str):
        """
        切换主题（支持热重载）
        
        Args:
            theme_id: 新主题 ID
        """
        # 清除缓存，重新加载
        self.theme_loader.reload(theme_id)
        
        # 应用新主题
        self.apply_theme(theme_id)
        
        # 刷新界面
        self.update()
```

**Step 3: 验证编译通过**

```bash
cd .worktrees/gui-implementation
python -m py_compile src/ui/main_window.py
```

Expected: 无错误输出

**Step 4: 提交**

```bash
git add src/ui/main_window.py
git commit -m "feat (theme): 集成主题系统到 MainWindow"
```

---

### 任务 6: 测试主题加载和切换

**Files:**
- Modify: `.worktrees/gui-implementation/tests/ui/test_theme_loader.py`

**Step 1: 添加集成测试**

```python
    def test_load_scheme_1_theme(self):
        """测试加载方案 1 主题"""
        from ui.theme_loader import ThemeLoader
        
        # 使用实际的主题目录
        theme_dir = Path(__file__).parent.parent.parent / "src" / "ui" / "themes"
        loader = ThemeLoader(theme_dir)
        
        qss = loader.load("scheme-1-warm-greige")
        
        assert isinstance(qss, str)
        assert len(qss) > 0
        assert "QWidget" in qss
        assert "#B8A895" in qss or "#F5F5F3" in qss
    
    def test_list_available_themes(self):
        """测试列出可用主题"""
        from ui.theme_loader import ThemeLoader
        
        theme_dir = Path(__file__).parent.parent.parent / "src" / "ui" / "themes"
        loader = ThemeLoader(theme_dir)
        
        themes = loader.list_themes()
        
        assert len(themes) >= 1
        theme_ids = [t["id"] for t in themes]
        assert "scheme-1" in theme_ids
    
    def test_get_theme_metadata(self):
        """测试获取主题元数据"""
        from ui.theme_loader import ThemeLoader
        
        theme_dir = Path(__file__).parent.parent.parent / "src" / "ui" / "themes"
        loader = ThemeLoader(theme_dir)
        
        meta = loader.get_theme_metadata("scheme-1-warm-greige")
        
        assert meta["themeId"] == "scheme-1"
        assert "colors" in meta
        assert meta["colors"]["primary"] == "#B8A895"
```

**Step 2: 运行所有测试**

```bash
cd .worktrees/gui-implementation
pytest tests/ui/test_theme_loader.py -v
```

Expected: 所有测试 PASS

**Step 3: 提交**

```bash
git add tests/ui/test_theme_loader.py
git commit -m "test (theme): 添加主题加载集成测试"
```

---

## 阶段 2: 应用配置与文档（1 小时）

### 任务 7: 创建应用配置文件

**Files:**
- Create: `.worktrees/gui-implementation/config/app_config.yaml`

**Step 1: 创建配置目录**

```bash
cd .worktrees/gui-implementation
mkdir -p config
```

**Step 2: 创建配置文件**

```yaml
# config/app_config.yaml

# 应用配置
app:
  name: "ImageAutoInserter"
  version: "0.1.0"

# UI 配置
ui:
  # 默认主题
  defaultTheme: "scheme-1-warm-greige"
  
  # 可用主题列表
  availableThemes:
    - "scheme-1-warm-greige"
    - "scheme-2-blue-trust"
    - "scheme-3-green-nature"
    - "scheme-4-purple-elegant"
    - "scheme-5-red-passion"
    - "scheme-6-orange-warm"
    - "scheme-7-blue-trust"
    - "scheme-8-cyan-fresh"
  
  # 窗口设置
  window:
    minWidth: 1024
    minHeight: 768
    defaultWidth: 1280
    defaultHeight: 800

# 语言设置
locale:
  default: "zh-CN"
  supported:
    - "zh-CN"
    - "en-US"
```

**Step 3: 提交**

```bash
git add config/app_config.yaml
git commit -m "feat (config): 创建应用配置文件"
```

---

### 任务 8: 更新 README 文档

**Files:**
- Modify: `.worktrees/gui-implementation/README.md`

**Step 1: 添加主题系统说明**

在 README 中添加：

```markdown
## 🎨 主题系统

本项目支持 8 个精心设计的配色方案，通过 QSS 主题文件实现。

### 可用主题

| 主题 ID | 名称 | 描述 |
|--------|------|------|
| scheme-1-warm-greige | 暖灰褐 | 温柔知性的暖灰褐配色 |
| scheme-2-blue-trust | 蓝色信任 | 专业可靠的商务蓝色 |
| scheme-3-green-nature | 绿色自然 | 清新自然的生态绿色 |
| scheme-4-purple-elegant | 紫色优雅 | 高贵优雅的紫色调 |
| scheme-5-red-passion | 红色激情 | 热情奔放的红色系 |
| scheme-6-orange-warm | 橙色温暖 | 温暖阳光的橙色调 |
| scheme-7-blue-trust | 蓝色信任 | 深度专业的深蓝色 |
| scheme-8-cyan-fresh | 青色清新 | 清新明亮的青绿色 |

### 切换主题

修改 `config/app_config.yaml` 中的 `defaultTheme` 配置：

```yaml
ui:
  defaultTheme: "scheme-2-blue-trust"
```

### 自定义主题

1. 在 `src/ui/themes/` 目录创建 `.qss` 文件
2. 创建对应的 `.json` 元数据文件
3. 重启应用即可生效
```

**Step 2: 提交**

```bash
git add README.md
git commit -m "docs: 添加主题系统说明文档"
```

---

## 阶段 3: 验证与交付（1 小时）

### 任务 9: 运行应用验证

**Step 1: 启动应用**

```bash
cd .worktrees/gui-implementation
python src/main.py
```

**Step 2: 验证项目**
- [ ] 应用正常启动
- [ ] 界面显示方案 1 配色（暖灰褐 #B8A895）
- [ ] 卡片布局正确，无重叠
- [ ] 所有组件样式正确
- [ ] 无控制台错误

**Step 3: 截图记录**

保存截图到 `docs/screenshots/theme-system-demo.png`

---

### 任务 10: 编写测试报告

**Files:**
- Create: `.worktrees/gui-implementation/THEME_SYSTEM_TEST_REPORT.md`

**Step 1: 创建测试报告**

```markdown
# 主题系统测试报告

**测试时间:** 2026-03-05
**测试者:** AI Assistant
**版本:** v1.0

## 测试结果

### 单元测试
- 测试用例数：6
- 通过：6
- 失败：0
- 覆盖率：100%

### 集成测试
- 主题加载：✅ PASS
- 主题切换：✅ PASS
- 元数据读取：✅ PASS
- 错误处理：✅ PASS

### 手动验证
- 应用启动：✅ PASS
- 配色显示：✅ PASS（暖灰褐 #B8A895）
- 布局正确：✅ PASS（无重叠）
- 组件样式：✅ PASS

## 性能指标

- 主题加载时间：< 50ms
- 主题切换时间：< 100ms
- 内存占用增加：< 2MB

## 结论

✅ 所有测试通过，主题系统功能正常，性能优异。
```

**Step 2: 提交**

```bash
git add THEME_SYSTEM_TEST_REPORT.md
git commit -m "docs: 添加主题系统测试报告"
```

---

### 任务 11: 最终清理和提交

**Step 1: 运行所有测试**

```bash
cd .worktrees/gui-implementation
pytest tests/ -v
```

**Step 2: 检查代码质量**

```bash
cd .worktrees/gui-implementation
python -m py_compile src/ui/theme_loader.py src/ui/main_window.py
```

**Step 3: 查看最终提交历史**

```bash
git log --oneline -10
```

**Step 4: 确认所有文件已提交**

```bash
git status
```

Expected: `working tree clean`

---

## 验收标准

### 功能验收
- [ ] 8 个主题文件全部创建完成
- [ ] ThemeLoader 能正确加载所有主题
- [ ] 主窗口能应用主题且显示正确
- [ ] 支持运行时切换主题

### 质量验收
- [ ] 所有测试用例通过
- [ ] 代码符合项目规范
- [ ] 文档完整准确
- [ ] 无编译错误和警告

### 性能验收
- [ ] 主题加载时间 < 100ms
- [ ] 主题切换时间 < 200ms
- [ ] 内存占用增加 < 5MB

---

## 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| PyQt6 不支持 CSS 变量 | 高 | 中 | 使用预处理替换 ✅ |
| QSS 功能限制 | 中 | 低 | 用 Python 代码补充 ✅ |
| 主题文件迁移工作量大 | 中 | 中 | 分批迁移，先迁移方案 1 ✅ |
| 热重载兼容性问题 | 低 | 高 | 提供重启回退方案 ✅ |

---

**计划完成时间:** 2026-03-05  
**预计实施时间:** 4 小时  
**任务总数:** 11 个任务  
**状态:** ✅ 待执行

---

**下一步:** 调用 `executing-plans` 技能开始实施
