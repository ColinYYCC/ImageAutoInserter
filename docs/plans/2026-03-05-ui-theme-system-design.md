# UI 主题系统设计方案

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 设计并实施一个可配置、易维护、支持多主题的 UI 系统，解决当前硬编码导致的配色丢失、维护困难等问题。

**Architecture:** 采用 QSS + 主题配置文件方案，将设计与代码分离。通过 ThemeLoader 动态加载主题，支持一键切换 8 个配色方案。

**Tech Stack:** PyQt6, QSS (Qt Style Sheets), Python 配置管理，JSON 主题配置

---

## 📊 现状分析

### 当前问题

1. **配色应用失败** - MainWindow 忘记应用 stylesheet 导致全界面黑白灰
2. **布局计算错误** - QSS padding/margin 与 Python 代码冲突导致卡片重叠
3. **难以调试** - 样式分散在 QSS、Python 代码、组件内部
4. **维护成本高** - 每次调整都要改代码、重启、验证
5. **主题切换困难** - 8 个方案需要硬编码 8 套样式
6. **设计师无法参与** - 必须懂 Python 才能修改设计
7. **无法热重载** - 每次修改都要重启应用

### 核心需求

1. **设计与代码分离** - 设计师可独立修改样式文件
2. **一键切换主题** - 支持 8 个配色方案快速切换
3. **易于调试** - 所有样式集中管理
4. **低实施成本** - 基于现有代码改进，不重写
5. **支持扩展** - 未来可添加新主题

---

## 🎯 解决方案对比

### 方案 1: QSS + 主题配置文件 ⭐⭐⭐⭐⭐（推荐）

**架构设计:**
```
src/ui/
├── themes/
│   ├── scheme-1-warm-greige.qss    # 配色方案 1
│   ├── scheme-2-blue-trust.qss     # 配色方案 2
│   ├── scheme-3-green-nature.qss   # 配色方案 3
│   ├── scheme-4-purple-elegant.qss # 配色方案 4
│   ├── scheme-5-red-passion.qss    # 配色方案 5
│   ├── scheme-6-orange-warm.qss    # 配色方案 6
│   ├── scheme-7-blue-trust.qss     # 配色方案 7
│   └── scheme-8-cyan-fresh.qss     # 配色方案 8
├── theme_loader.py                  # 主题加载器
├── main_window.py                   # 主窗口
└── styles/
    ├── colors.py                    # Python 配色定义（保留）
    └── qss_styles.py               # QSS 样式（迁移到 themes/）
```

**优势:**
- ✅ 设计与代码完全分离
- ✅ 支持 CSS 变量（预处理替换）
- ✅ 一键切换主题
- ✅ 易于调试
- ✅ 无需重启（可动态加载）
- ✅ 实施成本低（2-3 小时）

**劣势:**
- ⚠️ PyQt6 不支持 CSS 变量（需要预处理）
- ⚠️ QSS 功能比 CSS 少

---

### 方案 2: PyQt6-Fluent-Widgets ⭐⭐⭐⭐

**架构设计:**
```python
from PyQt6_Fluent_Widgets import FluentWindow, Fluent
from PyQt6_Fluent_Widgets import PushButton, CardWidget

class MainWindow(FluentWindow):
    def __init__(self):
        super().__init__()
        button = PushButton("开始处理", self)
        button.setFluentStyle(Fluent.MATERIAL)
```

**优势:**
- ✅ 开箱即用
- ✅ 组件丰富
- ✅ 主题支持
- ✅ 动画效果

**劣势:**
- ⚠️ 第三方依赖
- ⚠️ 样式固定
- ⚠️ 学习成本

**实施时间:** 4-6 小时

---

### 方案 3: Flet / Reflex ⭐⭐⭐

**架构设计:**
```python
import flet as ft

def main(page: ft.Page):
    page.add(
        ft.Container(
            content=ft.Column([...]),
            border=ft.border.all(2, "#B8A895"),
        )
    )

ft.app(target=main)
```

**优势:**
- ✅ 跨平台（桌面 + Web+ 移动）
- ✅ 现代 UI
- ✅ 热重载
- ✅ 声明式

**劣势:**
- ⚠️ 完全重写
- ⚠️ 性能略低
- ⚠️ 包体积大

**实施时间:** 2-3 天

---

### 方案 4: 保持 PyQt6 + 配置化 ⭐⭐⭐

