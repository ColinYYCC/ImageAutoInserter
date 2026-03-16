# 平滑进度条过渡实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现进度条从处理阶段平滑过渡到100%，不允许跳跃，确保视觉上连续自然

**Architecture:** 采用前端动画驱动方案：Python后端在保存前发送95%进度，前端使用CSS动画和JavaScript插值实现95%到100%的平滑过渡，持续约1-2秒

**Tech Stack:** React, CSS transitions, cubic-bezier easing

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `src/renderer/components/ProcessingPage.tsx` | 添加平滑过渡动画逻辑，监听进度变化 |
| `src/renderer/components/ProcessingPage.module.css` | 添加进度条填充动画样式 |
| `src/core/process_engine.py` | 调整进度计算，保存前发送95%而非直接100% |

---

## Chunk 1: 前端进度条平滑动画

### Task 1: 添加平滑过渡 Hook 和状态管理

**Files:**
- Modify: `src/renderer/components/ProcessingPage.tsx:1-120`

- [ ] **Step 1: 添加 useSmoothProgress Hook**

```typescript
import { useState, useEffect, useRef } from 'react';

/**
 * 平滑进度 Hook
 * 当实际进度接近完成时，使用动画平滑过渡到100%
 */
function useSmoothProgress(actualProgress: number, isComplete: boolean): number {
  const [displayProgress, setDisplayProgress] = useState(0);
  const animationRef = useRef<number | null>(null);
  const targetRef = useRef(0);

  useEffect(() => {
    // 如果已完成，平滑过渡到100%
    if (isComplete && actualProgress >= 95) {
      targetRef.current = 100;
      
      const animate = () => {
        setDisplayProgress(prev => {
          const diff = targetRef.current - prev;
          if (diff < 0.5) {
            return targetRef.current;
          }
          // 使用缓动函数实现平滑效果
          const next = prev + diff * 0.1;
          return next;
        });
        
        if (displayProgress < 100) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // 正常进度直接显示
      setDisplayProgress(actualProgress);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [actualProgress, isComplete]);

  return displayProgress;
}
```

- [ ] **Step 2: 在组件中使用 Hook**

修改 ProcessingPage 组件：

```typescript
const ProcessingPage: React.FC<ProcessingPageProps> = memo(({
  progress,
  result,
  error,
  onCancel,
  onOpenFile,
  onReset,
}) => {
  // 使用平滑进度
  const smoothProgress = useSmoothProgress(progress, !!result);
  const clampedProgress = Math.min(Math.max(smoothProgress, 0), 100);
  
  // ... rest of component
```

- [ ] **Step 3: 优化 CSS 过渡效果**

修改 `ProcessingPage.module.css` 中的 progressFill：

```css
.progressFill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
  border-radius: 3px;
  transition: width 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: width;
}
```

- [ ] **Step 4: 提交**

```bash
git add src/renderer/components/ProcessingPage.tsx src/renderer/components/ProcessingPage.module.css
git commit -m "feat: add smooth progress transition animation"
```

---

## Chunk 2: 后端进度调整

### Task 2: 调整 process_engine.py 进度计算

**Files:**
- Modify: `src/core/process_engine.py:516-530`

- [ ] **Step 1: 在保存前发送95%进度**

在处理循环结束后、保存文件前添加：

```python
# 高亮显示未匹配到任何图片的商品编码
if empty_product_rows:
    self._log(
        log_callback,
        f"🔄 正在高亮 {len(empty_product_rows)} 个未匹配到图片的商品编码..."
    )
    excel.highlight_empty_product_codes(empty_product_rows)
    self._log(
        log_callback,
        f"✅ 高亮完成，共高亮 {len(empty_product_rows)} 个商品编码"
    )

# 发送95%进度，让前端开始平滑过渡到100%
if progress_callback:
    progress_callback(ProgressInfo(
        current_row=result.total_rows,
        total_rows=result.total_rows,
        current_action="正在保存文件",
        percentage=95.0
    ))

# 保存文件
self._log(log_callback, "🔄 正在保存文件...")
output = excel.save(output_path)
result.output_path = output
self._log(log_callback, f"✅ 文件保存成功：{output}")

# 保存完成后发送100%
if progress_callback:
    progress_callback(ProgressInfo(
        current_row=result.total_rows,
        total_rows=result.total_rows,
        current_action="处理完成",
        percentage=100.0
    ))
```

- [ ] **Step 2: 提交**

```bash
git add src/core/process_engine.py
git commit -m "feat: adjust progress to 95% before save for smooth transition"
```

---

## Chunk 3: 测试验证

### Task 3: 验证平滑过渡效果

- [ ] **Step 1: 运行应用测试**

```bash
npm run dev
```

- [ ] **Step 2: 验证进度行为**

测试场景：
1. 选择Excel文件和图片
2. 点击"开始处理"
3. 观察进度条：
   - 正常处理时进度应平滑增长
   - 到达95%后应缓慢过渡到100%
   - 不应出现跳跃

- [ ] **Step 3: 提交**

```bash
git commit -m "test: verify smooth progress transition"
```

---

## 实现要点

### 平滑动画算法

使用 `requestAnimationFrame` + 缓动插值：

```
next = current + (target - current) * 0.1
```

- 每帧向目标进度移动剩余距离的10%
- 越接近目标速度越慢，形成自然减速效果
- 使用 `cubic-bezier(0.22, 1, 0.36, 1)` CSS 缓动函数

### 进度流程

```
0% → 15% (准备阶段)
15% → 95% (处理行数据)
95% → 100% (前端动画平滑过渡，约1-2秒)
```

### 关键约束

- 不允许直接从95%跳到100%
- 过渡过程必须连续可见
- 动画时长控制在1-2秒内，避免用户等待过久
