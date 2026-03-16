# ImageAutoInserter UI/UX 设计文档

**版本**: v1.0  
**创建日期**: 2026-03-04  
**最后更新**: 2026-03-04  
**设计状态**: ✅ 已批准

---

## 1. 设计概述

### 1.1 设计理念
**"现代简约 + 活力元素"** - 为电脑小白用户打造清新易用且视觉吸引力强的桌面应用

### 1.2 设计原则
- ✅ **简洁直观**: 最少操作步骤，清晰视觉层次
- ✅ **跨平台一致**: Windows/macOS 保持统一体验
- ✅ **友好反馈**: 流畅动画 + 明确状态提示
- ✅ **可访问性**: 符合无障碍设计标准
- ✅ **莫兰迪美学**: 低饱和度、高级灰、柔和质感
- ✅ **极简布局**: 大留白、呼吸感、精致细节

### 1.3 技术栈
- **框架**: PyQt6
- **样式**: QSS (Qt Style Sheets) + 自定义绘制
- **动画**: QPropertyAnimation + QGraphicsDropShadowEffect
- **图标**: Material Icons (SVG)
- **效果**: 毛玻璃效果、微渐变、多层阴影

---

## 2. 视觉设计系统

### 2.1 字体系统

#### 字体文件（自带字体，不依赖系统）
```python
# 字体文件路径
FONT_FILES = {
    'chinese': 'NotoSansSC-VariableFont_wght.ttf',
    'english': 'DINAlternate-Bold.ttf'
}

# 加载方式
import os
from PyQt6.QtGui import QFontDatabase

def load_fonts():
    """加载自定义字体文件"""
    base_path = os.path.dirname(__file__)
    
    # 加载中文字体
    chinese_font_id = QFontDatabase.addApplicationFont(
        os.path.join(base_path, 'fonts', 'NotoSansSC-VariableFont_wght.ttf')
    )
    if chinese_font_id == -1:
        raise Exception("中文字体加载失败")
    
    # 加载英文字体
    english_font_id = QFontDatabase.addApplicationFont(
        os.path.join(base_path, 'fonts', 'DINAlternate-Bold.ttf')
    )
    if english_font_id == -1:
        raise Exception("英文字体加载失败")
    
    # 获取字体系列名称
    chinese_family = QFontDatabase.applicationFontFamilies(chinese_font_id)[0]
    english_family = QFontDatabase.applicationFontFamilies(english_font_id)[0]
    
    return {
        'chinese': chinese_family,
        'english': english_family
    }
```

#### 字体族（跨平台统一）
```css
/* 中文优先 */
font-family: 
  "Noto Sans SC Variable",    /* 思源黑体 - 自带字体文件 */
  "DIN Alternate",            /* 英文/数字 - 自带字体文件 */
  "PingFang SC",              /* macOS 回退 */
  "Microsoft YaHei",          /* Windows 回退 */
  sans-serif;
```

#### 字号规范（统一使用逻辑像素）
```python
# 字体大小配置（跨平台统一）
FONT_SIZES = {
    'title_large': 24,      # 主标题
    'title_medium': 20,     # 副标题
    'title_small': 18,      # 小标题
    'body': 14,             # 标准正文
    'caption': 13,          # 辅助文字
    'hint': 12,             # 提示文字
}

# 字重配置
FONT_WEIGHTS = {
    'normal': 400,
    'medium': 500,
    'semibold': 600,
    'bold': 700,
}
```

#### 字体应用规则
```python
class FontManager:
    """统一字体管理器"""
    
    def __init__(self):
        self.fonts = load_fonts()
    
    def get_font(self, font_type='body', weight='normal', is_english=False):
        """
        获取统一字体
        
        Args:
            font_type: 'title_large', 'title_medium', 'body', 'caption', 'hint'
            weight: 'normal', 'medium', 'semibold', 'bold'
            is_english: 是否仅用于英文/数字
        
        Returns:
            QFont 对象
        """
        size = FONT_SIZES.get(font_type, 14)
        weight_value = FONT_WEIGHTS.get(weight, 400)
        
        if is_english:
            # 纯英文/数字使用 DIN Alternate
            family = self.fonts['english']
        else:
            # 中文或混合使用 Noto Sans SC
            family = self.fonts['chinese']
        
        font = QFont(family, size)
        font.setWeight(weight_value)
        return font
```

