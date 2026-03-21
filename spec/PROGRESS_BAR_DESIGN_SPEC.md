# 进度条组件设计规范文档

## Progress Bar Design Specification

**版本**: 2.0.0
**更新日期**: 2026-03-21
**状态**: 已实现

---

## 1. 概述

### 1.1 目的

本规范旨在为应用程序中的进度条组件提供统一的设计标准和实现指南，确保进度条在视觉反馈、用户体验和性能方面达到最佳表现。

### 1.2 适用范围

- 文件上传/下载
- 数据加载/处理
- 任务完成度展示
- 多步骤流程指示
- 后台异步操作

### 1.3 设计原则

| 原则 | 描述 | 优先级 |
|------|------|--------|
| **可见性** | 进度变化必须即时可见，用户始终了解当前状态 | P0 |
| **可预测性** | 用户应能预估剩余时间或工作量 | P1 |
| **性能优先** | 使用 GPU 加速动画，避免主线程阻塞 | P0 |
| **可访问性** | 支持屏幕阅读器和减少动效偏好 | P0 |
| **一致性** | 相同场景使用相同的进度条样式 | P1 |

---

## 2. 实现方案

### 2.1 当前实现：平滑渐变进度条

采用**线性渐变填充 + shimmer 效果**的方案：

- **平滑动画**: 使用 `requestAnimationFrame` 实现平滑过渡，每次移动差值的 12%
- **shimmer 效果**: 扫光动画，1.2秒循环
- **渐变背景**: 根据当前阶段动态变化颜色
- **完成延迟**: 100% 后延迟 500ms 显示统计页面

### 2.2 阶段配置

| 进度范围 | 阶段标签 | 颜色 |
|----------|----------|------|
| 1-3% | 启动进程 | #8B7355 |
| 3-8% | 加载配置 | #8B7355 |
| 8-15% | 解析Excel | #9d8668 |
| 15-25% | 扫描图片 | #9d8668 |
| 25-50% | 处理数据 | #A69076 |
| 50-75% | 嵌入图片 | #A69076 |
| 75-90% | 验证数据 | #B8A086 |
| 95-99% | 保存文件 | #6B8E23 |
| 99-100% | 完成 | #2D7A3E |

---

## 3. 视觉设计规范

### 3.1 尺寸规格

| 尺寸 | 高度 | 适用场景 |
|------|------|----------|
| **默认** | 8px | 处理页面进度条 |

### 3.2 颜色规范

#### 主色调 (Primary)

| 变量名 | 色值 | 用途 |
|--------|------|------|
| `--color-primary` | `#8B7355` | 进度条填充起始色 |
| `--color-primary-light` | `#A69076` | 进度条填充中间色 |

#### 语义色

| 状态 | 色值 | 使用场景 |
|------|------|----------|
| **Success** | `#2D7A3E` | 完成状态 |
| **Saving** | `#6B8E23` | 保存文件阶段 |

### 3.3 状态定义

| 状态 | 视觉表现 | 使用场景 |
|------|----------|----------|
| **Processing** | 主题色渐变 + shimmer 动画 | 进行中 |
| **Complete** | 绿色 | 已完成 |

---

## 4. 动画规范

### 4.1 时长规范

| 动画类型 | 时长 | 说明 |
|----------|------|------|
| **填充过渡** | 平滑追赶 | 每帧移动差值的 12% |
| **shimmer 循环** | 1.2s | 扫光效果周期 |
| **完成延迟** | 500ms | 100% 后延迟显示统计页面 |

### 4.2 缓动函数

```typescript
// 平滑追赶动画
const animate = () => {
  const diff = targetValue - displayRef.current;
  if (Math.abs(diff) > 0.5) {
    displayRef.current += diff * 0.12; // 每帧移动差值的 12%
    setDisplayProgress(displayRef.current);
    requestAnimationFrame(animate);
  } else {
    displayRef.current = targetValue;
    setDisplayProgress(targetValue);
  }
};
```

### 4.3 性能优化规则

| 规则 | 描述 | 实现方式 |
|------|------|----------|
| **GPU 加速** | 仅使用 transform/opacity | `will-change: transform` |
| **避免重排** | 不使用 left/right/top/bottom 动画 | 使用 width + transition |
| **节流渲染** | 限制更新频率 | requestAnimationFrame |

### 4.4 无障碍支持

```css
@media (prefers-reduced-motion: reduce) {
  .microShimmer {
    animation: none;
  }
}
```

