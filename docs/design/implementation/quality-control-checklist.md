# 界面开发质量控制检查清单

**项目名称：** ImageAutoInserter - Warm Greige 主题界面  
**设计稿：** [scheme-01-warm-greige.html](../color-options/scheme-01-warm-greige.html)  
**技术栈：** PyQt6 + QSS  
**创建日期：** 2026-03-06  
**版本：** v1.0

---

## 📋 使用说明

本检查清单用于确保界面开发质量，所有项目**必须全部通过**才能进入下一阶段。

**检查时机：**
- ✅ 每个组件开发完成后
- ✅ 每个阶段结束时
- ✅ 最终交付前

**检查方式：**
- 开发者自检（100% 覆盖）
- 同行审查（抽样 30%）
- 自动化测试（关键路径）

---

## 一、布局精准度检查

### 1.1 组件对齐

| 检查项 | 标准要求 | 实测值 | 状态 | 备注 |
|--------|---------|--------|------|------|
| 水平对齐误差 | < 1px | | ⬜ | 使用标尺工具测量 |
| 垂直对齐误差 | < 1px | | ⬜ | 使用标尺工具测量 |
| Grid 行列间距一致性 | 误差 = 0px | | ⬜ | 使用设计稿对比 |
| Flex 元素无意外换行 | 无换行 | | ⬜ | 调整窗口宽度测试 |

**测试方法：**
```python
# PyQt6 对齐验证工具
def verify_alignment(widget1, widget2, axis='horizontal'):
    """验证两个组件的对齐精度"""
    pos1 = widget1.pos()
    pos2 = widget2.pos()
    
    if axis == 'horizontal':
        error = abs(pos1.y() - pos2.y())
    else:
        error = abs(pos1.x() - pos2.x())
    
    assert error < 1, f"对齐误差：{error}px (标准：< 1px)"
    print(f"✓ 对齐误差：{error}px")
```

---

### 1.2 间距标准

| 检查项 | 设计值 | 实测值 | 状态 | 测量位置 |
|--------|--------|--------|------|---------|
| 页面头部 padding-top | 60px | | ⬜ | `.page-header` |
| 页面头部 padding-bottom | 60px | | ⬜ | `.page-header` |
| 卡片 padding | 32px | | ⬜ | `.card` |
| 组件间距 gap | 30px | | ⬜ | `.component-grid` |
| 按钮间距 | 12px | | ⬜ | `.button-group` |
| 输入框 padding | 12px 16px | | ⬜ | `.input` |

**设计令牌映射表：**

```python
SPACING_TOKENS = {
    'space-1': '4px',    # 最小单位
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

---

### 1.3 层级关系（Z-Index）

| 元素类型 | 标准值 | 实测值 | 状态 | 说明 |
|---------|--------|--------|------|------|
| 基础层 | `z-0` | | ⬜ | 默认层 |
| 装饰背景 | `z-[-1]` | | ⬜ | 负层级背景 |
| 下拉菜单 | `z-40` | | ⬜ | 弹出层 |
| 固定导航 | `z-50` | | ⬬ | 最高层 |
| 模态框 | `z-50` | | ⬜ | 与导航同级 |

**错误示例：**
```python
# ❌ 错误：使用任意值
modal.setStyleSheet("z-index: 9999;")