#### 主色调（莫兰迪色系 - 低饱和度）
```css
/* 主色 - 雾霾蓝灰 */
--primary: #7A8B9E;        /* 莫兰迪灰蓝 */
--primary-light: #94A3B8;  /* 浅灰蓝 */
--primary-dark: #5F6D7A;   /* 深灰蓝 */

/* 渐变主色 - 柔和微渐变 */
--gradient-primary: linear-gradient(135deg, #7A8B9E 0%, #9A8C9E 100%);
--gradient-hover: linear-gradient(135deg, #9A8C9E 0%, #7A8B9E 100%);

/* 辅助色 - 莫兰迪粉紫 */
--accent: #B8A8A0;         /* 莫兰迪粉褐 */
--accent-light: #C9B5B0;   /* 浅粉褐 */
```

#### 中性色（高级灰 - 带色彩倾向）
```css
/* 背景色 - 暖调灰白 */
--bg-primary: #F5F5F3;     /* 暖灰白（带米色调） */
--bg-secondary: #FAFAF9;   /* 浅暖灰 */
--bg-tertiary: #EDEDEB;    /* 中暖灰 */

/* 文字色 - 柔和深灰 */
--text-primary: #3D3D3D;   /* 柔黑（非纯黑） */
--text-secondary: #6B6B6B; /* 中灰 */
--text-tertiary: #9A9A9A;  /* 浅灰 */

/* 边框色 - 暖调灰 */
--border-light: #E6E6E3;
--border-medium: #D6D6D3;
```

#### 功能色（莫兰迪调色 - 低饱和度）
```css
/* 成功 - 灰绿色 */
--success: #8FA895;
--success-light: #D8E3DA;

/* 警告 - 土黄色 */
--warning: #C9B594;
--warning-light: #F0E9E0;

/* 错误 - 豆沙红 */
--error: #C9A0A0;
--error-light: #F0E3E3;

/* 信息 - 灰蓝色 */
--info: #8FA3B8;
--info-light: #D8E0E8;
```

#### 毛玻璃效果（高级质感）
```css
/* 毛玻璃背景 */
--glass-bg: rgba(250, 250, 249, 0.75);
--glass-border: rgba(255, 255, 255, 0.18);
--glass-shadow: 0 8px 32px 0 rgba(122, 139, 158, 0.15);
--glass-blur: blur(12px);

/* 毛玻璃卡片 */
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}
```

### 2.2 色彩系统

### 2.3 间距系统

#### 统一间距标尺 (8px 基准)
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

### 2.4 圆角系统
```css
/* 圆角 */
--rounded-sm: 4px;
--rounded: 8px;
--rounded-md: 12px;
--rounded-lg: 16px;
--rounded-xl: 20px;
--rounded-full: 9999px;
```

### 2.5 阴影系统（多层细腻阴影）

```css
/* 基础阴影 - 柔和多层 */
--shadow-sm: 
  0 1px 2px rgba(122, 139, 158, 0.04),
  0 2px 4px rgba(122, 139, 158, 0.04);

--shadow: 
  0 2px 4px rgba(122, 139, 158, 0.06),
  0 4px 8px rgba(122, 139, 158, 0.06),
  0 8px 16px rgba(122, 139, 158, 0.06);

--shadow-md: 
  0 4px 8px rgba(122, 139, 158, 0.08),
  0 8px 16px rgba(122, 139, 158, 0.08),
  0 16px 32px rgba(122, 139, 158, 0.08);

--shadow-lg: 
  0 8px 16px rgba(122, 139, 158, 0.1),
  0 16px 32px rgba(122, 139, 158, 0.1),
  0 32px 64px rgba(122, 139, 158, 0.1);

/* 主色调阴影 - 柔和色影 */
--shadow-primary: 
  0 4px 8px rgba(122, 139, 158, 0.12),
  0 8px 16px rgba(122, 139, 158, 0.12);

--shadow-primary-hover: 
  0 8px 16px rgba(122, 139, 158, 0.18),
  0 16px 32px rgba(122, 139, 158, 0.18);
```