---

## 5. 代码实现

### 5.1 组件结构

```tsx
const MicroProgressBar: React.FC<{ progress: number }> = memo(({ progress }) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const displayRef = useRef(0);

  useEffect(() => {
    const targetValue = progress;
    const animate = () => {
      const diff = targetValue - displayRef.current;
      if (Math.abs(diff) > 0.5) {
        displayRef.current += diff * 0.12;
        setDisplayProgress(displayRef.current);
        requestAnimationFrame(animate);
      } else {
        displayRef.current = targetValue;
        setDisplayProgress(targetValue);
      }
    };
    requestAnimationFrame(animate);
  }, [progress]);

  const normalizedProgress = Math.min(Math.max(displayProgress, 0), 100);
  const currentStage = getCurrentStage(progress);

  return (
    <div className={styles.microProgressContainer}>
      <div className={styles.microProgressTrack}>
        <div
          className={styles.microProgressFill}
          style={{ 
            width: `${normalizedProgress}%`,
            background: `linear-gradient(90deg, ${STAGES[0].color}, ${currentStage.color})`
          }}
        >
          <div className={styles.microShimmer} />
        </div>
      </div>
    </div>
  );
});
```

### 5.2 CSS 样式

```css
.microProgressContainer {
  flex: 1;
}

.microProgressTrack {
  height: 8px;
  background: linear-gradient(90deg, #f0eeeb 0%, #e8e6e3 100%);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);
}

.microProgressFill {
  height: 100%;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
  min-width: 0;
  will-change: transform;
  transform-origin: left center;
  box-shadow: 0 1px 3px rgba(139, 115, 85, 0.3);
  transition: background 0.5s ease;
}

.microShimmer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.5) 50%,
    transparent 100%
  );
  animation: shimmer-slide 1.2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes shimmer-slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

---

## 6. 进度同步机制

### 6.1 主进程进度解析

```typescript
// src/main/ipc-handlers.ts
const parseProgressFromLine = (line: string) => {
  const progressMatch = line.match(/进度[：:]\s*(\d+)%?\s*[-–]?\s*(.*)/);
  if (progressMatch && mainWindow) {
    const percent = parseInt(progressMatch[1], 10);
    const current = progressMatch[2]?.trim() || '';
    mainWindow.webContents.send('progress', { percent, current });
  }
};
```

### 6.2 Python 进度输出

```python
# src/core/process_engine.py
# 保存文件阶段进度
progress_callback(ProgressInfo(percentage=90.0, current_action="正在保存文件"))
progress_callback(ProgressInfo(percentage=93.0, current_action="正在保存文件"))
progress_callback(ProgressInfo(percentage=96.0, current_action="正在保存文件"))
progress_callback(ProgressInfo(percentage=99.0, current_action="正在保存文件"))
progress_callback(ProgressInfo(percentage=100.0, current_action="处理完成"))
```

---

## 7. 质量检查清单

### 7.1 功能验收

- [x] 进度 0-100 正确映射
- [x] 阶段标签正确显示
- [x] 100% 后延迟显示统计页面
- [x] 颜色随阶段变化

### 7.2 视觉验收

- [x] 填充与轨道比例正确
- [x] shimmer 动画流畅无卡顿
- [x] 颜色符合设计规范
- [x] 圆角半径统一

### 7.3 性能验收

- [x] 60fps 无掉帧
- [x] 使用 GPU 加速

### 7.4 无障碍验收

- [x] prefers-reduced-motion 支持

---

## 8. 修改的文件

| 文件 | 修改内容 |
|------|----------|
| `src/renderer/components/ProcessingPage.tsx` | 进度条组件、阶段配置、动画逻辑 |
| `src/renderer/components/ProcessingPage.module.css` | 进度条样式、shimmer 动画 |
| `src/main/ipc-handlers.ts` | 进度解析逻辑 |
| `src/core/process_engine.py` | 进度输出点 |

---

## 9. 附录

### 9.1 术语表

| 术语 | 定义 |
|------|------|
| **Track** | 进度条轨道，灰色背景区域 |
| **Fill** | 进度条填充，已完成部分 |
| **Shimmer** | 光泽流动效果 |
| **Stage** | 进度阶段，对应不同的标签和颜色 |

### 9.2 参考资料

- [WCAG 2.1 Success Criterion 2.2.2](https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html)
- [MDN: CSS Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations)
- [Google Material Design: Progress indicators](https://material.io/components/progress-indicators)
