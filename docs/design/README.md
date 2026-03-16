# 界面设计实施规划与质量控制 - 执行摘要

**项目：** ImageAutoInserter - Warm Greige 主题界面  
**设计稿：** [scheme-01-warm-greige.html](./color-options/scheme-01-warm-greige.html)  
**日期：** 2026-03-06

---

## 📋 快速导航

| 文档 | 用途 | 链接 |
|------|------|------|
| **实施规划** | 完整开发指南 | [implementation-plan.md](./implementation/implementation-plan.md) |
| **质量检查清单** | 质量门控检查项 | [quality-control-checklist.md](./implementation/quality-control-checklist.md) |
| **设计稿** | Warm Greige 设计规范 | [scheme-01-warm-greige.html](./color-options/scheme-01-warm-greige.html) |

---

## 🎯 技术路线推荐

### 推荐方案：PyQt6 + QSS ⭐

**核心理由：**
1. ✅ **与现有技术栈完全一致** - 项目已使用 Python，无需重写后端
2. ✅ **开发成本最低** - 直接复用现有业务逻辑
3. ✅ **打包体积最优** - 约 30-40MB（Electron 约 100MB+）
4. ✅ **原生体验最佳** - 调用系统 API，性能优秀

**技术栈：**
- **GUI 框架**: PyQt6 6.6.0+
- **样式系统**: QSS (Qt Style Sheets)
- **布局管理**: QBoxLayout + QGridLayout
- **样式变量**: Python 常量类（设计令牌）

---

## 🎨 设计规范速查

### 颜色系统

```python
class Colors:
    PRIMARY = "#B8A895"        # 主色 - 暖灰褐
    PRIMARY_LIGHT = "#C9B5A0"  # 浅褐 - 悬停
    PRIMARY_DARK = "#9A8B75"   # 深褐 - 按下
    ACCENT = "#8B7355"         # 强调色
    BG = "#F5F5F3"             # 背景
    BG_CARD = "#FAFAF9"        # 卡片背景
    TEXT = "#3D3D3D"           # 主文字
    TEXT_LIGHT = "#8B8B8B"     # 次要文字
    BORDER = "#E6E6E3"         # 边框
```

### 字体系统

| 大小 | 用途 | 示例 |
|------|------|------|
| 42px | 页面标题 | `h1` |
| 24px | 章节标题 | `h2` |
| 18px | 卡片标题 | `.card-title` |
| 14px | 正文/按钮 | `.btn`, `.card-desc` |
| 12px | 辅助文字 | `.badge` |

### 间距系统

| 值 | 用途 |
|----|------|
| 12px | 按钮组间距、输入框 padding |
| 30px | 组件网格 gap |
| 32px | 卡片 padding |
| 40px | 章节间距 |
| 60px | 页面头部 padding |

### 圆角系统

| 值 | 用途 |
|----|------|
| 4px | 按钮、输入框 |
| 6px | 卡片 |
| 8px | 颜色卡片、章节 |
| 10px | 图标容器 |
| 9999px | 徽章（圆角） |

### 阴影系统

```python
SHADOWS = {
    'shadow-sm': '0 2px 8px rgba(0,0,0,0.08)',      # 颜色卡片
    'shadow-md': '0 2px 12px rgba(0,0,0,0.06)',     # 章节卡片
    'shadow-lg': '0 12px 24px rgba(0,0,0,0.1)',     # 卡片 hover
    'shadow-xl': '0 8px 24px rgba(0,0,0,0.12)',     # 应用窗口
}
```

---

## 📦 核心组件示例

### Primary 按钮

```python
from PyQt6.QtWidgets import QPushButton
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QFont, QCursor

class PrimaryButton(QPushButton):
    def __init__(self, text: str):
        super().__init__(text)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setFont(QFont("Arial", 14, QFont.Weight.Medium))
        self.setStyleSheet("""
            QPushButton {
                background-color: #B8A895;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 14px 28px;
                font-weight: 500;
            }
            QPushButton:hover {
                background-color: #9A8B75;
            }
            QPushButton:pressed {
                background-color: #8B7355;
            }
        """)
```

### 卡片组件

```python
from PyQt6.QtWidgets import QFrame, QVBoxLayout, QLabel

class Card(QFrame):
    def __init__(self, title: str, description: str):
        super().__init__()
        self.setFrameShape(QFrame.Shape.StyledPanel)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(32, 32, 32, 32)
        
        title_label = QLabel(title)
        title_label.setFont(QFont("Arial", 18, QFont.Weight.Medium))
        
        desc_label = QLabel(description)
        desc_label.setFont(QFont("Arial", 14))
        desc_label.setWordWrap(True)
        
        layout.addWidget(title_label)
        layout.addWidget(desc_label)
        
        self.setStyleSheet("""
            QFrame {
                background-color: #F5F5F3;
                border-radius: 6px;
                border: 1px solid #E6E6E3;
            }
            QFrame:hover {
                background-color: #FAFAF9;
                border-color: #B8A895;
            }
        """)
```

---

## ✅ 质量控制要点

### 布局精准度

- [ ] 水平/垂直对齐误差 < 1px
- [ ] Grid 行列间距一致（误差 = 0px）
- [ ] 无元素溢出容器
- [ ] 无水平滚动条

### 间距标准

- [ ] 使用设计令牌（非硬编码）
- [ ] padding/margin 与设计稿一致（±0px）
- [ ] gap 值符合规范

### 层级关系

- [ ] 使用标准 z-index 值（z-0, z-10, z-20, z-40, z-50）
- [ ] 固定元素 z-50
- [ ] 背景元素使用负 z-index（z-[-1]）