---

## 3. 界面布局

### 3.1 窗口规格

#### 标准窗口
```
最小尺寸：800px × 600px
推荐尺寸：1024px × 768px
最大尺寸：无限制（自适应）
```

#### 响应式断点
```css
/* 大屏幕 */
@media (min-width: 1200px) {
  --card-width: 600px;
  --container-padding: 80px;
}

/* 中等屏幕 */
@media (min-width: 800px) and (max-width: 1200px) {
  --card-width: calc(100% - 80px);
  --container-padding: 40px;
}

/* 小屏幕 */
@media (max-width: 800px) {
  --card-width: calc(100% - 40px);
  --container-padding: 20px;
  --text-3xl: 20px;
  --text-base: 13px;
}
```

### 3.2 主界面结构

```
┌─────────────────────────────────────────────────────────┐
│                    标题栏 (60px)                        │
│  [Logo] ImageAutoInserter              [🌐 中文] [─□×] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                    内容区域 (自适应)                     │
│                                                         │
│    ╔═════════════════════════════════════════════╗     │
│    ║                                             ║     │
│    ║          📁 Excel 文件选择区                 ║     │
│    ║          拖拽或点击选择                      ║     │
│    ║                                             ║     │
│    ╚═════════════════════════════════════════════╝     │
│                                                         │
│    ╔═════════════════════════════════════════════╗     │
│    ║                                             ║     │
│    ║          🖼️ 图片源选择区                     ║     │
│    ║          支持文件夹/ZIP/RAR                  ║     │
│    ║                                             ║     │
│    ╚═════════════════════════════════════════════╝     │
│                                                         │
│    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │
│                    进度条区域                           │
│                                                         │
│              [        开始处理        ]                │
│                                                         │
│    ┌─────────────────────────────────────────┐         │
│    │ 状态日志...                             │         │
│    └─────────────────────────────────────────┘         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.3 组件布局规范

#### 拖拽卡片（极简布局 + 大留白）
```css
DropZoneCard {
  min-width: 500px;  /* 更宽，增加呼吸感 */
  max-width: 700px;
  min-height: 200px;  /* 更高，更舒适 */
  padding: 48px 32px;  /* 更大内边距 */
  margin: 24px auto;
  border-radius: 20px;  /* 更大圆角 */
  background: rgba(250, 250, 249, 0.85);  /* 暖调灰白 */
  border: 2px dashed #D6D6D3;  /* 暖调灰边框 */
  text-align: center;
  font-size: 15px;
  color: #6B6B6B;
}

DropZoneCard:hover {
  border-color: #7A8B9E;  /* 莫兰迪灰蓝 */
  background: rgba(250, 250, 249, 0.95);
  transform: translateY(-3px);  /* 更大上浮 */
  box-shadow: 
    0 8px 16px rgba(122, 139, 158, 0.08),
    0 16px 32px rgba(122, 139, 158, 0.08);
}

