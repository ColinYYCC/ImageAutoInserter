# ImageAutoInserter

图片自动插入工具 - 根据商品编码自动将图片嵌入 Excel 表格

## 功能特点

- 自动匹配商品编码，批量插入图片到 Excel
- 支持文件夹、ZIP、RAR、7Z 格式的图片来源
- 实时进度显示，细粒度阶段划分
- 平滑动画效果
- 自动更新功能

## 下载

请访问 [Releases](https://github.com/ColinYYCC/ImageAutoInserter/releases) 页面下载最新版本。

## 使用说明

1. 选择图片来源（文件夹或压缩包）
2. 选择 Excel 文件
3. 点击"开始处理"
4. 等待处理完成

## 系统要求

- macOS 10.14+ (ARM64) / Windows 10+ (x86-64)
- Python 3.8+

## 技术架构

本项目采用 Electron + Python 混合架构：

- **Electron**: 负责用户界面、文件选择、系统交互
- **Python**: 负责核心业务逻辑（Excel处理、图片匹配）

### Apple Silicon 支持

在 macOS Apple Silicon (M系列芯片) 环境下，应用会自动使用 arm64 架构的 Python 以确保与依赖库（如 Pillow）的兼容性。

## 更新日志

### v1.0.3
- 重新设计进度条组件，采用平滑渐变动画
- 添加细粒度阶段划分（9个阶段）
- 实时进度同步，支持 shimmer 效果
- 优化进度显示与百分比的一致性

### v1.0.2
- 修复 Electron 应用处理成功率低的问题（9.9% → 99%+）
- 修复 Python 子进程 stdin 被父进程继承导致的 RAR 文件读取失败
- 添加 `spawn()` 的 `stdio: ['ignore', 'pipe', 'pipe']` 配置
- 移除 Python 路径硬编码，支持跨平台智能选择
- 添加 PYTHON_PATH 环境变量支持
- 改进 Python 模块导入机制，提高稳定性
- 日志时间调整为北京时间（+08:00）
- 日志系统改为覆盖写入模式（每次启动覆盖旧日志）

### v1.0.1
- 修复 Apple Silicon (M系列芯片) 架构兼容性问题
- 优化处理完成后的页面跳转逻辑

### v1.0.0
- 初始版本发布
- 支持自动更新功能