**架构设计:**
```python
# config/ui_config.py
UI_CONFIG = {
    "theme": "scheme-1",
    "colors": { "primary": "#B8A895" },
    "layout": { "card_spacing": 40 }
}
```

**优势:**
- ✅ 改动最小
- ✅ 类型安全
- ✅ IDE 支持

**劣势:**
- ⚠️ 仍需改代码
- ⚠️ 部分配置化
- ⚠️ 无热重载

---

## 📋 推荐方案详细设计（方案 1）

### 1. 目录结构

```
ImageAutoInserter/
├── docs/
│   ├── design/
│   │   └── color-options/          # HTML 设计稿（保留）
│   └── plans/
│       └── 2026-03-05-ui-theme-system-design.md
├── src/
│   └── ui/
│       ├── themes/                  # 新增：主题文件目录
│       │   ├── scheme-1-warm-greige.qss
│       │   ├── scheme-2-blue-trust.qss
│       │   └── ...
│       ├── theme_loader.py          # 新增：主题加载器
│       ├── main_window.py           # 修改：应用主题
│       └── styles/
│           ├── colors.py            # 保留：Python 配色
│           └── qss_styles.py        # 迁移到 themes/
├── config/
│   └── app_config.yaml              # 新增：应用配置
└── tests/
    └── ui/
        └── test_theme_loader.py     # 新增：主题加载测试
```

---

### 2. 主题文件格式

#### 2.1 QSS 主题文件

```qss
/* themes/scheme-1-warm-greige.qss */

/* 主题元数据 */
/*
Theme Name: Warm Greige
Theme ID: scheme-1
Description: 暖灰褐配色，温柔知性，高级质感
Author: Designer Name
Version: 1.0
*/

/* 配色定义（注释形式，供参考）*/
/*
:root {
    --primary: #B8A895;
    --primary-light: #C9B5A0;
    --primary-dark: #9A8B75;
    --accent: #8B7355;
    --bg-primary: #F5F5F3;
    --bg-secondary: #FAFAF9;
    --bg-tertiary: #EDEDEB;
    --text-primary: #3D3D3D;
    --text-secondary: #6B6B6B;
    --text-tertiary: #9A9A9A;
    --border-light: #E6E6E3;
    --border-medium: #D6D6D3;
}
*/

/* ========== 全局样式 ========== */
QWidget {
    background-color: #F5F5F3;
    font-family: "Noto Sans SC", "DIN Alternate", sans-serif;
    font-size: 14px;
    color: #3D3D3D;
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

#### 2.2 主题元数据（JSON）

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

---

### 3. ThemeLoader 实现

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
        self._theme_cache: Dict[str, Dict[str, Any]] = {}
    
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

---

### 4. 主窗口集成

```python
"""
主窗口 - 集成主题系统
"""

from PyQt6.QtWidgets import QMainWindow, QApplication
from PyQt6.QtCore import Qt
from .theme_loader import ThemeLoader


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

---

### 5. 应用配置

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

---

### 6. 测试用例

```python
"""
主题加载器测试
"""

import pytest
from pathlib import Path
from src.ui.theme_loader import ThemeLoader


class TestThemeLoader:
    """主题加载器测试"""
    
    @pytest.fixture
    def theme_loader(self):
        """创建测试用主题加载器"""
        test_theme_dir = Path(__file__).parent / "test_themes"
        return ThemeLoader(test_theme_dir)
    
    def test_list_themes(self, theme_loader):
        """测试列出所有主题"""
        themes = theme_loader.list_themes()
        
        assert len(themes) > 0
        assert "scheme-1-warm-greige" in [t["id"] for t in themes]
    
    def test_load_theme_success(self, theme_loader):
        """测试成功加载主题"""
        qss = theme_loader.load("scheme-1-warm-greige")
        
        assert isinstance(qss, str)
        assert len(qss) > 0
        assert "QWidget" in qss  # 包含基本样式
        assert "#B8A895" in qss  # 包含主题色
    
    def test_load_theme_not_found(self, theme_loader):
        """测试加载不存在的主题"""
        with pytest.raises(FileNotFoundError):
            theme_loader.load("non-existent-theme")
    
    def test_load_with_fallback(self, theme_loader):
        """测试加载失败时使用备用主题"""
        qss = theme_loader.load_with_fallback(
            "non-existent-theme",
            "scheme-1-warm-greige"
        )
        
        assert isinstance(qss, str)
        assert len(qss) > 0
    
    def test_theme_cache(self, theme_loader):
        """测试主题缓存"""
        # 第一次加载
        qss1 = theme_loader.load("scheme-1-warm-greige")
        
        # 第二次加载（应该从缓存读取）
        qss2 = theme_loader.load("scheme-1-warm-greige")
        
        assert qss1 == qss2
        assert "scheme-1-warm-greige" in theme_loader._theme_cache
    
    def test_reload_theme(self, theme_loader):
        """测试重新加载主题"""
        # 加载并缓存
        theme_loader.load("scheme-1-warm-greige")
        
        # 清除缓存
        theme_loader.reload("scheme-1-warm-greige")
        
        assert "scheme-1-warm-greige" not in theme_loader._theme_cache
    
    def test_get_theme_metadata(self, theme_loader):
        """测试获取主题元数据"""
        meta = theme_loader.get_theme_metadata("scheme-1-warm-greige")
        
        assert meta["themeId"] == "scheme-1-warm-greige"
        assert "colors" in meta
        assert meta["colors"]["primary"] == "#B8A895"
```