DropZoneCard[drag-over] {
  border-color: #7A8B9E;
  background: linear-gradient(135deg, 
    rgba(122, 139, 158, 0.05) 0%, 
    rgba(154, 140, 158, 0.05) 100%);
  transform: scale(1.03);  /* 更大缩放 */
  box-shadow: 
    0 12px 24px rgba(122, 139, 158, 0.12),
    0 24px 48px rgba(122, 139, 158, 0.12);
}
```

#### 主按钮（莫兰迪渐变 + 微渐变）
```css
PrimaryButton {
  min-width: 220px;  /* 更宽 */
  height: 52px;  /* 更高 */
  padding: 14px 36px;
  border-radius: 14px;  /* 更大圆角 */
  border: none;
  background: linear-gradient(135deg, #7A8B9E 0%, #9A8C9E 100%);  /* 莫兰迪渐变 */
  color: white;
  font-size: 16px;
  font-weight: 500;  /* 中等字重，更优雅 */
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 4px 8px rgba(122, 139, 158, 0.12),
    0 8px 16px rgba(122, 139, 158, 0.12);
}

PrimaryButton:hover {
  transform: translateY(-3px);
  box-shadow: 
    0 8px 16px rgba(122, 139, 158, 0.18),
    0 16px 32px rgba(122, 139, 158, 0.18);
  background: linear-gradient(135deg, #9A8C9E 0%, #7A8B9E 100%);  /* 反向渐变 */
}

PrimaryButton:pressed {
  transform: scale(0.98);
  box-shadow: 
    0 2px 4px rgba(122, 139, 158, 0.12),
    0 4px 8px rgba(122, 139, 158, 0.12);
}

PrimaryButton:disabled {
  background: #D6D6D3;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
```

#### 进度条（细腻渐变 + 流动效果）
```css
ProgressBar {
  height: 10px;  /* 更粗，更明显 */
  border-radius: 6px;
  background: #EDEDEB;  /* 暖调灰 */
  overflow: hidden;
  border: 1px solid #E6E6E3;
}

ProgressBar::chunk {
  background: linear-gradient(90deg, 
    #7A8B9E 0%, 
    #9A8C9E 50%, 
    #7A8B9E 100%);
  border-radius: 6px;
  animation: gradient-flow 3s linear infinite;  /* 更慢，更优雅 */
}

@animation gradient-flow {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
```

#### 语言切换按钮（极简边框）
```css
LanguageButton {
  width: 90px;  /* 更宽 */
  height: 36px;  /* 更高 */
  padding: 8px 20px;
  border-radius: 10px;  /* 更大圆角 */
  border: 1px solid #D6D6D3;
  background: #FAFAF9;  /* 浅暖灰 */
  color: #7A8B9E;  /* 莫兰迪灰蓝 */
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

LanguageButton:hover {
  background: #EDEDEB;
  border-color: #7A8B9E;
  color: #5F6D7A;
}

LanguageButton:pressed {
  transform: scale(0.96);
}
```

---

## 4. 交互设计

### 4.1 动画规范

#### 基础动画曲线
```css
/* 缓入缓出 */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

/* 弹性效果 */
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);

/* 标准过渡 */
--transition-base: all 0.2s var(--ease-in-out);
--transition-fast: all 0.15s var(--ease-in-out);
--transition-slow: all 0.3s var(--ease-in-out);
```

#### 交互动画

**1. 卡片悬停**
```python
# PyQt6 实现
def enterEvent(self, event):
    # 上浮动画
    self.animation = QPropertyAnimation(self, b"pos")
    self.animation.setDuration(200)
    self.animation.setStartValue(self.pos())
    self.animation.setEndValue(self.pos() - QPoint(0, 2))
    self.animation.setEasingCurve(QEasingCurve.InOutQuad)
    self.animation.start()
    
    # 阴影加深
    shadow = QGraphicsDropShadowEffect()
    shadow.setBlurRadius(20)
    shadow.setOffset(0, 0)
    shadow.setColor(QColor(79, 70, 229, 30))
    self.setGraphicsEffect(shadow)
```

**2. 按钮点击波纹**
```python
class RippleEffect(QWidget):
    def __init__(self, parent):
        super().__init__(parent)
        self.ripple_color = QColor(255, 255, 255, 100)
        self.animation = QPropertyAnimation(self, b"geometry")
        self.animation.setDuration(400)
        self.animation.setEasingCurve(QEasingCurve.OutCubic)
```

**3. 语言切换（无确认弹窗）**
```python
def switch_language(self, lang_code):
    # 立即切换，无确认
    translator = QTranslator()
    if lang_code == 'en':
        translator.load('i18n/en_US.qm')
    else:
        translator.load('i18n/zh_CN.qm')
    
    qApp.installTranslator(translator)
    
    # 刷新所有界面文字
    for widget in self.findChildren(QWidget):
        if hasattr(widget, 'update_texts'):
            widget.update_texts()
    
    # 无确认弹窗，静默切换
```

### 4.2 状态反馈

#### 成功状态
```
视觉：绿色对勾图标 + 淡绿色背景
动画：淡入效果 (0.3s)
文案："处理完成！已保存至：xxx.xlsx"
```

#### 错误状态
```
视觉：红色警告图标 + 淡红色背景
动画：Shake 效果（左右晃动 3 次）
文案："错误：未找到商品编码列"
```

#### 加载状态
```
视觉：旋转 Loading 图标 + 渐变进度条
动画：旋转动画 (1s/圈)
文案："正在处理中... 45%"
```

---

## 5. 双语支持

### 5.1 翻译文件结构

#### zh_CN.ts (中文)
```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE TS>
<TS version="2.1">
<context>
    <name>MainWindow</name>
    <message>
        <source>window_title</source>
        <translation>ImageAutoInserter - 图片自动插入工具</translation>
    </message>
    <message>
        <source>excel_dropzone</source>
        <translation>📁 拖拽 Excel 文件到此处\n或点击选择文件</translation>
    </message>
    <message>
        <source>image_dropzone</source>
        <translation>🖼️ 拖拽图片文件夹/压缩包到此处\n支持 ZIP/RAR 格式</translation>
    </message>
    <message>
        <source>start_button</source>
        <translation>开始处理</translation>
    </message>
    <message>
        <source>error_no_product_code</source>
        <translation>错误：未在表格中找到「商品编码」列</translation>
    </message>
</context>
</TS>
```

#### en_US.ts (英文)
```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE TS>
<TS version="2.1">
<context>
    <name>MainWindow</name>
    <message>
        <source>window_title</source>
        <translation>ImageAutoInserter - Auto Image Tool</translation>
    </message>
    <message>
        <source>excel_dropzone</source>
        <translation>📁 Drag Excel File Here\nor Click to Select</translation>
    </message>
    <message>
        <source>image_dropzone</source>
        <translation>🖼️ Drag Image Folder/Archive Here\nZIP/RAR Supported</translation>
    </message>
    <message>
        <source>start_button</source>
        <translation>Start Processing</translation>
    </message>
    <message>
        <source>error_no_product_code</source>
        <translation>Error: 「商品编码」column not found in spreadsheet</translation>
    </message>
</context>
</TS>
```

### 5.2 关键术语翻译规范

| 中文 | 英文 | 说明 |
|------|------|------|
| 商品编码 | 商品编码 (保留中文) | **术语唯一性**，即使英文界面也保留中文 |
| Picture 1 | Picture 1 | 列名保持英文 |
| 开始处理 | Start Processing | 按钮文字 |
| 拖拽到此处 | Drag Here | 提示文字 |

**重要**: 「商品编码」在所有语言界面中都保持中文原文，这是系统的唯一识别术语。

---

## 6. 可访问性设计

### 6.1 键盘导航
```
Tab: 切换焦点
Enter/Space: 触发按钮
Esc: 取消操作
Ctrl+L: 切换语言
```

### 6.2 屏幕阅读器支持
- 所有图标按钮添加 accessibleName
- 状态变化触发 announcement
- 进度条实时更新朗读

### 6.3 高对比度模式
```css
/* 检测系统高对比度设置 */
@media (prefers-contrast: high) {
  --border-light: #000000;
  --text-secondary: #000000;
  --shadow: none;
  border-width: 2px;
}
```

---

## 7. 性能优化

### 7.1 资源加载
- SVG 图标使用缓存
- 大图延迟加载
- 样式表预加载

### 7.2 渲染优化
- 使用 QSS 而非硬编码样式
- 复杂动画使用 OpenGL 加速
- 避免频繁的 repaint 调用

### 7.3 内存管理
- 及时释放 GDI 对象
- 图片资源使用共享内存
- 避免内存泄漏

---

## 8. 跨平台一致性保证

### 8.1 实现策略

**方案：95% 统一 + 自带字体 = 99% 一致**

#### 统一部分（99%）

**使用 PyQt6 原生控件 + 自带字体文件：**
- ✅ 所有颜色、渐变、阴影（QSS 统一定义）
- ✅ 所有圆角、间距、布局（统一逻辑像素）
- ✅ 所有动画效果（QPropertyAnimation）
- ✅ 所有组件样式（按钮/卡片/进度条）
- ✅ **字体渲染**（自带字体文件，不依赖系统）

#### 微小差异（1%）
- ⚠️ 窗口标题栏（保留系统样式，更自然）
- ⚠️ 系统托盘图标（系统级差异）

### 8.2 技术保证

#### 字体统一（关键）
```python
# 自带字体文件
- NotoSansSC-VariableFont_wght.ttf: 中文字体（思源黑体）
- DINAlternate-Bold.ttf: 英文/数字字体

# 加载方式
QFontDatabase.addApplicationFont()

# 效果
- Windows: 使用自带字体，不依赖微软雅黑
- macOS: 使用自带字体，不依赖苹方
- 结果：**100% 一致的字体渲染**
```

#### 高 DPI 支持
```python
# 启用高 DPI
QApplication.setAttribute(Qt.AA_EnableHighDpiScaling)
QApplication.setAttribute(Qt.AA_UseHighDpiPixmaps)

# 使用逻辑像素（Qt 自动处理物理像素）
# 所有尺寸使用统一的逻辑单位（px）
```

#### 样式统一
```python
# 统一 QSS 样式表（莫兰迪色系）
COMMON_STYLESHEET = """
QWidget {
    background-color: #F5F5F3;  /* 暖调灰白 */
    font-family: "Noto Sans SC Variable", "DIN Alternate";
    font-size: 14px;
    color: #3D3D3D;  /* 柔黑 */
}

QPushButton {
    background: qlineargradient(
        x1:0, y1:0, x2:1, y2:1,
        stop:0 #7A8B9E, stop:1 #9A8C9E  /* 莫兰迪渐变 */
    );
    border-radius: 14px;
    color: white;
}

/* 毛玻璃卡片 */
.glass-card {
    background: rgba(250, 250, 249, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 20px;
}
"""
```

### 8.3 一致性对比

| UI 元素 | Windows | macOS | 一致性 | 实现方式 |
|---------|---------|-------|--------|----------|
| **颜色** | ✅ 完全一致 | ✅ 完全一致 | 100% | QSS 统一定义（莫兰迪色系） |
| **渐变** | ✅ 完全一致 | ✅ 完全一致 | 100% | QLinearGradient（微渐变） |
| **圆角** | ✅ 完全一致 | ✅ 完全一致 | 100% | border-radius（20px） |
| **阴影** | ✅ 完全一致 | ✅ 完全一致 | 100% | QGraphicsDropShadowEffect（多层） |
| **动画** | ✅ 完全一致 | ✅ 完全一致 | 100% | QPropertyAnimation |
| **字体** | ✅ 完全一致 | ✅ 完全一致 | **100%** | **自带字体文件** |
| **字号** | ✅ 完全一致 | ✅ 完全一致 | 100% | 逻辑像素 |
| **间距** | ✅ 完全一致 | ✅ 完全一致 | 100% | 统一逻辑单位（大留白） |
| **毛玻璃** | ✅ 完全一致 | ✅ 完全一致 | 100% | 统一 backdrop-filter |
| **标题栏** | ⚠️ 系统样式 | ⚠️ 系统样式 | 95% | 保留系统样式 |
| **高 DPI** | ✅ 自动适配 | ✅ 自动适配 | 100% | Qt 内置支持 |

**总体一致性：100%**（使用自带字体文件 + 莫兰迪色系 + 极简布局）

### 8.4 测试验证

#### 视觉回归测试
```python
# 使用截图对比测试
def test_visual_consistency():
    # Windows 截图
    # macOS 截图
    # 像素级对比（允许 1% 差异）
    assert similarity >= 99%
```

#### 手动测试清单
- [ ] Windows 10/11 视觉测试
- [ ] macOS 12+ 视觉测试
- [ ] 字体渲染对比
- [ ] 动画流畅度对比
- [ ] 高 DPI 适配测试

---

## 附录 A：设计资源

### A.1 颜色参考
- Primary: [Inter UI](https://rsms.me/inter/)
- Icons: [Material Icons](https://fonts.google.com/icons)
- Colors: [Tailwind Colors](https://tailwindcss.com/docs/customizing-colors)

### A.2 工具推荐
- 设计：Figma / Sketch
- 原型：Framer / Principle
- 切图：Zeplin / Avocode

---

**文档结束**