### 交互状态

- [ ] 按钮：normal / hover / active / disabled / focus
- [ ] 输入框：normal / focus / error / disabled
- [ ] 卡片：normal / hover
- [ ] 动画持续时间：150-300ms

### 响应式布局

- [ ] 375px（移动端）- 单列布局
- [ ] 768px（平板）- 双列布局
- [ ] 1024px（桌面）- 双列/三列
- [ ] 1440px（大屏）- 三列布局

### 无障碍访问

- [ ] 颜色对比度 ≥ 4.5:1（WCAG AA）
- [ ] 键盘导航可用（Tab 顺序正确）
- [ ] 焦点状态可见
- [ ] 所有图片有 alt 文本
- [ ] 表单有 label 关联

---

## 🧪 测试策略

### 测试金字塔

```
        /\
       /  \      E2E 测试 (10%)
      /----\     关键路径
     /      \
    /--------\   组件测试 (30%)
   /          \  组件交互、布局
  /------------\
 /              \  单元测试 (60%)
/________________\  函数、方法
```

### 测试覆盖率要求

| 测试类型 | 覆盖率要求 |
|---------|-----------|
| 单元测试 | ≥ 80% |
| 组件测试 | ≥ 70% |
| E2E 测试 | 关键路径 100% |
| 视觉回归 | 关键组件 100% |

---

## 📋 实施步骤

### 阶段 1：基础架构搭建（2 小时）

- [ ] 创建项目结构
- [ ] 安装依赖（PyQt6, Pillow, pytest）
- [ ] 配置颜色常量和 QSS 样式表
- [ ] 设置虚拟环境

### 阶段 2：核心组件开发（6 小时）

- [ ] PrimaryButton（主按钮）
- [ ] SecondaryButton（次要按钮）
- [ ] Card（卡片组件）
- [ ] InputWithLabel（带标签输入框）
- [ ] ProgressWithLabel（进度条）
- [ ] 编写组件测试

### 阶段 3：主窗口实现（4 小时）

- [ ] MainWindow 框架
- [ ] 页面头部布局
- [ ] 组件网格布局
- [ ] 按钮组
- [ ] 响应式支持

### 阶段 4：响应式布局（2 小时）

- [ ] 实现 ResponsiveGrid 类
- [ ] 配置断点（375px, 768px, 1024px, 1440px）
- [ ] 测试不同断点下的布局
- [ ] 修复布局问题

### 阶段 5：测试与验证（4 小时）

- [ ] 运行所有单元测试
- [ ] 运行组件测试
- [ ] 运行布局测试
- [ ] 生成覆盖率报告
- [ ] 修复失败的测试

**总计预计：18 小时**

---

## 🚨 常见陷阱

### ❌ 错误：在测试前写实现代码

**正确做法：** 先写测试 → 看到失败 → 编写实现 → 验证通过

### ❌ 错误：跳过 RED 验证

**正确做法：** 必须亲眼看到测试失败（不是错误，是因为功能缺失）

### ❌ 错误：一次性实现多个功能

**正确做法：** 一次一个测试，一个功能

### ❌ 错误：使用硬编码值

**正确做法：** 使用设计令牌（颜色常量、间距令牌）

### ❌ 错误：未通过质量门控进入下一阶段

**正确做法：** 所有检查项必须全部通过

---

## 🛠️ 开发工具推荐

| 工具 | 用途 | 推荐度 |
|------|------|--------|
| Qt Designer | 可视化 UI 设计器 | ⭐⭐⭐⭐⭐ |
| VS Code + PyQt6 扩展 | 轻量级开发 | ⭐⭐⭐⭐ |
| Figma | 设计稿查看和测量 | ⭐⭐⭐⭐⭐ |
| PerfectPixel | 像素级对比浏览器扩展 | ⭐⭐⭐⭐ |
| pytest-qt | PyQt6 测试框架 | ⭐⭐⭐⭐⭐ |

---

## 📚 相关文档

- **完整实施规划**: [implementation-plan.md](./implementation/implementation-plan.md)
- **质量检查清单**: [quality-control-checklist.md](./implementation/quality-control-checklist.md)
- **设计稿**: [scheme-01-warm-greige.html](./color-options/scheme-01-warm-greige.html)
- **项目规范**: [.trae/specs/archive/image-auto-inserter/spec.md](../../.trae/specs/archive/image-auto-inserter/spec.md)

---

## 🎯 下一步行动

1. ✅ **阅读并确认本文档**
2. ⬜ **创建 Git 分支**
   ```bash
   git checkout -b feature/ui-implementation
   ```
3. ⬜ **开始阶段 1：基础架构搭建**
   - 创建项目结构
   - 安装依赖
   - 配置样式系统
4. ⬜ **按阶段执行并标记完成**
5. ⬜ **完成所有阶段并运行质量检查**
6. ⬜ **提交代码并请求审查**

---

## 💡 关键提醒

### 必须遵守的规则

- 🔴 **先写测试，后写实现** (TDD 核心原则)
- 🔴 **禁止跳过 RED 验证** (必须亲眼看到测试失败)
- 🔴 **禁止一次性实现多个功能** (一次一个测试)
- 🔴 **未通过质量门控，不得进入下一阶段**
- 🔴 **使用设计令牌，禁止硬编码值**

### 质量门控

每个阶段结束时执行质量检查，**全部通过**才能进入下一阶段。

详细检查项见：[quality-control-checklist.md](./implementation/quality-control-checklist.md)

---

**创建日期：** 2026-03-06  
**版本：** v1.0  
**维护者：** AI + 人工