# ✅ 正确：使用标准值
modal.setStyleSheet("z-index: 50;")
```

---

## 二、尺寸参数验证

### 2.1 字体大小

| 元素 | 设计值 | CSS 类 | 实测值 | 状态 |
|------|--------|-------|--------|------|
| 页面标题 | 42px | `h1` | | ⬜ |
| 章节标题 | 24px | `h2` | | ⬜ |
| 卡片标题 | 18px | `.card-title` | | ⬜ |
| 卡片描述 | 14px | `.card-desc` | | ⬜ |
| 按钮文字 | 14px | `.btn` | | ⬜ |
| 徽章文字 | 12px | `.badge` | | ⬜ |
| 颜色值文字 | 12px | `.color-hex` | | ⬜ |

**字体令牌：**
```python
FONT_SIZES = {
    'xs': '12px',   # 辅助文字
    'sm': '13px',   # 次要文字
    'base': '14px', # 正文
    'lg': '15px',   # 副标题
    'xl': '18px',   # 卡片标题
    '2xl': '20px',
    '3xl': '24px',  # 章节标题
    '4xl': '36px',
    '5xl': '42px',  # 页面标题
}
```

---

### 2.2 圆角半径

| 元素 | 设计值 | CSS 属性 | 实测值 | 状态 |
|------|--------|---------|--------|------|
| 按钮 | 4px | `border-radius` | | ⬜ |
| 卡片 | 6px | `border-radius` | | ⬜ |
| 颜色卡片 | 8px | `border-radius` | | ⬜ |
| 图标容器 | 10px | `border-radius` | | ⬜ |
| 徽章 | 16px | `border-radius` | | ⬜ |
| 徽章（圆角） | 9999px | `border-radius` | | ⬜ |

---

### 2.3 阴影效果

| 层级 | 设计值 | CSS | 实测 | 状态 |
|------|--------|-----|------|------|
| 轻微阴影 | `0 2px 8px rgba(0,0,0,0.08)` | `.color-card` | | ⬜ |
| 中等阴影 | `0 2px 12px rgba(0,0,0,0.06)` | `.palette-section` | | ⬜ |
| 深度阴影 | `0 12px 24px rgba(0,0,0,0.1)` | `.card:hover` | | ⬜ |
| 窗口阴影 | `0 8px 24px rgba(0,0,0,0.12)` | `.app-window` | | ⬜ |

---

## 三、元素溢出检查

### 3.1 内容适配

| 检查项 | 标准要求 | 测试方法 | 状态 | 备注 |
|--------|---------|---------|------|------|
| 文本截断 | 使用 `text-overflow: ellipsis` | 输入超长文本 | ⬜ | |
| 图片适配 | `object-fit: cover/contain` | 不同尺寸图片 | ⬜ | |
| 容器溢出 | `overflow: hidden/auto` | 调整窗口大小 | ⬜ | |
| 换行处理 | `word-wrap: break-word` | 长单词/URL | ⬜ | |

**测试代码：**
```python
def test_text_overflow():
    """测试文本溢出处理"""
    long_text = "A" * 1000  # 超长文本
    label = QLabel(long_text)
    label.setStyleSheet("text-overflow: ellipsis;")
    
    # 验证文本被截断并显示省略号
    assert label.width() < 500  # 容器宽度限制
    print("✓ 文本溢出处理正确")

def test_image_fit():
    """测试图片适配"""
    from PIL import Image
    
    # 测试不同尺寸图片
    sizes = [(100, 100), (800, 600), (1920, 1080)]
    
    for width, height in sizes:
        img = Image.new('RGB', (width, height))
        # 验证图片在容器内正确缩放
        assert img.width <= container_width
        print(f"✓ 图片适配正确：{width}x{height}")
```

---

## 四、颜色对比度验证（无障碍）

### 4.1 WCAG AA 标准检查

| 文本类型 | 前景色 | 背景色 | 对比度 | 标准要求 | 状态 |
|---------|--------|--------|--------|---------|------|
| 正文文字 | #3D3D3D | #F5F5F3 | | ≥ 4.5:1 | ⬜ |
| 次要文字 | #8B8B8B | #F5F5F3 | | ≥ 4.5:1 | ⬜ |
| 按钮文字 | #FFFFFF | #B8A895 | | ≥ 4.5:1 | ⬜ |
| 链接文字 | #8B7355 | #F5F5F3 | | ≥ 4.5:1 | ⬜ |

**测试工具：**
```python
# 使用 webcolors 库验证对比度
import webcolors

def calculate_contrast_ratio(fg, bg):
    """计算颜色对比度比率"""
    def luminance(hex_color):
        """计算相对亮度"""
        rgb = webcolors.hex_to_rgb(hex_color)
        r, g, b = [x / 255.0 for x in rgb]
        
        r = r / 12.92 if r <= 0.03928 else ((r + 0.055) / 1.055) ** 2.4
        g = g / 12.92 if g <= 0.03928 else ((g + 0.055) / 1.055) ** 2.4
        b = b / 12.92 if b <= 0.03928 else ((b + 0.055) / 1.055) ** 2.4
        
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
    
    l1 = luminance(fg)
    l2 = luminance(bg)
    
    return (max(l1, l2) + 0.05) / (min(l1, l2) + 0.05)

