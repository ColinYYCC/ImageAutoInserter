# 界面开发实施规划

**项目名称：** ImageAutoInserter - Warm Greige 主题界面  
**设计稿：** [scheme-01-warm-greige.html](./color-options/scheme-01-warm-greige.html)  
**创建日期：** 2026-03-06  
**版本：** v1.0

---

## 📋 目录

1. [项目概述](#项目概述)
2. [技术路线选择](#技术路线选择)
3. [设计规范](#设计规范)
4. [实施步骤](#实施步骤)
5. [质量控制](#质量控制)
6. [测试策略](#测试策略)
7. [交付物](#交付物)

---

## 项目概述

### 目标

基于**方案一（Warm Greige）**设计规范，实现 ImageAutoInserter 桌面应用的图形用户界面，确保：
- ✅ 所有 UI 组件布局精准
- ✅ 严格避免组件重叠、位置错位、元素溢出
- ✅ 遵循设计稿规定的尺寸、间距、层级
- ✅ 保证跨设备分辨率一致性和完整性

### 范围

**包含内容：**
- PyQt6 桌面应用界面实现
- 主窗口、对话框、组件库
- 响应式布局系统
- 交互状态和动画

**排除内容：**
- 后端业务逻辑（已存在）
- 打包和发布流程（单独文档）
- 在线更新界面（v2.0 规划）

---

## 技术路线选择

### 推荐方案：PyQt6 + QSS

#### 技术栈详情

| 组件 | 技术选型 | 版本 | 说明 |
|------|---------|------|------|
| GUI 框架 | PyQt6 | 6.6.0+ | 跨平台桌面应用 |
| 样式系统 | QSS | - | Qt Style Sheets |
| 布局管理 | QBoxLayout + QGridLayout | - | 响应式布局 |
| 样式变量 | Python 常量类 | - | 设计令牌 |
| 图标 | SVG + QtSvg | - | 矢量图标 |

#### 架构设计

```
┌─────────────────────────────────────────┐
│           应用层 (Application)           │
│  ┌─────────────────────────────────┐   │
│  │      主窗口 (MainWindow)         │   │
│  │  ┌──────────┬──────────┐        │   │
│  │  │  内容区  │  侧边栏  │        │   │
│  │  └──────────┴──────────┘        │   │
│  └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│          组件层 (Components)            │
│  ┌──────┬──────┬──────┬──────┐        │
│  │ 按钮 │ 卡片 │ 输入 │ 进度 │ ...    │
│  └──────┴──────┴──────┴──────┘        │
├─────────────────────────────────────────┤
│           样式层 (Styles)              │
│  ┌─────────────────────────────────┐   │
│  │  QSS 样式表 + 设计令牌常量       │   │
│  └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│          工具层 (Utilities)            │
│  ┌──────┬──────┬──────┬──────┐        │
│  │ 测试 │ 验证 │ 调试 │ 工具 │        │
│  └──────┴──────┴──────┴──────┘        │
└─────────────────────────────────────────┘
```

#### 为什么选择 PyQt6？

**优势：**
1. ✅ **与现有代码无缝集成** - 项目已使用 Python，无需重写后端
2. ✅ **原生体验** - 调用系统 API，性能优秀
3. ✅ **跨平台** - Windows/macOS/Linux 一套代码
4. ✅ **打包体积小** - 约 30-40MB（Electron 约 100MB+）
5. ✅ **学习曲线低** - 文档完善，社区活跃

**对比其他方案：**

| 方案 | 优势 | 劣势 | 适用场景 |
|------|------|------|---------|
| **PyQt6** | 集成简单、体积小 | UI 效果略逊于 Web | **推荐：工具类应用** |
| Electron | UI 效果最佳 | 体积大、性能开销 | 复杂 UI、跨平台 Web 应用 |
| Tkinter | 内置无需安装 | 样式定制困难 | 简单工具、快速原型 |
| Kivy | 触摸友好 | 生态较小 | 移动优先应用 |

---

## 设计规范

### 颜色系统

#### 主色调

```python
class Colors:
    """Warm Greige 主题颜色常量"""
    # 主色系
    PRIMARY = "#B8A895"        # 主色 - 暖灰褐
    PRIMARY_LIGHT = "#C9B5A0"  # 浅褐 - 悬停/强调
    PRIMARY_DARK = "#9A8B75"   # 深褐 - 按下/深度
    
    # 强调色
    ACCENT = "#8B7355"         # 强调色 - 深棕
    
    # 背景色
    BG = "#F5F5F3"             # 主背景
    BG_CARD = "#FAFAF9"        # 卡片背景
    
    # 文字色
    TEXT = "#3D3D3D"           # 主文字
    TEXT_LIGHT = "#8B8B8B"     # 次要文字
    
    # 边框
    BORDER = "#E6E6E3"         # 边框色
    
    # 功能色
    SUCCESS = "#A8C9A0"        # 成功
    WARNING = "#8B7355"        # 警告
    ERROR = "#FF5F56"          # 错误
    INFO = "#E6E6E3"           # 信息
```

#### 颜色使用规则

| 场景 | 使用颜色 | 示例 |
|------|---------|------|
| 主按钮背景 | `PRIMARY` | 开始处理按钮 |
| 主按钮悬停 | `PRIMARY_DARK` | 按钮 hover |
| 主按钮按下 | `ACCENT` | 按钮 active |
| 次要按钮 | 透明 + `PRIMARY` 边框 | 取消按钮 |
| 卡片背景 | `BG` 或 `BG_CARD` | 内容卡片 |
| 主文字 | `TEXT` | 标题、正文 |
| 次要文字 | `TEXT_LIGHT` | 描述、提示 |
| 边框 | `BORDER` | 输入框、卡片边框 |

---

### 字体系统

#### 字体栈

```python
FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif'
```

#### 字体大小

| 令牌 | 大小 | 用途 | CSS 类 |
|------|------|------|-------|
| `font-xs` | 12px | 辅助文字、徽章 | `.badge` |
| `font-sm` | 13px | 次要文字、标签 | `.input-label` |
| `font-base` | 14px | 正文、按钮 | `.btn`, `.card-desc` |
| `font-lg` | 15px | 副标题、下拉区 | `.drop-title` |
| `font-xl` | 18px | 卡片标题 | `.card-title` |
| `font-2xl` | 20px | 应用名称 | `.app-name` |
| `font-3xl` | 24px | 章节标题 | `h2` |
| `font-4xl` | 36px | - | - |
| `font-5xl` | 42px | 页面标题 | `h1` |

#### 字体粗细

| 值 | 粗细 | 用途 |
|----|------|------|
| 300 | Light | 页面标题、副标题 |
| 400 | Regular | 正文、描述 |
| 500 | Medium | 按钮、卡片标题、徽章 |
| 600 | SemiBold | 统计数值、应用名称 |
| 700 | Bold | 强调文字 |

---

### 间距系统

#### 基础单位：4px

```python
SPACING = {
    'space-1': '4px',    # 最小间距
    'space-2': '8px',
    'space-3': '12px',   # 输入框 padding
    'space-4': '16px',
    'space-6': '24px',
    'space-8': '32px',   # 卡片 padding
    'space-10': '40px',  # 章节间距
    'space-12': '48px',
    'space-15': '60px',  # 页面头部 padding
}
```

#### 常用间距场景

| 场景 | 值 | 说明 |
|------|-----|------|
| 按钮组间距 | 12px | `.button-group` |
| 卡片间距 | 30px | `.component-grid` gap |
| 卡片内边距 | 32px | `.card` padding |
| 输入框内边距 | 12px 16px | `.input` padding |
| 页面头部边距 | 60px 20px | `body` padding |
| 章节间距 | 40px | 章节间 `margin-bottom` |

---

### 圆角系统

| 令牌 | 值 | 用途 |
|------|-----|------|
| `radius-sm` | 4px | 按钮、输入框 |
| `radius-md` | 6px | 卡片、特性项 |
| `radius-lg` | 8px | 颜色卡片、章节 |
| `radius-xl` | 10px | 图标容器、应用 logo |
| `radius-full` | 9999px | 徽章、页面标签 |

---

### 阴影系统

#### 阴影层级

```python
SHADOWS = {
    'shadow-sm': '0 2px 8px rgba(0,0,0,0.08)',      # 颜色卡片
    'shadow-md': '0 2px 12px rgba(0,0,0,0.06)',     # 章节卡片
    'shadow-lg': '0 12px 24px rgba(0,0,0,0.1)',     # 卡片 hover
    'shadow-xl': '0 8px 24px rgba(0,0,0,0.12)',     # 应用窗口
}
```

#### 使用规则

| 层级 | 阴影 | 用途 |
|------|------|------|
| 1 | `shadow-sm` | 静态小元素（颜色卡片） |
| 2 | `shadow-md` | 章节容器、面板 |
| 3 | `shadow-lg` | 悬浮元素（卡片 hover） |
| 4 | `shadow-xl` | 模态框、应用窗口 |

---

### Z-Index 层级

```python
Z_INDEX = {
    'base': 0,       # 默认层
    'bg': -1,        # 装饰背景（负值）
    'dropdown': 40,  # 下拉菜单
    'fixed': 50,     # 固定导航、模态框
}
```

**使用规则：**
- 使用 Tailwind 标准值：`z-0`, `z-10`, `z-20`, `z-30`, `z-40`, `z-50`
- **禁止**使用任意值：`z-[9999]`
- 背景元素使用负值：`z-[-1]`

---

## 实施步骤

### 阶段 1：基础架构搭建（预计 2 小时）

#### 任务 1.1：项目结构创建

```
src/
├── __init__.py
├── main.py                 # 应用入口
├── ui/
│   ├── __init__.py
│   ├── main_window.py      # 主窗口
│   ├── components/         # UI 组件
│   │   ├── __init__.py
│   │   ├── buttons.py      # 按钮组件
│   │   ├── cards.py        # 卡片组件
│   │   ├── inputs.py       # 输入组件
│   │   └── progress.py     # 进度条
│   ├── layouts/            # 布局系统
│   │   ├── __init__.py
│   │   └── responsive.py   # 响应式布局
│   └── styles/             # 样式系统
│       ├── __init__.py
│       ├── colors.py       # 颜色常量
│       ├── tokens.py       # 设计令牌
│       └── qss.py          # QSS 样式表
├── core/                   # 核心业务逻辑（已存在）
└── tests/                  # 测试
    ├── __init__.py
    ├── test_components.py  # 组件测试
    └── test_layouts.py     # 布局测试
```

#### 任务 1.2：依赖安装

```bash
# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # macOS/Linux
# 或
venv\Scripts\activate     # Windows

# 安装依赖
pip install PyQt6==6.6.0
pip install PyQt6-Qt6==6.6.0
pip install Pillow==10.2.0

# 开发依赖
pip install pytest==8.0.0
pip install pytest-qt==4.2.0
```

#### 任务 1.3：颜色常量和 QSS 配置

创建 `src/ui/styles/colors.py`：
```python
class Colors:
    """Warm Greige 主题颜色"""
    PRIMARY = "#B8A895"
    PRIMARY_LIGHT = "#C9B5A0"
    PRIMARY_DARK = "#9A8B75"
    ACCENT = "#8B7355"
    BG = "#F5F5F3"
    BG_CARD = "#FAFAF9"
    TEXT = "#3D3D3D"
    TEXT_LIGHT = "#8B8B8B"
    BORDER = "#E6E6E3"
```

创建 `src/ui/styles/qss.py`：
```python
QSS_STYLES = """
/* 全局样式 */
QWidget {
    background-color: %(bg)s;
    color: %(text)s;
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei";
    font-size: 14px;
}

/* 主窗口 */
QMainWindow {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1, 
                                 stop:0 %(bg)s, stop:1 #E8E8E6);
}

/* 按钮 */
QPushButton {
    background-color: %(primary)s;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 14px 28px;
    font-weight: 500;
    letter-spacing: 1px;
}

QPushButton:hover {
    background-color: %(primary_dark)s;
}

QPushButton:pressed {
    background-color: %(accent)s;
}

QPushButton:disabled {
    background-color: %(border)s;
    color: %(text_light)s;
    cursor: not-allowed;
}
""" % {
    'bg': Colors.BG,
    'text': Colors.TEXT,
    'primary': Colors.PRIMARY,
    'primary_dark': Colors.PRIMARY_DARK,
    'accent': Colors.ACCENT,
    'text_light': Colors.TEXT_LIGHT,
}
```

---

### 阶段 2：核心组件开发（预计 6 小时）

#### 任务 2.1：按钮组件

创建 `src/ui/components/buttons.py`：

```python
from PyQt6.QtWidgets import QPushButton
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QFont, QCursor
from ..styles.colors import Colors

class PrimaryButton(QPushButton):
    """Primary 按钮 - 实心填充"""
    
    def __init__(self, text: str, parent=None):
        super().__init__(text, parent)
        self._setup_style()
    
    def _setup_style(self):
        """设置样式"""
        self.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        self.setFont(QFont("Arial", 14, QFont.Weight.Medium))
        self.setStyleSheet(f"""
            QPushButton {{
                background-color: {Colors.PRIMARY};
                color: white;
                border: none;
                border-radius: 4px;
                padding: 14px 28px;
                font-weight: 500;
                letter-spacing: 1px;
            }}
            QPushButton:hover {{
                background-color: {Colors.PRIMARY_DARK};
            }}
            QPushButton:pressed {{
                background-color: {Colors.ACCENT};
            }}
            QPushButton:disabled {{
                background-color: {Colors.BORDER};
                color: {Colors.TEXT_LIGHT};
                cursor: not-allowed;
            }}
        """)

class SecondaryButton(QPushButton):
    """Secondary 按钮 - 空心边框"""
    
    def __init__(self, text: str, parent=None):
        super().__init__(text, parent)
        self._setup_style()
    
    def _setup_style(self):
        """设置样式"""
        self.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
        self.setFont(QFont("Arial", 14, QFont.Weight.Medium))
        self.setStyleSheet(f"""
            QPushButton {{
                background-color: transparent;
                color: {Colors.PRIMARY};
                border: 2px solid {Colors.PRIMARY};
                border-radius: 4px;
                padding: 14px 28px;
                font-weight: 500;
                letter-spacing: 1px;
            }}
            QPushButton:hover {{
                background-color: {Colors.PRIMARY};
                color: white;
            }}
            QPushButton:pressed {{
                background-color: {Colors.PRIMARY_DARK};
                border-color: {Colors.PRIMARY_DARK};
            }}
            QPushButton:disabled {{
                border-color: {Colors.BORDER};
                color: {Colors.TEXT_LIGHT};
                cursor: not-allowed;
            }}
        """)
```

#### 任务 2.2：卡片组件

创建 `src/ui/components/cards.py`：

```python
from PyQt6.QtWidgets import QFrame, QVBoxLayout, QLabel
from PyQt6.QtGui import QFont
from ..styles.colors import Colors

class Card(QFrame):
    """内容卡片"""
    
    def __init__(self, title: str, description: str, parent=None):
        super().__init__(parent)
        self.setFrameShape(QFrame.Shape.StyledPanel)
        self._setup_ui(title, description)
        self._setup_style()
    
    def _setup_ui(self, title: str, description: str):
        """设置 UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(32, 32, 32, 32)
        layout.setSpacing(12)
        
        # 标题
        self.title_label = QLabel(title)
        self.title_label.setFont(QFont("Arial", 18, QFont.Weight.Medium))
        self.title_label.setStyleSheet(f"color: {Colors.TEXT};")
        
        # 描述
        self.desc_label = QLabel(description)
        self.desc_label.setFont(QFont("Arial", 14))
        self.desc_label.setStyleSheet(f"color: {Colors.TEXT_LIGHT};")
        self.desc_label.setWordWrap(True)
        
        layout.addWidget(self.title_label)
        layout.addWidget(self.desc_label)
    
    def _setup_style(self):
        """设置样式"""
        self.setStyleSheet(f"""
            QFrame {{
                background-color: {Colors.BG};
                border-radius: 6px;
                padding: 0px;
                border: 1px solid {Colors.BORDER};
            }}
            QFrame:hover {{
                background-color: {Colors.BG_CARD};
                border-color: {Colors.PRIMARY};
            }}
        """)
```

#### 任务 2.3：输入框组件

创建 `src/ui/components/inputs.py`：

```python
from PyQt6.QtWidgets import QLineEdit, QLabel, QVBoxLayout, QWidget
from PyQt6.QtGui import QFont
from ..styles.colors import Colors

class InputWithLabel(QWidget):
    """带标签的输入框"""
    
    def __init__(self, label_text: str, placeholder: str = "", parent=None):
        super().__init__(parent)
        self._setup_ui(label_text, placeholder)
        self._setup_style()
    
    def _setup_ui(self, label_text: str, placeholder: str):
        """设置 UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(8)
        
        # 标签
        self.label = QLabel(label_text)
        self.label.setFont(QFont("Arial", 13, QFont.Weight.Medium))
        
        # 输入框
        self.input = QLineEdit()
        self.input.setPlaceholderText(placeholder)
        self.input.setFont(QFont("Arial", 14))
        
        layout.addWidget(self.label)
        layout.addWidget(self.input)
    
    def _setup_style(self):
        """设置样式"""
        self.label.setStyleSheet(f"color: {Colors.TEXT};")
        self.input.setStyleSheet(f"""
            QLineEdit {{
                padding: 12px 16px;
                border-radius: 4px;
                border: 1px solid {Colors.BORDER};
                background-color: {Colors.BG_CARD};
                color: {Colors.TEXT};
                font-size: 14px;
            }}
            QLineEdit:focus {{
                border: 2px solid {Colors.PRIMARY};
                border-radius: 4px;
            }}
            QLineEdit:disabled {{
                background-color: {Colors.BORDER};
                color: {Colors.TEXT_LIGHT};
            }}
        """)
```

#### 任务 2.4：进度条组件

创建 `src/ui/components/progress.py`：

```python
from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel, QProgressBar
from PyQt6.QtGui import QFont
from ..styles.colors import Colors

class ProgressWithLabel(QWidget):
    """带标签的进度条"""
    
    def __init__(self, label: str = "进度", parent=None):
        super().__init__(parent)
        self._setup_ui(label)
        self._setup_style()
    
    def _setup_ui(self, label: str):
        """设置 UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(8)
        
        # 标签
        self.label_layout = QVBoxLayout()
        self.label_layout.setSpacing(4)
        
        self.progress_label = QLabel(label)
        self.progress_label.setFont(QFont("Arial", 13))
        
        self.percent_label = QLabel("0%")
        self.percent_label.setFont(QFont("Arial", 13, QFont.Weight.Medium))
        self.percent_label.setStyleSheet(f"color: {Colors.PRIMARY};")
        
        self.label_layout.addWidget(self.progress_label)
        self.label_layout.addWidget(self.percent_label)
        
        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setRange(0, 100)
        self.progress_bar.setValue(0)
        self.progress_bar.setTextVisible(False)
        
        layout.addLayout(self.label_layout)
        layout.addWidget(self.progress_bar)
    
    def _setup_style(self):
        """设置样式"""
        self.progress_label.setStyleSheet(f"color: {Colors.TEXT};")
        self.progress_bar.setStyleSheet(f"""
            QProgressBar {{
                background-color: {Colors.BORDER};
                border-radius: 4px;
                height: 8px;
                border: none;
            }}
            QProgressBar::chunk {{
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                                            stop:0 {Colors.PRIMARY}, 
                                            stop:1 {Colors.PRIMARY_LIGHT});
                border-radius: 4px;
            }}
        """)
    
    def set_value(self, value: int):
        """设置进度值"""
        self.progress_bar.setValue(value)
        self.percent_label.setText(f"{value}%")
```

---

### 阶段 3：主窗口实现（预计 4 小时）

#### 任务 3.1：主窗口框架

创建 `src/ui/main_window.py`：

```python
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QLabel, 
    QGridLayout, QFrame
)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QFont
from .styles.colors import Colors
from .components.buttons import PrimaryButton, SecondaryButton
from .components.cards import Card
from .components.inputs import InputWithLabel
from .components.progress import ProgressWithLabel

class MainWindow(QMainWindow):
    """主窗口"""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("图片自动插入工具")
        self.setMinimumSize(1400, 900)
        self._setup_ui()
        self._setup_style()
    
    def _setup_ui(self):
        """设置 UI"""
        # 中心组件
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 主布局
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(60, 60, 60, 60)
        main_layout.setSpacing(40)
        
        # 页面头部
        header_layout = QVBoxLayout()
        header_layout.setSpacing(12)
        
        self.title_label = QLabel("方案 1 - Warm Greige")
        self.title_label.setFont(QFont("Arial", 42, QFont.Weight.Light))
        self.title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        self.subtitle_label = QLabel("暖灰褐 · 温柔知性 · 高级质感")
        self.subtitle_label.setFont(QFont("Arial", 16, QFont.Weight.Light))
        self.subtitle_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        header_layout.addWidget(self.title_label)
        header_layout.addWidget(self.subtitle_label)
        
        main_layout.addLayout(header_layout)
        
        # 组件网格
        grid_widget = QWidget()
        grid_layout = QGridLayout(grid_widget)
        grid_layout.setSpacing(30)
        
        # 卡片 1：Excel 拖拽
        card1 = Card(
            "Excel 文件拖拽",
            "将 Excel 文件拖拽到此处，系统自动识别商品编码并智能匹配对应图片"
        )
        grid_layout.addWidget(card1, 0, 0)
        
        # 卡片 2：图片源选择
        card2 = Card(
            "图片源选择",
            "支持文件夹、ZIP、RAR 格式，完全内存处理，不解压到磁盘"
        )
        grid_layout.addWidget(card2, 0, 1)
        
        # 卡片 3：进度显示
        card3 = Card(
            "处理进度",
            "实时显示处理进度和成功/失败统计"
        )
        grid_layout.addWidget(card3, 1, 0)
        
        # 卡片 4：统计信息
        card4 = Card(
            "统计信息",
            "显示总图片数、商品数量等关键指标"
        )
        grid_layout.addWidget(card4, 1, 1)
        
        main_layout.addWidget(grid_widget)
        
        # 按钮组
        button_layout = QVBoxLayout()
        button_layout.setSpacing(12)
        
        self.start_button = PrimaryButton("开始处理")
        self.cancel_button = SecondaryButton("取消")
        
        button_layout.addWidget(self.start_button)
        button_layout.addWidget(self.cancel_button)
        
        main_layout.addLayout(button_layout)
        
        # 添加弹性空间
        main_layout.addStretch()
    
    def _setup_style(self):
        """设置样式"""
        self.setStyleSheet(f"""
            QMainWindow {{
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1, 
                                            stop:0 {Colors.BG}, 
                                            stop:1 #E8E8E6);
            }}
        """)
        
        self.title_label.setStyleSheet(f"color: {Colors.TEXT}; letter-spacing: 3px;")
        self.subtitle_label.setStyleSheet(f"color: {Colors.TEXT_LIGHT}; letter-spacing: 1px;")
```

---

### 阶段 4：响应式布局（预计 2 小时）

#### 任务 4.1：响应式布局系统

创建 `src/ui/layouts/responsive.py`：

```python
from PyQt6.QtWidgets import QWidget, QGridLayout
from PyQt6.QtCore import Qt

class ResponsiveGrid(QWidget):
    """响应式网格布局"""
    
    def __init__(self, columns=2, parent=None):
        super().__init__(parent)
        self.columns = columns
        self.layout = QGridLayout(self)
        self.layout.setSpacing(30)
        self.widgets = []
    
    def add_widget(self, widget):
        """添加组件（自动计算行列）"""
        self.widgets.append(widget)
        index = len(self.widgets) - 1
        row = index // self.columns
        col = index % self.columns
        self.layout.addWidget(widget, row, col)
    
    def resizeEvent(self, event):
        """窗口大小改变事件"""
        width = self.width()
        
        # 根据宽度调整列数
        if width < 640:
            new_columns = 1  # 移动端
        elif width < 1024:
            new_columns = 2  # 平板
        else:
            new_columns = self.columns  # 桌面
        
        if new_columns != self.columns:
            self.columns = new_columns
            self._relayout()
    
    def _relayout(self):
        """重新布局"""
        # 清除布局
        while self.layout.count():
            item = self.layout.takeAt(0)
            if item.widget():
                item.widget().setParent(None)
        
        # 重新添加
        self.widgets.clear()
        # TODO: 重新添加所有组件
```

---

### 阶段 5：测试与验证（预计 4 小时）

#### 任务 5.1：组件测试

创建 `tests/test_components.py`：

```python
import pytest
from PyQt6.QtWidgets import QApplication
from src.ui.components.buttons import PrimaryButton, SecondaryButton
from src.ui.components.cards import Card

@pytest.fixture
def app():
    """创建应用实例"""
    return QApplication([])

def test_primary_button_creation(app):
    """测试 Primary 按钮创建"""
    button = PrimaryButton("测试")
    assert button.text() == "测试"
    assert button.isEnabled()

def test_secondary_button_creation(app):
    """测试 Secondary 按钮创建"""
    button = SecondaryButton("测试")
    assert button.text() == "测试"
    assert button.isEnabled()

def test_card_creation(app):
    """测试卡片创建"""
    card = Card("标题", "描述")
    assert card.title_label.text() == "标题"
    assert card.desc_label.text() == "描述"
```

#### 任务 5.2：布局测试

创建 `tests/test_layouts.py`：

```python
import pytest
from src.ui.main_window import MainWindow

def test_main_window_creation(qtbot):
    """测试主窗口创建"""
    window = MainWindow()
    qtbot.addWidget(window)
    assert window.windowTitle() == "图片自动插入工具"
    assert window.minimumWidth() == 1400
    assert window.minimumHeight() == 900

def test_responsive_layout(qtbot):
    """测试响应式布局"""
    window = MainWindow()
    qtbot.addWidget(window)
    
    # 测试不同宽度下的布局
    for width in [375, 768, 1024, 1440]:
        window.resize(width, 800)
        # TODO: 验证布局正确
```

---

## 质量控制

### 质量门控检查

每个阶段结束时必须执行质量检查，**全部通过**才能进入下一阶段。

#### 阶段 1 检查（基础架构）

- [ ] 项目结构符合规范
- [ ] 依赖安装成功
- [ ] 虚拟环境配置正确
- [ ] 颜色常量定义完整
- [ ] QSS 样式表加载正常

#### 阶段 2 检查（组件开发）

- [ ] 所有组件样式与设计稿一致
- [ ] 组件可复用
- [ ] 交互状态完整（normal/hover/active/disabled/focus）
- [ ] 组件测试通过
- [ ] 无硬编码值（使用设计令牌）

#### 阶段 3 检查（主窗口）

- [ ] 主窗口布局与设计稿一致
- [ ] 所有组件正确放置
- [ ] 响应式布局工作正常
- [ ] 窗口最小尺寸正确
- [ ] 样式应用正确

#### 阶段 4 检查（响应式）

- [ ] 375px 断点布局正确
- [ ] 768px 断点布局正确
- [ ] 1024px 断点布局正确
- [ ] 1440px 断点布局正确
- [ ] 无水平滚动条
- [ ] 文本可读（≥16px）
- [ ] 按钮可点击（≥44px）

#### 阶段 5 检查（测试验证）

- [ ] 所有单元测试通过
- [ ] 组件测试通过
- [ ] 布局测试通过
- [ ] 测试覆盖率 ≥ 80%
- [ ] 无已知 bug

---

### 代码审查标准

#### 代码规范

- [ ] 遵循 PEP 8 规范
- [ ] 所有函数有文档字符串
- [ ] 变量命名清晰
- [ ] 无魔法数字（使用常量）
- [ ] 代码重复 < 3 次

#### 样式规范

- [ ] 使用颜色常量（非硬编码）
- [ ] 使用设计令牌（非硬编码值）
- [ ] QSS 样式表组织良好
- [ ] 组件样式隔离

#### 测试规范

- [ ] 测试名称描述行为
- [ ] 一个测试只做一件事
- [ ] 测试可独立运行
- [ ] 测试具有可重复性

---

## 测试策略

### 测试金字塔

```
        /\
       /  \      E2E 测试 (10%)
      /----\     关键路径覆盖
     /      \
    /--------\   组件测试 (30%)
   /          \  组件交互、布局
  /------------\
 /              \  单元测试 (60%)
/________________\ 函数、方法
```

### 测试类型

#### 1. 单元测试

**目标：** 测试单个函数/方法

**示例：**
```python
def test_color_constants():
    """测试颜色常量定义"""
    assert Colors.PRIMARY == "#B8A895"
    assert Colors.PRIMARY_LIGHT == "#C9B5A0"
```

#### 2. 组件测试

**目标：** 测试 UI 组件

**示例：**
```python
def test_button_hover_state(qtbot):
    """测试按钮悬停状态"""
    button = PrimaryButton("测试")
    qtbot.addWidget(button)
    
    # 模拟鼠标悬停
    qtbot.mouseMove(button)
    
    # 验证样式变化
    assert "hover" in button.styleSheet().lower()
```

#### 3. 布局测试

**目标：** 测试布局响应式

**示例：**
```python
def test_responsive_at_375px(qtbot):
    """测试 375px 宽度布局"""
    window = MainWindow()
    qtbot.addWidget(window)
    window.resize(375, 800)
    
    # 验证单列布局
    assert layout.columnCount() == 1
```

#### 4. E2E 测试

**目标：** 测试完整用户流程

**示例：**
```python
def test_full_workflow(qtbot):
    """测试完整工作流程"""
    app = QApplication([])
    window = MainWindow()
    window.show()
    
    # 1. 选择文件
    qtbot.mouseClick(window.file_button, Qt.LeftButton)
    
    # 2. 选择图片源
    qtbot.mouseClick(window.source_button, Qt.LeftButton)
    
    # 3. 点击开始
    qtbot.mouseClick(window.start_button, Qt.LeftButton)
    
    # 4. 验证进度
    assert window.progress_bar.value() > 0
```

---

## 交付物

### 代码交付物

| 文件/目录 | 说明 | 状态 |
|----------|------|------|
| `src/` | 源代码 | ⬜ |
| `src/ui/` | UI 组件和布局 | ⬜ |
| `src/ui/components/` | 可复用组件 | ⬜ |
| `src/ui/layouts/` | 布局系统 | ⬜ |
| `src/ui/styles/` | 样式系统 | ⬜ |
| `src/main.py` | 应用入口 | ⬜ |
| `tests/` | 测试代码 | ⬜ |
| `requirements.txt` | 依赖列表 | ⬜ |

---

### 文档交付物

| 文档 | 说明 | 状态 |
|------|------|------|
| [质量检查清单](./quality-control-checklist.md) | 质量门控检查项 | ✅ |
| `README.md` | 项目说明 | ⬜ |
| `CHANGELOG.md` | 变更日志 | ⬜ |
| `docs/components.md` | 组件文档 | ⬜ |
| `docs/styles.md` | 样式文档 | ⬜ |

---

### 测试交付物

| 报告 | 说明 | 状态 |
|------|------|------|
| `test-results/` | 测试结果 | ⬜ |
| `coverage-report/` | 覆盖率报告 | ⬜ |
| `test-summary.md` | 测试摘要 | ⬜ |

---

## 附录

### A. 常用命令

```bash
# 运行测试
pytest tests/ -v

# 运行测试并生成覆盖率报告
pytest tests/ --cov=src --cov-report=html

# 运行特定测试
pytest tests/test_components.py::test_primary_button_creation -v

# 检查代码格式
flake8 src/

# 格式化代码
black src/
```

---

### B. 故障排查

#### 问题 1：QSS 样式不生效

**原因：**
- QSS 文件未加载
- 选择器错误
- 样式冲突

**解决方案：**
```python
# 确保在创建组件后应用样式
app = QApplication([])
app.setStyleSheet(QSS_STYLES)  # 全局样式
window = MainWindow()
window.show()
```

#### 问题 2：布局错位

**原因：**
- 间距设置错误
- 组件尺寸策略错误
- 响应式逻辑错误

**解决方案：**
```python
# 使用尺寸策略
widget.setSizePolicy(
    QSizePolicy.Policy.Expanding,
    QSizePolicy.Policy.Expanding
)

# 检查布局间距
layout.setSpacing(30)  # 确保与设计稿一致
```

#### 问题 3：高 DPI 模糊

**原因：**
- 未启用高 DPI 支持

**解决方案：**
```python
from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import QApplication

QApplication.setHighDpiScaleFactorRoundingPolicy(
    Qt.HighDpiScaleFactorRoundingPolicy.PassThrough
)
QApplication.setAttribute(Qt.AA_EnableHighDpiScaling)
```

---

### C. 相关资源

- [PyQt6 官方文档](https://www.riverbankcomputing.com/static/Docs/PyQt6/)
- [QSS 样式指南](https://doc.qt.io/qt-6/stylesheet.html)
- [设计稿](./color-options/scheme-01-warm-greige.html)
- [质量检查清单](./quality-control-checklist.md)

---

**文档版本历史：**

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2026-03-06 | 初始版本 | AI |

---

**下一步：**
1. ✅ 阅读并确认本实施规划
2. ⬜ 创建 Git 分支：`git checkout -b feature/ui-implementation`
3. ⬜ 开始阶段 1：基础架构搭建
4. ⬜ 按阶段执行并标记完成
5. ⬜ 完成所有阶段并运行质量检查
6. ⬜ 提交代码并请求审查
