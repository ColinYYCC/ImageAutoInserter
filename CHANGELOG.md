# Changelog

所有重要的变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且该项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

### Fixed
- **进度条动画跳变问题** - 修复了进度条从 0% 直接跳到 10%、以及从 95% 直接跳到结果页面的问题
  - 后端添加 `time.sleep()` 延迟，确保前端有时间渲染中间进度值
  - 前端重写 `useSmoothProgress` Hook，使用 `requestAnimationFrame` 实现平滑动画
  - 结果页面延迟 800ms 显示，让用户看到 100% 完成状态
  - 详细文档见 `docs/superpowers/plans/2026-03-13-smooth-progress-completed.md`

### Changed
- **优化进度阶段划分**
  - 解析阶段: 0% → 5% → 10%
  - 处理阶段: 10% → ... → 90%
  - 保存阶段: 90% → 95% → 99% → 100%

### Technical Details
- **后端变更** (`src/core/process_engine.py`)
  - 添加进度发送延迟策略（150ms - 500ms）
  - 优化保存阶段渐进进度显示
  - 添加详细的设计注释

- **前端变更** (`src/renderer/components/ProcessingPage.tsx`)
  - 重写 `useSmoothProgress` Hook
  - 实现 ease-out 缓动动画算法
  - 添加结果页面延迟显示逻辑
  - 添加详细的设计注释

---

## 进度条动画修复总结

### 问题描述
1. **0% → 10% 跳跃**: 解析阶段进度更新过快，用户看不到中间值
2. **95% → 结果页**: 100% 后立即切换页面，动画被中断

### 根因分析
- 后端同步连续发送进度，前端 React 渲染周期无法捕获中间值
- 组件卸载会中断动画，需要使用 `setTimeout` 延迟状态切换

### 解决方案
采用**前端主导的平滑动画系统**：
- 后端发送关键进度节点，中间添加 `time.sleep()` 延迟
- 前端使用 `requestAnimationFrame` 实现平滑动画
- 结果页面延迟显示，让用户看到 100% 完成状态

### 动画算法
```
每帧移动距离 = max(剩余距离 × 0.08, 0.3)
```
- 差距大时移动快（快速接近目标）
- 差距小时移动慢（平滑减速）
- 最小速度 0.3% 确保慢速时也能看到动画

### 测试验证
- ✅ 所有单元测试通过
- ✅ TypeScript 类型检查通过
- ✅ 进度单调递增不回退
- ✅ 100% 停留 500ms 后再显示结果页
- ✅ 结果页延迟 800ms 显示，确保动画完成