# 测试
contrast = calculate_contrast_ratio('#3D3D3D', '#F5F5F3')
print(f"对比度：{contrast:.2f}:1")
assert contrast >= 4.5, "不满足 WCAG AA 标准"
```

---

## 五、交互状态检查

### 5.1 按钮状态

| 状态 | 触发条件 | 视觉效果 | 持续时间 | 状态 |
|------|---------|---------|---------|------|
| Normal | 默认 | `bg: #B8A895` | - | ⬜ |
| Hover | 鼠标悬停 | `bg: #9A8B75` + `translateY(-2px)` | 0.3s | ⬜ |
| Active | 鼠标按下 | `bg: #8B7355` | 即时 | ⬜ |
| Disabled | 禁用 | `opacity: 0.5` + `cursor: not-allowed` | - | ⬜ |
| Focus | 键盘聚焦 | `box-shadow: 0 0 0 3px rgba(184, 168, 149, 0.1)` | - | ⬜ |

**测试脚本：**
```python
def test_button_states():
    """测试按钮所有状态"""
    button = PrimaryButton("测试")
    
    # Normal 状态
    assert button.styleSheet().contains("#B8A895")
    
    # Hover 状态（模拟）
    from PyQt6.QtTest import QTest
    from PyQt6.QtCore import QEvent
    
    hover_event = QEvent(QEvent.Type.Enter)
    QApplication.sendEvent(button, hover_event)
    # 验证 hover 样式应用
    
    # Disabled 状态
    button.setEnabled(False)
    assert not button.isEnabled()
    
    print("✓ 按钮状态测试通过")
```

---

### 5.2 输入框状态

| 状态 | 触发条件 | 边框颜色 | 阴影效果 | 状态 |
|------|---------|---------|---------|------|
| Normal | 默认 | #E6E6E3 | 无 | ⬜ |
| Focus | 获得焦点 | #B8A895 | `0 0 0 3px rgba(184, 168, 149, 0.1)` | ⬜ |
| Error | 验证失败 | #FF5F56 | `0 0 0 3px rgba(255, 95, 86, 0.1)` | ⬜ |
| Disabled | 禁用 | #E6E6E3 | 背景变灰 | ⬜ |

---

### 5.3 卡片状态

| 状态 | 触发条件 | 变换效果 | 阴影变化 | 状态 |
|------|---------|---------|---------|------|
| Normal | 默认 | 无 | `0 2px 12px rgba(0,0,0,0.06)` | ⬜ |
| Hover | 鼠标悬停 | `translateY(-6px)` | `0 12px 24px rgba(0,0,0,0.1)` | ⬜ |

---

## 六、响应式布局测试

### 6.1 断点验证

| 断点 | 宽度 | 布局变化 | 字体调整 | 状态 |
|------|------|---------|---------|------|
| Mobile | 375px | 单列布局 | -2px | ⬜ |
| Tablet | 768px | 双列布局 | -1px | ⬜ |
| Desktop | 1024px | 双列/三列 | 标准 | ⬜ |
| Large | 1440px | 三列布局 | 标准 | ⬜ |
| XLarge | 1920px | 最大宽度限制 | 标准 | ⬜ |

**测试脚本：**
```python
def test_responsive_breakpoints():
    """测试响应式断点"""
    breakpoints = [375, 768, 1024, 1440, 1920]
    
    for width in breakpoints:
        # 调整窗口宽度
        window.resize(width, 800)
        QApplication.processEvents()
        
        # 验证布局正确
        verify_layout_at_breakpoint(width)
        print(f"✓ 断点测试通过：{width}px")

def verify_layout_at_breakpoint(width):
    """验证特定断点下的布局"""
    if width < 640:
        # 移动端：单列
        assert layout.columnCount() == 1
    elif width < 1024:
        # 平板：双列
        assert layout.columnCount() == 2
    else:
        # 桌面：三列
        assert layout.columnCount() == 3
```

---