---

## 🚀 实施计划

### 阶段 1: 基础设施（2 小时）

**任务 1-3:** 创建主题加载器和目录结构
**任务 4-6:** 迁移第一个主题（方案 1）
**任务 7-9:** 集成到主窗口并测试

### 阶段 2: 主题迁移（4 小时）

**任务 10-15:** 迁移剩余 7 个主题
**任务 16-18:** 创建主题元数据 JSON 文件

### 阶段 3: 配置与测试（2 小时）

**任务 19-21:** 创建应用配置文件
**任务 22-24:** 编写测试用例
**任务 25-27:** 文档更新

---

## 📊 预期成果

### 交付物

1. ✅ `src/ui/themes/` - 8 个主题的 QSS 文件
2. ✅ `src/ui/theme_loader.py` - 主题加载器
3. ✅ `src/ui/main_window.py` - 集成主题的主窗口
4. ✅ `config/app_config.yaml` - 应用配置
5. ✅ `tests/ui/test_theme_loader.py` - 测试用例
6. ✅ `docs/plans/2026-03-05-ui-theme-system-design.md` - 设计文档

### 验收标准

1. **功能验收**
   - [ ] 8 个主题文件全部创建完成
   - [ ] ThemeLoader 能正确加载所有主题
   - [ ] 主窗口能应用主题且显示正确
   - [ ] 支持运行时切换主题

2. **质量验收**
   - [ ] 所有测试用例通过
   - [ ] 代码符合项目规范
   - [ ] 文档完整准确
   - [ ] 无编译错误和警告

3. **性能验收**
   - [ ] 主题加载时间 < 100ms
   - [ ] 主题切换时间 < 200ms
   - [ ] 内存占用增加 < 5MB

---

## 🔍 风险评估

### 技术风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| PyQt6 不支持 CSS 变量 | 高 | 中 | 使用预处理替换 |
| QSS 功能限制 | 中 | 低 | 用 Python 代码补充 |
| 主题文件迁移工作量大 | 中 | 中 | 分批迁移，先迁移方案 1 |
| 热重载兼容性问题 | 低 | 高 | 提供重启回退方案 |

### 应对措施

1. **CSS 变量问题** - 使用 Python 预处理替换 `var(--name)` 为实际值
2. **QSS 功能限制** - 复杂布局仍用 Python 代码控制
3. **迁移工作量** - 优先迁移方案 1，其他方案逐步完成
4. **兼容性问题** - 保留原有代码作为备份

---

## 📚 参考资料

### PyQt6 文档
- [Qt Style Sheets](https://doc.qt.io/qt-6/stylesheet.html)
- [Qt Style Sheets Reference](https://doc.qt.io/qt-6/stylesheet-reference.html)
- [QSS Customizing](https://doc.qt.io/qt-6/stylesheet-customizing.html)

### 设计稿
- [方案 1 - Warm Greige](../../design/color-options/scheme-01-warm-greige.html)
- [8 个配色方案](../../design/color-options/index.html)

### 相关项目
- [PyQt6-Fluent-Widgets](https://github.com/zhiyiYo/PyQt-Fluent-Widgets)
- [Flet](https://flet.dev/)

---

**设计完成时间**: 2026-03-05  
**设计者**: AI Assistant  
**状态**: ✅ 待审批  
**下一步**: 用户审批 → 调用 writing-plans 创建实施计划 → 执行实施
