# GUI 重设计 Mockup 规格文档

> **版本**: v1.0  
> **创建日期**: 2026-03-08  
> **状态**: 设计完成  
> **适用范围**: ImageAutoInserter GUI 版本  
> **设计工具**: Figma / Sketch / Adobe XD

---

## 目录

1. [设计概览](#设计概览)
2. [颜色系统应用](#颜色系统应用)
3. [字体系统应用](#字体系统应用)
4. [阴影系统应用](#阴影系统应用)
5. [动画系统应用](#动画系统应用)
6. [状态 Mockup 详解](#状态-mockup-详解)
7. [资源下载](#资源下载)

---

## 设计概览

### 窗口规格

```
┌────────────────────────────────────────┐
│                                        │
│         ImageAutoInserter              │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │                                  │ │
│  │     800px (固定宽度)             │ │
│  │                                  │ │
│  │  ┌────────────────────────────┐ │ │
│  │  │                            │ │ │
│  │  │      内容区域               │ │ │
│  │  │   600px (固定高度)         │ │ │
│  │  │                            │ │ │
│  │  └────────────────────────────┘ │ │
│  │                                  │ │
│  └──────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

**窗口尺寸**: 800px × 600px（固定，不可调整）  
**内容安全区域**: 左右各留白 32px，上下各留白 24px  
**可用内容区域**: 736px × 552px

---

## 颜色系统应用

### 主色调色板

| 颜色类型 | 色值 | RGB | 使用场景 |
|---------|------|-----|---------|
| **主色** | `#2563EB` | rgb(37, 99, 235) | 主要按钮、进度条、激活状态 |
| **主色悬停** | `#1D4ED8` | rgb(29, 78, 216) | 按钮 hover 状态 |
| **主色激活** | `#1E40AF` | rgb(30, 64, 175) | 按钮 active/pressed 状态 |
| **强调色** | `#F97316` | rgb(249, 115, 22) | 高亮提示、重要标记 |
| **成功色** | `#10B981` | rgb(16, 185, 129) | 成功状态、完成统计 |
| **错误色** | `#EF4444` | rgb(239, 68, 68) | 错误提示、失败统计 |
| **警告色** | `#F59E0B` | rgb(245, 158, 11) | 警告提示、注意项 |

### 中性色调色板

| 颜色类型 | 色值 | RGB | 使用场景 |
|---------|------|-----|---------|
| **主文字** | `#111827` | rgb(17, 24, 39) | 标题、重要文字 |
| **次要文字** | `#6B7280` | rgb(107, 114, 128) | 描述文字、辅助说明 |
| **第三文字** | `#9CA3AF` | rgb(156, 163, 175) | 禁用文字、占位符 |
| **主背景** | `#F9FAFB` | rgb(249, 250, 251) | 窗口背景 |
| **次背景** | `#FFFFFF` | rgb(255, 255, 255) | 卡片背景、内容区域 |
| **第三背景** | `#F3F4F6` | rgb(243, 244, 246) | 禁用状态背景 |
| **边框浅色** | `#E5E7EB` | rgb(229, 231, 235) | 卡片边框、分隔线 |
| **边框标准** | `#D1D5DB` | rgb(209, 213, 219) | 按钮边框、输入框边框 |

### 颜色应用示例

#### 主按钮颜色状态

```css
/* 默认状态 */
.primary-button {
  background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

/* 悬停状态 */
.primary-button:hover {
  background: linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%);
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
}

/* 激活状态 */
.primary-button:active {
  background: #1E40AF;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transform: scale(0.98);
}

/* 禁用状态 */
.primary-button:disabled {
  background: #F3F4F6;
  color: #9CA3AF;
  box-shadow: none;
}
```

#### 进度条颜色应用

```css
.progress-bar {
  background: #E5E7EB;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  background: linear-gradient(90deg, #2563EB 0%, #1D4ED8 100%);
  transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 完成状态 */
.progress-fill.complete {
  background: linear-gradient(90deg, #10B981 0%, #059669 100%);
}
```

---

## 字体系统应用

### 字号规格表

| 字号名称 | 像素值 | CSS 变量 | 使用场景 | 示例 |
|---------|-------|---------|---------|------|
| **XS** | 13px | `--text-xs` | 辅助说明、注释、图例 | 文件大小、日期 |
| **SM** | 15px | `--text-sm` | 正文、描述文字、标签 | 文件路径、状态说明 |
| **BASE** | 17px | `--text-base` | 标准正文、按钮文字 | 操作说明、选项文字 |
| **LG** | 21px | `--text-lg` | 小标题、卡片标题 | 文件名片段 |
| **XL** | 26px | `--text-xl` | 中标题、状态标题 | "处理完成" |
| **2XL** | 32px | `--text-2xl` | 大标题、页面标题 | "ImageAutoInserter" |

### 字重规格表

| 字重名称 | 数值 | CSS 变量 | 使用场景 |
|---------|------|---------|---------|
| **Regular** | 400 | `--font-normal` | 正文、描述文字 |
| **Medium** | 500 | `--font-medium` | 按钮文字、标签 |
| **Semibold** | 600 | `--font-semibold` | 标题、统计数字 |
| **Bold** | 700 | `--font-bold` | 大标题、重要强调 |

### 行高规格表

| 行高名称 | 倍数 | CSS 变量 | 使用场景 |
|---------|------|---------|---------|
| **Tight** | 1.3 | `--leading-tight` | 标题、短文本 |
| **Normal** | 1.5 | `--leading-normal` | 标准正文 |
| **Relaxed** | 1.7 | `--leading-relaxed` | 长段落、说明文字 |

### 字体应用示例

#### 标题层级

```css
/* 页面大标题 - 32px Bold */
.page-title {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.3;
  color: #111827;
  letter-spacing: -0.5px;
}

/* 状态标题 - 26px Semibold */
.status-title {
  font-size: 26px;
  font-weight: 600;
  line-height: 1.3;
  color: #111827;
}

/* 卡片标题 - 21px Semibold */
.card-title {
  font-size: 21px;
  font-weight: 600;
  line-height: 1.3;
  color: #111827;
}
```

#### 正文层级

```css
/* 标准正文 - 17px Normal */
.body-text {
  font-size: 17px;
  font-weight: 400;
  line-height: 1.5;
  color: #111827;
}

/* 次要文字 - 15px Normal */
.secondary-text {
  font-size: 15px;
  font-weight: 400;
  line-height: 1.5;
  color: #6B7280;
}

/* 辅助说明 - 13px Normal */
.caption-text {
  font-size: 13px;
  font-weight: 400;
  line-height: 1.5;
  color: #9CA3AF;
}
```

#### 按钮文字

```css
/* 主要按钮 - 17px Medium */
.button-primary {
  font-size: 17px;
  font-weight: 500;
  line-height: 1.3;
  color: #FFFFFF;
  letter-spacing: 0.3px;
}

/* 次要按钮 - 17px Medium */
.button-secondary {
  font-size: 17px;
  font-weight: 500;
  line-height: 1.3;
  color: #111827;
}
```

---

## 阴影系统应用

### 阴影规格表

| 阴影名称 | 参数 | 使用场景 | 视觉效果 |
|---------|------|---------|---------|
| **SM** | `0 1px 2px rgba(0,0,0,0.04)` | 按钮、小元素 | 轻微浮起感 |
| **MD** | `0 2px 4px rgba(0,0,0,0.06)`<br>`0 1px 2px rgba(0,0,0,0.03)` | 卡片、面板 | 标准卡片阴影 |
| **LG** | `0 4px 8px rgba(0,0,0,0.08)`<br>`0 2px 4px rgba(0,0,0,0.04)` | 弹窗、对话框 | 强调浮起感 |
| **XL** | `0 8px 16px rgba(0,0,0,0.10)`<br>`0 4px 8px rgba(0,0,0,0.05)` | 下拉菜单、悬浮提示 | 强烈浮起感 |

### 阴影应用示例

#### 卡片阴影（标准）

```css
.file-card {
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.06),
    0 1px 2px rgba(0, 0, 0, 0.03);
  border: 1px solid #E5E7EB;
}

/* 卡片悬停状态 */
.file-card:hover {
  box-shadow: 
    0 4px 8px rgba(0, 0, 0, 0.08),
    0 2px 4px rgba(0, 0, 0, 0.04);
  border-color: #D1D5DB;
}
```

#### 按钮阴影

```css
/* 默认状态 - 轻微阴影 */
.button {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

/* 悬停状态 - 增强阴影 */
.button:hover {
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.06),
    0 1px 2px rgba(0, 0, 0, 0.03);
}

/* 激活状态 - 减少阴影 */
.button:active {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
```

#### 弹窗阴影

```css
.error-dialog {
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 
    0 8px 16px rgba(0, 0, 0, 0.10),
    0 4px 8px rgba(0, 0, 0, 0.05);
}
```

---

## 动画系统应用

### 动画时长规格表

| 时长名称 | 毫秒值 | CSS 变量 | 使用场景 |
|---------|-------|---------|---------|
| **FAST** | 150ms | `--duration-fast` | 按钮反馈、小元素状态切换 |
| **NORMAL** | 200ms | `--duration-normal` | 卡片展开、常规过渡 |
| **SLOW** | 300ms | `--duration-slow` | 进度条、大元素移动 |

### 缓动函数规格表

| 缓动名称 | 贝塞尔曲线 | CSS 变量 | 使用场景 | 效果描述 |
|---------|-----------|---------|---------|---------|
| **Ease Out** | `cubic-bezier(0.4, 0, 0.2, 1)` | `--ease-out` | 进入动画、按钮反馈 | 快速开始，缓慢结束 |
| **Ease In Out** | `cubic-bezier(0.4, 0, 0.6, 1)` | `--ease-in-out` | 对称过渡、页面切换 | 平滑加速和减速 |

### 动画应用示例

#### 按钮按压反馈

```css
@keyframes button-press {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.98);
  }
  100% {
    transform: scale(1);
  }
}

.button {
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.button:active {
  animation: button-press 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

#### 进度条过渡

```css
.progress-fill {
  width: 0%;
  transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 进度更新时 */
.progress-fill.update {
  /* width 属性平滑过渡 */
}
```

#### 卡片淡入动画

```css
@keyframes card-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.file-card {
  animation: card-fade-in 200ms cubic-bezier(0.4, 0, 0.6, 1);
}
```

#### 状态切换动画

```css
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.status-view {
  animation: slide-up 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 状态 Mockup 详解

### 状态 1: IDLE（初始状态）

#### 视觉描述

```
┌────────────────────────────────────────┐
│  ImageAutoInserter                     │ 32px Bold
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  📄                              │ │
│  │  选择 Excel 文件                   │ 21px Semibold
│  │  点击按钮选择要处理的 Excel 文件     │ 15px Normal, #6B7280
│  │  [选择 Excel 文件]                 │ 按钮
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  🖼️                              │ │
│  │  选择图片源                       │ 21px Semibold
│  │  选择包含商品图片的文件夹或压缩包   │ 15px Normal, #6B7280
│  │  [选择图片源]                     │ 按钮（禁用）
│  └──────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

#### 布局规格

- **页面标题**: 顶部居中，32px Bold，#111827
- **卡片间距**: 上下卡片间距 24px
- **卡片内边距**: 左右 32px，上下 24px
- **图标尺寸**: 48px × 48px，居中放置
- **卡片标题**: 图标下方 16px，21px Semibold
- **描述文字**: 标题下方 8px，15px Normal，#6B7280
- **按钮位置**: 描述下方 20px，居中对齐

#### 颜色应用

- **卡片背景**: #FFFFFF
- **卡片边框**: #E5E7EB（虚线，2px 间隔 4px）
- **主按钮**: #2563EB 渐变
- **禁用按钮**: #F3F4F6 背景，#9CA3AF 文字

#### 阴影应用

- **卡片阴影**: MD (0 2px 4px rgba(0,0,0,0.06))
- **按钮阴影**: SM (0 1px 2px rgba(0,0,0,0.04))

#### 动画应用

- **卡片出现**: fade-in 200ms ease-in-out
- **按钮悬停**: 150ms ease-out

---

### 状态 2: READY（文件已选择）

#### 视觉描述

```
┌────────────────────────────────────────┐
│  ImageAutoInserter                     │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  ✅  product_list.xlsx           │ │
│  │     /Users/shimengyu/Documents/... │
│  │     文件大小：2.3 MB              │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  ✅  product_images.zip          │ │
│  │     /Users/shimengyu/Downloads/... │
│  │     包含图片：156 张               │
│  └──────────────────────────────────┘ │
│                                        │
│         [开始处理]                     │ 激活状态
│                                        │
└────────────────────────────────────────┘
```

#### 布局规格

- **文件卡片**: 实线边框 #D1D5DB
- **文件图标**: 左侧 24px，垂直居中
- **文件名**: 图标右侧 16px，17px Semibold
- **文件路径**: 文件名下方 4px，13px Normal，#6B7280
- **文件信息**: 路径下方 4px，13px Normal，#9CA3AF
- **开始按钮**: 底部居中，距下卡片 32px

#### 颜色应用

- **成功图标**: #10B981
- **文件名**: #111827
- **文件路径**: #6B7280
- **文件信息**: #9CA3AF
- **开始按钮**: #2563EB 渐变（激活状态）

#### 阴影应用

- **文件卡片**: MD (0 2px 4px rgba(0,0,0,0.06))
- **开始按钮**: LG (0 4px 8px rgba(37,99,235,0.15))

#### 动画应用

- **卡片更新**: 150ms ease-out（边框从虚线变实线）
- **按钮激活**: scale 从 0.98 到 1.0，200ms ease-out

---

### 状态 3: PROCESSING（处理中）

#### 视觉描述

```
┌────────────────────────────────────────┐
│  ImageAutoInserter                     │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  ⚙️  正在处理...                  │ │
│  │                                  │ │
│  │  当前项目：C000123456             │ │
│  │                                  │ │
│  │  ▓▓▓▓▓▓▓▓▓▓░░░░░░░░  67%        │ │
│  │                                  │ │
│  │  已处理：67 / 100                │ │
│  │  预计剩余：2 分钟                 │ │
│  └──────────────────────────────────┘ │
│                                        │
│            [取消]                      │
│                                        │
└────────────────────────────────────────┘
```

#### 布局规格

- **状态图标**: 顶部居中，48px × 48px（旋转动画）
- **状态标题**: 图标下方 16px，26px Semibold
- **当前项目**: 标题下方 24px，17px Normal，#111827
- **进度条**: 当前项目下方 20px，高度 8px
- **进度文字**: 进度条右侧 16px，15px Semibold
- **统计信息**: 进度条下方 16px，13px Normal，#6B7280
- **取消按钮**: 底部居中，进度区域下方 32px

#### 颜色应用

- **状态图标**: #2563EB（旋转动画）
- **状态标题**: #111827
- **当前项目**: #111827
- **进度条背景**: #E5E7EB
- **进度条填充**: #2563EB → #1D4ED8 渐变
- **进度文字**: #2563EB Semibold
- **统计信息**: #6B7280
- **取消按钮**: #6B7280 背景，#111827 文字

#### 阴影应用

- **处理卡片**: LG (0 4px 8px rgba(0,0,0,0.08))
- **进度条**: inset 0 1px 2px rgba(0,0,0,0.04)
- **取消按钮**: SM (0 1px 2px rgba(0,0,0,0.04))

#### 动画应用

- **图标旋转**: rotate 360deg，1000ms linear infinite
- **进度条增长**: width 300ms ease-out
- **统计更新**: fade 150ms ease-out

#### 进度条详细规格

```css
.progress-container {
  width: 100%;
  height: 8px;
  background: #E5E7EB;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  width: 67%; /* 动态更新 */
  background: linear-gradient(90deg, #2563EB 0%, #1D4ED8 100%);
  border-radius: 4px;
  transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.2);
}

/* 完成状态 */
.progress-bar.complete {
  background: linear-gradient(90deg, #10B981 0%, #059669 100%);
}
```

---

### 状态 4: COMPLETE（处理完成）

#### 视觉描述

```
┌────────────────────────────────────────┐
│  ImageAutoInserter                     │
│                                        │
│        ✅  处理完成！                   │ 32px Bold, #10B981
│                                        │
│  ┌────────────┐  ┌────────────┐       │
│  │   100      │  │    98      │       │
│  │  总项目数   │  │  成功插入   │       │
│  └────────────┘  └────────────┘       │
│                                        │
│  ┌────────────┐  ┌────────────┐       │
│  │    2       │  │   98%      │       │
│  │  处理失败   │  │  成功率    │       │
│  └────────────┘  └────────────┘       │
│                                        │
│  [查看错误]    [打开文件]               │
│                                        │
│         [返回首页]                     │
│                                        │
└────────────────────────────────────────┘
```

#### 布局规格

- **成功图标**: 顶部居中，64px × 64px
- **完成标题**: 图标下方 16px，32px Bold，#10B981
- **统计卡片**: 2×2 网格布局，间距 16px
- **卡片尺寸**: 每个 160px × 100px
- **统计数字**: 卡片内顶部，26px Bold
- **统计标签**: 数字下方 8px，15px Normal，#6B7280
- **操作按钮**: 统计卡片下方 32px，水平排列，间距 16px
- **返回按钮**: 底部居中，操作按钮下方 24px

#### 颜色应用

- **成功图标**: #10B981
- **完成标题**: #10B981
- **总项目数**: #2563EB Bold
- **成功插入**: #10B981 Bold
- **处理失败**: #EF4444 Bold
- **成功率**: #2563EB Bold
- **查看错误**: #FFFFFF 背景，#EF4444 文字
- **打开文件**: #2563EB 渐变
- **返回首页**: #F3F4F6 背景，#6B7280 文字

#### 阴影应用

- **统计卡片**: MD (0 2px 4px rgba(0,0,0,0.06))
- **查看错误按钮**: SM (0 1px 2px rgba(0,0,0,0.04))
- **打开文件按钮**: LG (0 4px 8px rgba(37,99,235,0.15))
- **返回首页按钮**: SM (0 1px 2px rgba(0,0,0,0.04))

#### 动画应用

- **成功图标**: scale 从 0 到 1，300ms ease-out（弹跳效果）
- **完成标题**: fade-in 200ms ease-out
- **统计卡片**: slide-up 200ms ease-out（依次延迟 50ms）
- **按钮出现**: fade-in 150ms ease-out

#### 统计卡片详细规格

```css
.stat-card {
  width: 160px;
  height: 100px;
  background: #FFFFFF;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.06),
    0 1px 2px rgba(0, 0, 0, 0.03);
  border: 1px solid #E5E7EB;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 8px;
}

.stat-value.total {
  color: #2563EB;
}

.stat-value.success {
  color: #10B981;
}

.stat-value.failed {
  color: #EF4444;
}

.stat-value.rate {
  color: #2563EB;
}

.stat-label {
  font-size: 15px;
  font-weight: 400;
  line-height: 1.5;
  color: #6B7280;
}
```

---

### 状态 5: ERROR（错误状态）

#### 视觉描述

```
┌────────────────────────────────────────┐
│                                        │
│        ⚠️                              │ 64px
│                                        │
│     处理过程中发生错误                  │ 21px Semibold
│                                        │
│  错误详情：                            │
│  ┌──────────────────────────────────┐ │
│  │  文件 "C000123789.jpg" 未找到    │ │
│  │  位置：第 45 行，C 列             │ │
│  │  建议：检查图片源是否包含该文件   │ │
│  └──────────────────────────────────┘ │
│                                        │
│  [查看完整错误列表]    [重试]          │
│                                        │
│            [关闭]                      │
│                                        │
└────────────────────────────────────────┘
```

#### 布局规格

- **警告图标**: 顶部居中，64px × 64px
- **错误标题**: 图标下方 20px，21px Semibold，#EF4444
- **错误详情标题**: 标题下方 24px，17px Semibold
- **错误卡片**: 详情标题下方 12px，内边距 20px
- **错误信息**: 卡片内，15px Normal，#111827
- **错误位置**: 信息下方 8px，13px Normal，#6B7280
- **建议**: 位置下方 8px，13px Normal，#9CA3AF
- **操作按钮**: 卡片下方 24px，水平排列，间距 16px
- **关闭按钮**: 底部居中，操作按钮下方 24px

#### 颜色应用

- **警告图标**: #F59E0B
- **错误标题**: #EF4444
- **错误详情标题**: #111827
- **错误卡片背景**: #FEF2F2（浅红色）
- **错误卡片边框**: #FECACA
- **错误信息**: #111827
- **错误位置**: #6B7280
- **建议**: #9CA3AF
- **查看错误列表**: #FFFFFF 背景，#2563EB 文字
- **重试按钮**: #2563EB 渐变
- **关闭按钮**: #F3F4F6 背景，#6B7280 文字

#### 阴影应用

- **错误对话框**: XL (0 8px 16px rgba(0,0,0,0.10))
- **错误卡片**: SM (0 1px 2px rgba(0,0,0,0.04))
- **操作按钮**: SM (0 1px 2px rgba(0,0,0,0.04))

#### 动画应用

- **对话框出现**: fade-in + scale-up 200ms ease-out
- **警告图标**: shake 300ms ease-in-out（轻微摇晃）
- **错误卡片**: slide-down 150ms ease-out

---

## 资源下载

### 设计资源

#### Figma 设计文件

- **主设计文件**: [ImageAutoInserter GUI Design.fig](https://figma.com/file/placeholder/gui-design)
  - 包含所有状态的设计稿
  - 完整的组件库
  - 设计系统规范

- **组件库**: [ImageAutoInserter Components.fig](https://figma.com/file/placeholder/components)
  - FilePicker 组件
  - ProgressBar 组件
  - ResultView 组件
  - ErrorDialog 组件

#### Sketch 设计文件

- **主设计文件**: [ImageAutoInserter_GUI_Design.sketch](https://sketch.com/s/placeholder)
  - 所有页面状态
  - Symbol 组件库

#### Adobe XD 设计文件

- **主设计文件**: [ImageAutoInserter_GUI.xd](https://xd.adobe.com/view/placeholder)
  - 交互原型
  - 动画效果演示

### 样式资源

#### CSS 变量文件

```css
/* 下载：design-tokens.css */
:root {
  /* Colors */
  --primary: #2563EB;
  --primary-hover: #1D4ED8;
  --primary-active: #1E40AF;
  --accent: #F97316;
  --success: #10B981;
  --error: #EF4444;
  --warning: #F59E0B;
  
  /* Typography */
  --text-xs: 13px;
  --text-sm: 15px;
  --text-base: 17px;
  --text-lg: 21px;
  --text-xl: 26px;
  --text-2xl: 32px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 2px 4px rgba(0,0,0,0.06);
  --shadow-lg: 0 4px 8px rgba(0,0,0,0.08);
  --shadow-xl: 0 8px 16px rgba(0,0,0,0.10);
  
  /* Animation */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
}
```

#### 图标资源包

- **SVG 图标集**: [icons.zip](https://github.com/placeholder/icons.zip)
  - file-excel.svg
  - file-folder.svg
  - file-zip.svg
  - file-rar.svg
  - check-circle.svg
  - alert-circle.svg
  - loading.svg
  - success.svg

### 开发资源

#### React 组件模板

- **组件库**: [react-components.zip](https://github.com/placeholder/react-components.zip)
  - FilePicker.tsx
  - ProgressBar.tsx
  - ResultView.tsx
  - ErrorDialog.tsx
  - Button.tsx
  - Card.tsx

#### TypeScript 类型定义

```typescript
// 下载：types.ts
interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: 'excel' | 'folder' | 'zip' | 'rar';
}

interface ProcessingResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{
    item: string;
    message: string;
    row: number;
    column: string;
  }>;
}

type AppState = 
  | { phase: 'IDLE' }
  | { phase: 'READY'; excelFile: FileInfo; imageSource: FileInfo }
  | { phase: 'PROCESSING'; progress: number; current: string }
  | { phase: 'COMPLETE'; result: ProcessingResult }
  | { phase: 'ERROR'; error: Error };
```

### 参考资源

#### 设计灵感

- [Dribbble - Dashboard Design](https://dribbble.com/search/dashboard)
- [Behance - UI Design](https://www.behance.net/search/projects/ui-design)
- [Awwwards - Web Design](https://www.awwwards.com/)

#### 设计规范参考

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design Guidelines](https://material.io/design)
- [Microsoft Fluent Design](https://www.microsoft.com/design/fluent/)

---

## 附录：设计检查清单

### 视觉检查

- [ ] 所有间距使用 8px 基准系统
- [ ] 所有圆角符合规范（8/12/16px）
- [ ] 所有颜色对比度 ≥ 4.5:1
- [ ] 所有阴影使用统一系统
- [ ] 所有动画使用统一时长

### 组件检查

- [ ] FilePicker 组件状态完整
- [ ] ProgressBar 动画流畅
- [ ] ResultView 统计准确
- [ ] ErrorDialog 信息清晰

### 状态检查

- [ ] IDLE 状态引导清晰
- [ ] READY 状态确认明确
- [ ] PROCESSING 状态反馈及时
- [ ] COMPLETE 状态结果完整
- [ ] ERROR 状态处理友好

### 开发准备

- [ ] 设计资源已导出
- [ ] 样式变量已定义
- [ ] 组件模板已准备
- [ ] 类型定义已完善

---

**文档结束**

> 本 Mockup 文档与 [spec.md](file:///Users/shimengyu/Documents/trae_projects/ImageAutoInserter/.trae/specs/gui-redesign/spec.md) 配套使用，提供详细的视觉设计规格和实现指导。