### 6.2 内容适配检查

| 检查项 | 375px | 768px | 1024px | 1440px | 状态 |
|--------|-------|-------|--------|--------|------|
| 无水平滚动 | ✓ | ✓ | ✓ | ✓ | ⬜ |
| 文本可读（≥16px） | ✓ | ✓ | ✓ | ✓ | ⬜ |
| 按钮可点击（≥44px） | ✓ | ✓ | ✓ | ✓ | ⬜ |
| 图片比例正确 | ✓ | ✓ | ✓ | ✓ | ⬜ |
| 导航栏可见 | ✓ | ✓ | ✓ | ✓ | ⬜ |

---

## 七、性能检查

### 7.1 渲染性能

| 指标 | 标准要求 | 实测值 | 状态 | 测试工具 |
|------|---------|--------|------|---------|
| 首次渲染时间 | < 100ms | | ⬜ | Qt Profiler |
| 重绘耗时 | < 16ms (60fps) | | ⬜ | Qt Profiler |
| 内存占用 | < 200MB | | ⬜ | Task Manager |
| CPU 占用 | < 5% | | ⬜ | Activity Monitor |

---

### 7.2 动画性能

| 动画类型 | 持续时间 | FPS | 状态 |
|---------|---------|-----|------|
| 按钮 Hover | 150-300ms | 60 | ⬜ |
| 卡片悬浮 | 300ms | 60 | ⬜ |
| 进度条 | 500ms | 60 | ⬜ |
| 页面切换 | 300ms | 60 | ⬜ |

**测试代码：**
```python
def test_animation_performance():
    """测试动画性能"""
    from PyQt6.QtCore import QTime
    
    start_time = QTime.currentTime()
    
    # 触发卡片悬浮动画
    card.hoverEnterEvent(None)
    QApplication.processEvents()
    
    elapsed = start_time.msecsTo(QTime.currentTime())
    
    # 验证动画持续时间在合理范围
    assert 150 <= elapsed <= 500, f"动画耗时异常：{elapsed}ms"
    print(f"✓ 动画性能测试通过：{elapsed}ms")
```

---

## 八、无障碍访问检查

### 8.1 键盘导航

| 检查项 | 标准要求 | 测试方法 | 状态 |
|--------|---------|---------|------|
| Tab 顺序正确 | 从左到右，从上到下 | 按 Tab 键遍历 | ⬜ |
| 所有交互元素可聚焦 | 使用 Tab 可达 | 键盘测试 | ⬜ |
| 焦点可见 | 有明显焦点框 | 视觉检查 | ⬜ |
| Esc 可关闭弹窗 | 按 Esc 关闭 | 键盘测试 | ⬜ |
| Enter 可提交表单 | 按 Enter 提交 | 键盘测试 | ⬜ |

---

### 8.2 屏幕阅读器支持

| 检查项 | 标准要求 | 实现方式 | 状态 |
|--------|---------|---------|------|
| 图片有 alt 文本 | 所有图片 | `QLabel.setToolTip()` | ⬜ |
| 表单有 label | 所有输入框 | `QLabel.setBuddy()` | ⬜ |
| 图标按钮有描述 | 所有图标按钮 | `QPushButton.setAccessibleName()` | ⬜ |
| 状态变化通知 | 进度、错误 | `QAccessible.updateAccessibility()` | ⬜ |

---

## 九、跨平台兼容性

### 9.1 操作系统

| 系统 | 版本 | 测试项 | 状态 |
|------|------|--------|------|
| Windows | 10/11 | 字体渲染、文件对话框、拖拽 | ⬜ |
| macOS | 12+ | 字体渲染、原生菜单、快捷键 | ⬜ |
| Linux | Ubuntu 22.04 | 字体、主题、权限 | ⬜ |

---

### 9.2 高 DPI 支持

| 检查项 | 标准要求 | 测试方法 | 状态 |
|--------|---------|---------|------|
| 100% 缩放 | 清晰无锯齿 | 标准显示器 | ⬜ |
| 125% 缩放 | 布局正确 | Windows 缩放设置 | ⬜ |
| 150% 缩放 | 无溢出 | Windows 缩放设置 | ⬜ |
| 200% 缩放 | 清晰无模糊 | Retina 显示器 | ⬜ |

**配置代码：**
```python
# 启用高 DPI 支持
from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import QApplication

QApplication.setHighDpiScaleFactorRoundingPolicy(
    Qt.HighDpiScaleFactorRoundingPolicy.PassThrough
)
QApplication.setAttribute(Qt.AA_EnableHighDpiScaling)
```

---

## 十、最终交付检查

### 10.1 代码质量

| 检查项 | 标准要求 | 工具 | 状态 |
|--------|---------|------|------|
| 无硬编码颜色 | 使用颜色常量 | 代码审查 | ⬜ |
| 无硬编码尺寸 | 使用设计令牌 | 代码审查 | ⬜ |
| 组件可复用 | 独立组件类 | 代码审查 | ⬜ |
| 注释完整 | 函数级注释 | 代码审查 | ⬜ |
| 无 TODO 遗留 | 所有 TODO 已解决 | 代码搜索 | ⬜ |

---

### 10.2 文档完整性

| 文档 | 必须包含 | 状态 |
|------|---------|------|
| 组件文档 | 用途、属性、方法、示例 | ⬜ |
| 样式文档 | 颜色、字体、间距令牌 | ⬜ |
| 测试文档 | 测试用例、覆盖率报告 | ⬜ |
| 部署文档 | 打包、发布、更新流程 | ⬜ |

---

### 10.3 测试覆盖率

| 测试类型 | 覆盖率要求 | 实测值 | 状态 |
|---------|-----------|--------|------|
| 单元测试 | ≥ 80% | | ⬜ |
| 组件测试 | ≥ 70% | | ⬜ |
| E2E 测试 | 关键路径 100% | | ⬜ |
| 视觉回归 | 关键组件 100% | | ⬜ |

---

## 检查结果汇总

### 总体状态

| 类别 | 检查项数 | 通过数 | 未通过数 | 通过率 |
|------|---------|--------|---------|--------|
| 布局精准度 | | | | |
| 尺寸参数 | | | | |
| 元素溢出 | | | | |
| 颜色对比度 | | | | |
| 交互状态 | | | | |
| 响应式布局 | | | | |
| 性能 | | | | |
| 无障碍访问 | | | | |
| 跨平台兼容 | | | | |
| 代码质量 | | | | |
| **总计** | | | | |

---

### 未通过项处理

| 编号 | 问题描述 | 严重程度 | 修复方案 | 负责人 | 截止日期 | 状态 |
|------|---------|---------|---------|--------|---------|------|
| | | | | | | |

**严重程度定义：**
- 🔴 **严重** - 阻塞发布，必须立即修复
- 🟡 **一般** - 建议修复，可延迟到下一版本
- 🟢 **轻微** - 可选优化，有时间再处理

---

## 签署确认

| 角色 | 姓名 | 日期 | 签名 |
|------|------|------|------|
| 开发者 | | | |
| 审查者 | | | |
| 项目经理 | | | |

---

## 附录：自动化测试脚本

### A. 批量测试工具

```python
#!/usr/bin/env python3
"""
界面质量自动化测试工具
使用方法：python test_ui_quality.py
"""

import sys
from PyQt6.QtWidgets import QApplication
from PyQt6.QtTest import QTest

def run_all_tests():
    """运行所有测试"""
    app = QApplication(sys.argv)
    
    tests = [
        test_alignment(),
        test_spacing(),
        test_colors(),
        test_responsive(),
        test_accessibility(),
    ]
    
    passed = sum(tests)
    total = len(tests)
    
    print(f"\n{'='*50}")
    print(f"测试结果：{passed}/{total} 通过")
    
    if passed == total:
        print("✅ 所有测试通过！")
        return 0
    else:
        print(f"❌ {total - passed} 个测试失败")
        return 1

if __name__ == '__main__':
    sys.exit(run_all_tests())
```

---

**文档版本历史：**

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2026-03-06 | 初始版本 | AI |

---

**相关文档：**
- [设计规范](../color-options/scheme-01-warm-greige.html)
- [实施方案](./implementation-plan.md)
- [测试报告](./test-reports/)
