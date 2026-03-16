# GUI 性能基准测试文档

> **版本**: v1.0  
> **创建日期**: 2026-03-08  
> **状态**: 待执行  
> **测试范围**: GUI 重设计项目 (v1.0.30+)  
> **性能目标**: 达到或超过商业桌面应用标准

---

## 目录

1. [执行摘要](#执行摘要)
2. [性能指标体系](#性能指标体系)
3. [测试工具与环境](#测试工具与环境)
4. [详细测试流程](#详细测试流程)
5. [基准测试脚本](#基准测试脚本)
6. [性能优化建议](#性能优化建议)
7. [CI/CD 集成](#ci/cd-集成)
8. [性能监控与报告](#性能监控与报告)

---

## 执行摘要

### 背景

ImageAutoInserter GUI 版本需要在保证功能完整性的同时，提供流畅、高效的用户体验。本性能基准测试旨在建立可量化的性能标准，确保应用在不同环境和负载下都能保持优秀表现。

### 测试目标

1. **建立基线**: 测量当前性能表现作为基准
2. **验证目标**: 确保达到设计规格中的性能要求
3. **发现瓶颈**: 识别性能热点和优化机会
4. **持续监控**: 建立自动化性能回归检测机制

### 关键性能指标 (KPI)

| 类别 | 指标 | 目标值 | 优先级 |
|------|------|--------|--------|
| 启动性能 | 冷启动时间 | < 3 秒 | P0 |
| 启动性能 | 首屏渲染时间 | < 1 秒 | P0 |
| 启动性能 | 主进程就绪时间 | < 500 毫秒 | P1 |
| 运行时性能 | UI 响应时间 | < 100 毫秒 | P0 |
| 运行时性能 | 进度更新帧率 | 60 FPS | P1 |
| 运行时性能 | 内存占用 | < 200 MB | P1 |
| 运行时性能 | CPU 占用率 | < 30% | P2 |
| 处理性能 | Excel 读取速度 | < 1 秒/1000 行 | P0 |
| 处理性能 | 图片匹配速度 | < 0.1 秒/图片 | P0 |
| 处理性能 | 嵌入处理速度 | < 0.5 秒/图片 | P1 |
| 打包性能 | Windows 包大小 | < 100 MB | P2 |
| 打包性能 | macOS 包大小 | < 100 MB | P2 |
| 打包性能 | 安装时间 | < 30 秒 | P3 |

---

## 性能指标体系

### 1. 启动性能 (Startup Performance)

#### 1.1 冷启动时间 (Cold Start Time)

**定义**: 从用户点击应用图标到主窗口完全可见并可交互的时间。

**测量方法**:
```javascript
// 主进程记录启动时间戳
const appStartTime = Date.now();

// 主窗口加载完成后计算
app.whenReady().then(() => {
  const mainWindow = new BrowserWindow({ /* config */ });
  mainWindow.loadURL(APP_URL);
  
  mainWindow.once('ready-to-show', () => {
    const coldStartTime = Date.now() - appStartTime;
    console.log(`Cold Start Time: ${coldStartTime}ms`);
  });
});
```

**目标**: < 3000ms (3 秒)

**影响因素**:
- Electron 初始化时间
- React 应用 bundle 加载时间
- 首屏组件渲染时间
- 系统资源可用性

**优化策略**:
- 启用 V8 代码缓存
- 使用 lazy loading 加载非关键资源
- 预加载关键资源
- 减少初始 bundle 大小

---

#### 1.2 首屏渲染时间 (First Screen Render Time)

**定义**: 从应用启动到用户看到第一个有意义的界面内容的时间。

**测量方法**:
```javascript
// 使用 Performance API
window.addEventListener('load', () => {
  const perfData = performance.getEntriesByType('navigation')[0];
  const firstScreenTime = perfData.loadEventEnd - perfData.startTime;
  console.log(`First Screen Render: ${firstScreenTime}ms`);
});
```

**目标**: < 1000ms (1 秒)

**影响因素**:
- HTML/CSS 解析时间
- 关键 CSS 加载时间
- 首屏组件渲染时间
- 图片加载时间

**优化策略**:
- 内联关键 CSS
- 使用 CSS 压缩
- 延迟加载非首屏图片
- 使用 React.lazy() 拆分组件

---

#### 1.3 主进程就绪时间 (Main Process Ready Time)

**定义**: 从 Electron 启动到主进程完成初始化并可响应 IPC 请求的时间。

**测量方法**:
```javascript
// 主进程
const mainProcessStart = Date.now();

app.whenReady().then(() => {
  const mainProcessReadyTime = Date.now() - mainProcessStart;
  console.log(`Main Process Ready: ${mainProcessReadyTime}ms`);
  
  // 发送性能数据到渲染进程
  mainWindow.webContents.send('performance-data', {
    mainProcessReadyTime
  });
});
```

**目标**: < 500ms

**影响因素**:
- Node.js 模块加载时间
- 数据库初始化时间
- 配置文件读取时间
- IPC 通道设置时间

**优化策略**:
- 延迟加载非关键模块
- 使用模块打包工具优化 require
- 缓存配置数据
- 并行初始化独立模块

---

### 2. 运行时性能 (Runtime Performance)

#### 2.1 UI 响应时间 (UI Response Time)

**定义**: 从用户触发交互（点击、输入等）到界面产生视觉反馈的时间。

**测量方法**:
```javascript
// 使用 Performance API 测量交互延迟
function measureUIResponse(element, action) {
  const startTime = performance.now();
  
  element.addEventListener(action, () => {
    requestAnimationFrame(() => {
      const responseTime = performance.now() - startTime;
      console.log(`${action} Response Time: ${responseTime.toFixed(2)}ms`);
    });
  });
}

// 示例：测量按钮点击响应
measureUIResponse(document.querySelector('#start-btn'), 'click');
```

**目标**: < 100ms

**影响因素**:
- JavaScript 执行时间
- DOM 操作复杂度
- CSS 重绘/重排
- 事件处理逻辑复杂度

**优化策略**:
- 使用 React.memo() 优化组件重渲染
- 使用 useMemo() 缓存计算结果
- 使用 useCallback() 避免函数重复创建
- 防抖/节流高频事件

---

#### 2.2 进度更新帧率 (Progress Update FPS)

**定义**: 处理过程中进度条和状态更新的流畅度（每秒帧数）。

**测量方法**:
```javascript
// 使用 requestAnimationFrame 测量 FPS
let frameCount = 0;
let lastTime = performance.now();
let fps = 0;

function measureFPS() {
  frameCount++;
  const currentTime = performance.now();
  
  if (currentTime - lastTime >= 1000) {
    fps = frameCount;
    console.log(`Current FPS: ${fps}`);
    frameCount = 0;
    lastTime = currentTime;
  }
  
  requestAnimationFrame(measureFPS);
}

measureFPS();
```

**目标**: 60 FPS (允许波动范围：55-60 FPS)

**影响因素**:
- 进度更新频率
- DOM 更新复杂度
- 动画实现方式
- 主线程阻塞情况

**优化策略**:
- 使用 CSS transform 而非 top/left 动画
- 使用 will-change 提示浏览器优化
- 降低进度更新频率（如每 100ms 更新一次）
- 将密集计算移到 Web Worker

---

#### 2.3 内存占用 (Memory Usage)

**定义**: 应用运行时占用的系统内存（堆内存）。

**测量方法**:
```javascript
// 渲染进程
function measureMemory() {
  if (performance.memory) {
    const usedJSHeapSize = performance.memory.usedJSHeapSize / 1048576; // MB
    const totalJSHeapSize = performance.memory.totalJSHeapSize / 1048576; // MB
    
    console.log(`Memory Usage: ${usedJSHeapSize.toFixed(2)} MB / ${totalJSHeapSize.toFixed(2)} MB`);
    return usedJSHeapSize;
  }
}

// 定期监控（每 5 秒）
setInterval(measureMemory, 5000);
```

**目标**: < 200 MB (空闲状态 < 100 MB，处理峰值 < 200 MB)

**影响因素**:
- JavaScript 对象分配
- DOM 节点数量
- 图片缓存大小
- 事件监听器泄漏

**影响因素**:
- JavaScript 对象分配
- DOM 节点数量
- 图片缓存大小
- 事件监听器泄漏

**优化策略**:
- 及时清理定时器（clearInterval/clearTimeout）
- 移除不再需要的事件监听器
- 使用 WeakMap/WeakSet 存储临时引用
- 避免全局变量积累数据
- 图片使用后释放（URL.revokeObjectURL）

---

#### 2.4 CPU 占用率 (CPU Usage)

**定义**: 应用运行时占用的 CPU 资源百分比。

**测量方法**:
```javascript
// Node.js 主进程
const os = require('os');

function measureCPUUsage() {
  const startUsage = process.cpuUsage();
  const startSys = os.totalmem() - os.freemem();
  
  setTimeout(() => {
    const endUsage = process.cpuUsage(startUsage);
    const cpuPercent = ((endUsage.user + endUsage.system) / 5000) * 100;
    
    console.log(`CPU Usage: ${cpuPercent.toFixed(2)}%`);
  }, 100);
}

measureCPUUsage();
```

**目标**: < 30% (空闲状态 < 10%，处理峰值 < 30%)

**影响因素**:
- JavaScript 执行复杂度
- 图片处理算法效率
- 文件 I/O 频率
- 渲染更新频率

**优化策略**:
- 使用 Web Worker 处理密集计算
- 优化图片匹配算法
- 批量处理文件 I/O
- 使用原生模块替代 JS 实现

---

### 3. 处理性能 (Processing Performance)

#### 3.1 Excel 读取速度 (Excel Read Speed)

**定义**: 读取 Excel 文件并解析为内部数据结构的平均速度。

**测量方法**:
```javascript
// 使用 performance.now() 精确测量
async function measureExcelRead(filePath) {
  const startTime = performance.now();
  
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  const rowsPerSecond = data.length / (duration / 1000);
  
  console.log(`Excel Read: ${duration.toFixed(2)}ms (${data.length} rows, ${rowsPerSecond.toFixed(0)} rows/s)`);
  
  return { duration, rowCount: data.length };
}
```

**目标**: < 1 秒/1000 行 (即 1000 行/秒)

**影响因素**:
- Excel 文件大小
- 数据格式复杂度
- 解析库性能
- 系统 I/O 速度

**优化策略**:
- 使用流式解析大文件
- 只读取必要的工作表和列
- 缓存已解析数据
- 使用二进制模式读取文件

---

#### 3.2 图片匹配速度 (Image Matching Speed)

**定义**: 将图片文件名与 Excel 数据行匹配的平均时间。

**测量方法**:
```javascript
async function measureImageMatching(images, excelData) {
  const startTime = performance.now();
  
  const matches = images.map(img => {
    const imageName = path.basename(img, path.extname(img));
    return excelData.find(row => 
      row['商品名称']?.includes(imageName) ||
      row['SKU']?.includes(imageName)
    );
  });
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  const timePerImage = duration / images.length;
  
  console.log(`Image Matching: ${duration.toFixed(2)}ms total, ${timePerImage.toFixed(2)}ms/image`);
  
  return { duration, matches };
}
```

**目标**: < 0.1 秒/图片 (100ms/image)

**影响因素**:
- 图片数量
- Excel 数据量
- 匹配算法复杂度
- 文件名规范化处理

**优化策略**:
- 使用 Map/Set 优化查找（O(1) vs O(n)）
- 预处理文件名建立索引
- 并行处理多个匹配
- 使用正则表达式缓存

---

#### 3.3 嵌入处理速度 (Image Embedding Speed)

**定义**: 将图片嵌入 Excel 单元格的平均时间（包括图片加载、缩放、插入）。

**测量方法**:
```javascript
async function measureImageEmbedding(imagePath, worksheet, cell) {
  const startTime = performance.now();
  
  // 读取图片
  const imageBuffer = fs.readFileSync(imagePath);
  
  // 添加图片到工作表
  const imageId = worksheet.addImage({
    buffer: imageBuffer,
    extensions: ['png', 'jpg'],
    position: {
      tl: { col: cell.col, row: cell.row, colOff: 0, rowOff: 0 },
      ext: { width: 100 * 9525, height: 100 * 9525 }
    }
  });
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log(`Image Embedding: ${duration.toFixed(2)}ms`);
  
  return duration;
}
```

**目标**: < 0.5 秒/图片 (500ms/image)

**影响因素**:
- 图片文件大小
- 图片格式（PNG/JPG/WebP）
- 图片缩放处理
- Excel 库性能

**优化策略**:
- 预压缩图片到合适尺寸
- 使用高效的图片格式（WebP）
- 批量写入而非逐个插入
- 使用图片缓存避免重复读取

---

### 4. 打包性能 (Package Performance)

#### 4.1 安装包大小 (Package Size)

**定义**: 最终分发给用户的安装包文件大小。

**测量方法**:
```bash
# macOS
ls -lh dist/*.dmg

# Windows
dir dist\*.exe

# 记录并比较不同版本
echo "$(date): $(stat -f%z dist/ImageAutoInserter-1.0.30.dmg) bytes" >> package-size.log
```

**目标**: 
- Windows: < 100 MB
- macOS: < 100 MB

**影响因素**:
- Electron 运行时大小
- Node 模块依赖
- 资源文件（图片、字体）
- 代码压缩程度

**优化策略**:
- 使用 asar 打包压缩
- 移除未使用的 Node 模块
- 压缩静态资源
- 使用模块树摇（tree-shaking）

---

#### 4.2 安装时间 (Installation Time)

**定义**: 从开始安装到安装完成可使用的时间。

**测量方法**:
```bash
# 使用 time 命令测量
time ./ImageAutoInserter-1.0.30.exe /SILENT  # Windows
time hdiutil attach ImageAutoInserter-1.0.30.dmg  # macOS
```

**目标**: < 30 秒

**影响因素**:
- 安装包大小
- 解压速度
- 文件复制数量
- 系统 I/O 性能

**优化策略**:
- 减少安装包体积
- 优化安装流程
- 使用增量更新
- 预编译原生模块

---

## 测试工具与环境

### 1. 浏览器开发工具

#### 1.1 Chrome DevTools

**适用场景**: 渲染进程性能分析

**核心面板**:

**Performance 面板**:
```
功能:
- FPS 监控
- CPU 使用率火焰图
- 帧详情（Frame Details）
- 网络请求瀑布图
- 主线程活动记录

使用步骤:
1. 打开 DevTools (F12)
2. 选择 Performance 面板
3. 点击录制按钮 (●)
4. 执行测试操作
5. 停止录制并分析
```

**关键指标**:
- Green frames: 良好（60 FPS）
- Yellow frames: 警告（< 60 FPS）
- Red frames: 问题（< 30 FPS）

**Memory 面板**:
```
功能:
- Heap Snapshot（堆快照）
- Allocation timeline（分配时间线）
- Allocation sampling（分配采样）

使用场景:
- 检测内存泄漏
- 分析内存分配热点
- 对比不同时间点内存状态
```

**Lighthouse 面板**:
```
功能:
- 性能评分（0-100）
- 首屏加载时间
- 可交互时间（TTI）
- 总阻塞时间（TBT）

使用步骤:
1. 选择 Lighthouse 面板
2. 选择测试类别（Performance）
3. 选择设备类型（Desktop）
4. 点击"生成报告"
```

---

#### 1.2 Electron DevTools

**适用场景**: Electron 应用专用调试

**安装方法**:
```bash
npm install --save-dev electron-devtools-installer
```

**使用代码**:
```javascript
const { default: installExtension, REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS } = require('electron-devtools-installer');

app.whenReady().then(() => {
  installExtension(REACT_DEVELOPER_TOOLS)
    .then((name) => console.log(`Added Extension: ${name}`))
    .catch((err) => console.log('An error occurred: ', err));
});
```

**专用工具**:
- **Electron Inspector**: 调试主进程和渲染进程
- **Spectron**: Electron 应用自动化测试框架
- **Electron Fiddle**: 快速原型和测试

---

### 2. 系统监控工具

#### 2.1 macOS 工具

**Activity Monitor (活动监视器)**:
```
打开方式:
- Spotlight: 搜索 "Activity Monitor"
- 命令行: open -a "Activity Monitor"

监控指标:
- CPU %: 实时 CPU 使用率
- Memory: 内存占用（MB）
- Energy Impact: 能耗影响
- Disk: 磁盘读写

使用技巧:
1. 搜索进程名 "ImageAutoInserter" 或 "Electron"
2. 双击进程查看详细图表
3. 使用"窗口" > "CPU 使用率" 开启悬浮窗
```

**Instruments**:
```
打开方式:
- Xcode > Open Developer Tool > Instruments
- 命令行: open -a Instruments

常用模板:
- Activity Monitor: 系统资源监控
- Allocations: 内存分配分析
- Leaks: 内存泄漏检测
- Time Profiler: CPU 时间分析
- Energy Log: 能耗分析

使用步骤:
1. 选择模板（如 Allocations）
2. 选择目标应用
3. 点击录制按钮
4. 执行测试场景
5. 停止并分析数据
```

**htop (命令行)**:
```bash
# 安装
brew install htop

# 运行
htop

# 过滤进程
htop -p $(pgrep -f ImageAutoInserter)

# 关键列:
# CPU%: CPU 使用率
# MEM%: 内存使用率
# MEM RES: 常驻内存（MB）
```

** Instruments - Time Profiler 示例**:
```
测试场景：启动性能分析

步骤:
1. 打开 Instruments，选择 "Time Profiler" 模板
2. 在目标应用列表中选择 ImageAutoInserter
3. 点击录制按钮，同时启动应用
4. 等待应用完全加载
5. 停止录制

分析重点:
- Main Thread: 主线程阻塞时间
- Heavy Weight Events: 耗时事件
- Call Tree: 函数调用栈热点
```

---

#### 2.2 Windows 工具

**Task Manager (任务管理器)**:
```
打开方式:
- 快捷键: Ctrl + Shift + Esc
- 右键任务栏 > 任务管理器

监控指标:
- CPU: CPU 使用率
- Memory: 内存占用
- Disk: 磁盘活动
- GPU: GPU 使用率

使用技巧:
1. 切换到"详细信息"选项卡
2. 找到 ImageAutoInserter.exe
3. 右键 > 设置相关性（限制 CPU 核心）
4. 查看"性能"选项卡实时图表
```

**Windows Performance Analyzer (WPA)**:
```
安装:
- Windows Performance Toolkit (Windows SDK 的一部分)

使用步骤:
1. 使用 Windows Performance Recorder 录制
2. 运行测试场景
3. 停止录制生成 .etl 文件
4. 用 WPA 打开 .etl 文件分析

分析重点:
- CPU Usage: CPU 使用率时间线
- Disk I/O: 磁盘活动
- Context Switches: 上下文切换
```

**Process Explorer**:
```
下载:
https://docs.microsoft.com/en-us/sysinternals/downloads/process-explorer

功能:
- 详细进程信息
- DLL 和句柄查看
- CPU/内存/磁盘/网络监控
- 进程树查看

使用场景:
- 深度分析进程资源使用
- 检测文件/注册表访问
- 查找内存泄漏
```

---

#### 2.3 跨平台工具

**Visual Studio Code Performance Profiler**:
```
扩展:
- Electron Performance Profiler
- Chrome DevTools Protocol

使用方式:
1. 安装扩展
2. 启动应用调试模式
3. 连接性能分析器
4. 录制并分析
```

**WebPageTest (在线)**:
```
网址: https://www.webpagetest.org

功能:
- 多地点测试
- 多浏览器测试
- 网络 throttling
- 瀑布图分析

适用场景:
- 测试 Electron 应用的 Web 部分
- 对比不同网络条件下的性能
```

---

### 3. 专业性能分析工具

#### 3.1 内存分析

**YourKit (商业)**:
```
支持: Node.js, Java, .NET

功能:
- CPU 采样
- 内存分析
- 异常检测
- 数据库分析

价格: $399 (商业许可)

使用示例:
node --inspect app.js
yourkit-nodejs 连接调试端口
```

**dotTrace (JetBrains)**:
```
支持: .NET, Node.js

功能:
- 时间线分析
- 内存快照
- 数据库分析
- ASP.NET 分析

价格: $199 (商业许可)
```

**Chrome DevTools Memory Panel (免费)**:
```
功能:
- Heap Snapshot
- Allocation timeline
- Allocation sampling

使用技巧:
1. 多次拍摄快照对比
2. 按构造函数排序查找泄漏
3. 使用"Summary"视图分析对象分布
```

---

#### 3.2 CPU 分析

**perf (Linux)**:
```bash
# 安装
sudo apt install linux-tools-common

# 录制
perf record -g -p <PID>

# 分析
perf report
```

**Xcode Instruments (macOS)**:
```
模板:
- Time Profiler
- CPU Counters
- Energy Log
```

**Windows Performance Toolkit**:
```
工具:
- xperf (命令行)
- WPA (图形界面)

示例:
xperf -on PROC_THREAD+LOADER -buffersize 1024
# 执行测试
xperf -d trace.etl
```

---

#### 3.3 网络分析

**Charles Proxy (商业)**:
```
功能:
- HTTP/HTTPS 代理
- 请求/响应查看
- 带宽 throttling
- 断点调试

价格: $50 (个人许可)
```

**Wireshark (免费)**:
```
功能:
- 深度包分析
- 协议解析
- 流量统计
- 过滤规则

使用场景:
- 分析 Electron 应用网络请求
- 检测 IPC 通信
```

---

## 详细测试流程

### 测试 1: 启动时间测试

#### 目标
测量应用从启动到完全可用的时间，确保冷启动 < 3 秒。

#### 环境准备
```bash
# 清理之前的实例
killall ImageAutoInserter 2>/dev/null || true

# 清除缓存
rm -rf ~/Library/Application\ Support/ImageAutoInserter/Cache
```

#### 测试脚本
```bash
#!/bin/bash
# 文件：scripts/benchmark-startup.sh

echo "=== 启动性能基准测试 ==="
echo "测试次数：10 次"
echo "目标：冷启动 < 3 秒"
echo ""

RESULTS=()

for i in {1..10}; do
  echo "第 $i 次测试..."
  
  # 清理缓存（确保冷启动）
  rm -rf ~/Library/Application\ Support/ImageAutoInserter/Cache 2>/dev/null
  
  # 记录开始时间
  START_TIME=$(date +%s%N)
  
  # 启动应用
  ./dist/mac/ImageAutoInserter.app/Contents/MacOS/ImageAutoInserter &
  APP_PID=$!
  
  # 等待窗口出现（使用 AppleScript）
  sleep 2
  while ! osascript -e 'tell application "System Events" to count windows of process "ImageAutoInserter"' 2>/dev/null | grep -q '[1-9]'; do
    sleep 0.5
  done
  
  # 记录结束时间
  END_TIME=$(date +%s%N)
  
  # 计算耗时（毫秒）
  DURATION=$(( (END_TIME - START_TIME) / 1000000 ))
  RESULTS+=($DURATION)
  
  echo "  启动时间：${DURATION}ms"
  
  # 关闭应用
  kill $APP_PID 2>/dev/null
  wait $APP_PID 2>/dev/null
  
  sleep 1
done

# 计算统计数据
SUM=0
MIN=${RESULTS[0]}
MAX=${RESULTS[0]}

for result in "${RESULTS[@]}"; do
  SUM=$((SUM + result))
  [ $result -lt $MIN ] && MIN=$result
  [ $result -gt $MAX ] && MAX=$result
done

AVG=$((SUM / ${#RESULTS[@]}))

echo ""
echo "=== 测试结果 ==="
echo "平均启动时间：${AVG}ms"
echo "最快：${MIN}ms"
echo "最慢：${MAX}ms"
echo "目标：< 3000ms"

if [ $AVG -lt 3000 ]; then
  echo "✅ 通过"
else
  echo "❌ 未通过"
fi

# 保存结果到文件
echo "$(date +%Y-%m-%d_%H:%M:%S),${AVG},${MIN},${MAX}" >> results/startup-benchmark.csv
```

#### 执行测试
```bash
chmod +x scripts/benchmark-startup.sh
./scripts/benchmark-startup.sh
```

#### 预期输出
```
=== 启动性能基准测试 ===
测试次数：10 次
目标：冷启动 < 3 秒

第 1 次测试...
  启动时间：2847ms
第 2 次测试...
  启动时间：2653ms
...

=== 测试结果 ===
平均启动时间：2734ms
最快：2512ms
最慢：2981ms
目标：< 3000ms
✅ 通过
```

---

### 测试 2: 内存泄漏测试

#### 目标
检测应用在长时间运行和重复操作后是否存在内存泄漏。

#### 测试脚本 (JavaScript)
```javascript
// 文件：scripts/benchmark-memory.js
const { app, BrowserWindow } = require('electron');
const fs = require('fs');

let mainWindow;
let memoryLog = [];

function logMemory() {
  const memoryData = {
    timestamp: Date.now(),
    rss: process.memoryUsage().rss / 1048576, // MB
    heapTotal: process.memoryUsage().heapTotal / 1048576, // MB
    heapUsed: process.memoryUsage().heapUsed / 1048576, // MB
    external: process.memoryUsage().external / 1048576 // MB
  };
  
  memoryLog.push(memoryData);
  
  console.log(
    `[${new Date().toISOString()}] ` +
    `RSS: ${memoryData.rss.toFixed(2)} MB | ` +
    `Heap: ${memoryData.heapUsed.toFixed(2)} MB`
  );
  
  // 保存日志
  fs.writeFileSync(
    'results/memory-benchmark.json',
    JSON.stringify(memoryLog, null, 2)
  );
}

// 模拟用户操作（100 次迭代）
async function simulateUserActions() {
  for (let i = 0; i < 100; i++) {
    // 模拟文件选择
    mainWindow.webContents.send('simulate-file-select');
    await sleep(100);
    
    // 模拟开始处理
    mainWindow.webContents.send('simulate-start-processing');
    await sleep(500);
    
    // 模拟完成
    mainWindow.webContents.send('simulate-complete');
    await sleep(200);
    
    // 每 10 次记录内存
    if (i % 10 === 0) {
      logMemory();
      // 强制垃圾回收（如果启用）
      if (global.gc) {
        global.gc();
        await sleep(100);
      }
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.whenReady().then(async () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  mainWindow.loadFile('index.html');
  
  // 初始内存记录
  console.log('=== 内存泄漏测试开始 ===');
  logMemory();
  
  // 等待应用加载
  await sleep(2000);
  
  // 执行测试
  await simulateUserActions();
  
  // 最终内存记录
  logMemory();
  
  // 分析结果
  const initialMemory = memoryLog[0].heapUsed;
  const finalMemory = memoryLog[memoryLog.length - 1].heapUsed;
  const growth = finalMemory - initialMemory;
  const growthPercent = ((growth / initialMemory) * 100).toFixed(2);
  
  console.log('\n=== 测试结果 ===');
  console.log(`初始内存：${initialMemory.toFixed(2)} MB`);
  console.log(`最终内存：${finalMemory.toFixed(2)} MB`);
  console.log(`内存增长：${growth.toFixed(2)} MB (${growthPercent}%)`);
  
  if (growthPercent < 20) {
    console.log('✅ 无明显内存泄漏');
  } else {
    console.log('❌ 可能存在内存泄漏');
  }
  
  app.quit();
});
```

#### 执行测试
```bash
# 启用垃圾回收暴露
node --expose-gc scripts/benchmark-memory.js
```

#### 预期输出
```
=== 内存泄漏测试开始 ===
[2026-03-08T10:00:00.000Z] RSS: 145.23 MB | Heap: 89.45 MB
[2026-03-08T10:00:10.000Z] RSS: 148.67 MB | Heap: 91.23 MB
...
[2026-03-08T10:05:00.000Z] RSS: 152.34 MB | Heap: 93.12 MB

=== 测试结果 ===
初始内存：89.45 MB
最终内存：93.12 MB
内存增长：3.67 MB (4.10%)
✅ 无明显内存泄漏
```

---

### 测试 3: 动画流畅度测试

#### 目标
验证进度条动画和 UI 过渡的流畅度，确保达到 60 FPS。

#### 测试脚本 (JavaScript)
```javascript
// 文件：scripts/benchmark-fps.js

class FPSMonitor {
  constructor() {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fpsHistory = [];
    this.isRunning = false;
  }
  
  start() {
    this.isRunning = true;
    this.tick();
  }
  
  stop() {
    this.isRunning = false;
  }
  
  tick() {
    if (!this.isRunning) return;
    
    this.frameCount++;
    const currentTime = performance.now();
    
    // 每秒记录一次 FPS
    if (currentTime - this.lastTime >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
      this.fpsHistory.push(fps);
      
      console.log(`FPS: ${fps}`);
      
      this.frameCount = 0;
      this.lastTime = currentTime;
    }
    
    requestAnimationFrame(() => this.tick());
  }
  
  getStats() {
    if (this.fpsHistory.length === 0) return null;
    
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    const avg = sum / this.fpsHistory.length;
    const min = Math.min(...this.fpsHistory);
    const max = Math.max(...this.fpsHistory);
    
    return { avg, min, max, samples: this.fpsHistory.length };
  }
}

// 测试进度条动画
async function testProgressBarAnimation() {
  const monitor = new FPSMonitor();
  
  console.log('=== 动画流畅度测试 ===');
  console.log('模拟进度条从 0% 到 100%...\n');
  
  // 开始监控
  monitor.start();
  
  // 模拟进度更新（每 100ms 更新一次）
  const progressBar = document.querySelector('#progress-bar');
  
  for (let i = 0; i <= 100; i++) {
    progressBar.style.width = `${i}%`;
    progressBar.textContent = `${i}%`;
    await sleep(100);
  }
  
  // 停止监控
  monitor.stop();
  
  // 分析结果
  const stats = monitor.getStats();
  
  console.log('\n=== 测试结果 ===');
  console.log(`平均 FPS: ${stats.avg}`);
  console.log(`最低 FPS: ${stats.min}`);
  console.log(`最高 FPS: ${stats.max}`);
  console.log(`采样次数：${stats.samples}`);
  
  if (stats.avg >= 55) {
    console.log('✅ 动画流畅（≥ 55 FPS）');
  } else if (stats.avg >= 30) {
    console.log('⚠️  动画可接受（≥ 30 FPS）');
  } else {
    console.log('❌ 动画卡顿（< 30 FPS）');
  }
  
  // 保存结果
  const result = {
    timestamp: Date.now(),
    test: 'animation-fps',
    ...stats
  };
  
  fs.writeFileSync(
    'results/fps-benchmark.json',
    JSON.stringify(result, null, 2)
  );
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 等待页面加载完成后执行
window.addEventListener('load', () => {
  setTimeout(testProgressBarAnimation, 1000);
});
```

#### 执行测试
```bash
# 在应用运行时，通过 DevTools Console 执行
# 或集成到测试页面中
```

#### 预期输出
```
=== 动画流畅度测试 ===
模拟进度条从 0% 到 100%...

FPS: 60
FPS: 60
FPS: 59
FPS: 60
...

=== 测试结果 ===
平均 FPS: 59.8
最低 FPS: 57
最高 FPS: 60
采样次数：10
✅ 动画流畅（≥ 55 FPS）
```

---

## 基准测试脚本

### 1. Electron 主进程基准脚本

```javascript
// 文件：scripts/electron-benchmark.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

class PerformanceBenchmark {
  constructor() {
    this.mainWindow = null;
    this.results = {
      startup: {},
      runtime: {},
      processing: {}
    };
    this.appStartTime = Date.now();
  }
  
  async run() {
    await app.whenReady();
    
    // 1. 启动性能测试
    await this.testStartupPerformance();
    
    // 2. 运行时性能测试
    await this.testRuntimePerformance();
    
    // 3. 处理性能测试
    await this.testProcessingPerformance();
    
    // 4. 生成报告
    this.generateReport();
    
    app.quit();
  }
  
  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      }
    });
    
    this.mainWindow.loadFile('index.html');
    
    return new Promise(resolve => {
      this.mainWindow.once('ready-to-show', () => {
        this.mainWindow.show();
        resolve();
      });
    });
  }
  
  async testStartupPerformance() {
    console.log('\n=== 启动性能测试 ===');
    
    const mainProcessReadyTime = Date.now() - this.appStartTime;
    console.log(`主进程就绪时间：${mainProcessReadyTime}ms`);
    
    await this.createWindow();
    
    const firstScreenTime = Date.now() - this.appStartTime;
    console.log(`首屏渲染时间：${firstScreenTime}ms`);
    
    const coldStartTime = Date.now() - this.appStartTime;
    console.log(`冷启动时间：${coldStartTime}ms`);
    
    this.results.startup = {
      mainProcessReadyTime,
      firstScreenTime,
      coldStartTime,
      timestamp: Date.now()
    };
    
    // 验证是否达标
    this.validateStartup(coldStartTime, firstScreenTime, mainProcessReadyTime);
  }
  
  async testRuntimePerformance() {
    console.log('\n=== 运行时性能测试 ===');
    
    // 测量内存
    const memoryUsage = process.memoryUsage();
    const memoryMB = {
      rss: memoryUsage.rss / 1048576,
      heapUsed: memoryUsage.heapUsed / 1048576
    };
    
    console.log(`内存占用：RSS=${memoryMB.rss.toFixed(2)}MB, Heap=${memoryMB.heapUsed.toFixed(2)}MB`);
    
    // 测量 UI 响应时间
    const uiResponseTime = await this.measureUIResponse();
    console.log(`UI 响应时间：${uiResponseTime}ms`);
    
    this.results.runtime = {
      memory: memoryMB,
      uiResponseTime,
      timestamp: Date.now()
    };
  }
  
  async measureUIResponse() {
    return new Promise(resolve => {
      const startTime = Date.now();
      
      // 模拟点击事件
      this.mainWindow.webContents.executeJavaScript(`
        new Promise((resolve) => {
          const btn = document.querySelector('#test-btn');
          if (btn) {
            btn.click();
            requestAnimationFrame(() => resolve(performance.now()));
          } else {
            resolve(0);
          }
        })
      `).then(frameTime => {
        const responseTime = Date.now() - startTime;
        resolve(responseTime);
      });
    });
  }
  
  async testProcessingPerformance() {
    console.log('\n=== 处理性能测试 ===');
    
    // 模拟 Excel 读取
    const excelReadTime = await this.simulateExcelRead();
    console.log(`Excel 读取时间：${excelReadTime}ms/1000 行`);
    
    // 模拟图片匹配
    const matchTime = await this.simulateImageMatching();
    console.log(`图片匹配时间：${matchTime}ms/图片`);
    
    // 模拟图片嵌入
    const embedTime = await this.simulateImageEmbedding();
    console.log(`图片嵌入时间：${embedTime}ms/图片`);
    
    this.results.processing = {
      excelReadTime,
      imageMatchingTime: matchTime,
      imageEmbeddingTime: embedTime,
      timestamp: Date.now()
    };
  }
  
  async simulateExcelRead() {
    // 模拟读取 1000 行 Excel 数据
    await new Promise(resolve => setTimeout(resolve, 50));
    return 50; // 模拟值
  }
  
  async simulateImageMatching() {
    // 模拟单张图片匹配
    await new Promise(resolve => setTimeout(resolve, 10));
    return 10; // 模拟值
  }
  
  async simulateImageEmbedding() {
    // 模拟单张图片嵌入
    await new Promise(resolve => setTimeout(resolve, 200));
    return 200; // 模拟值
  }
  
  validateStartup(coldStart, firstScreen, mainProcess) {
    console.log('\n=== 启动性能验证 ===');
    
    const checks = [
      { name: '冷启动时间', value: coldStart, target: 3000 },
      { name: '首屏渲染', value: firstScreen, target: 1000 },
      { name: '主进程就绪', value: mainProcess, target: 500 }
    ];
    
    let allPassed = true;
    
    checks.forEach(check => {
      const passed = check.value < check.target;
      const status = passed ? '✅' : '❌';
      console.log(`${status} ${check.name}: ${check.value}ms (目标：< ${check.target}ms)`);
      
      if (!passed) allPassed = false;
    });
    
    console.log(allPassed ? '\n✅ 所有启动性能指标达标' : '\n❌ 部分性能指标未达标');
  }
  
  generateReport() {
    const report = {
      version: app.getVersion(),
      timestamp: new Date().toISOString(),
      platform: process.platform,
      ...this.results
    };
    
    // 保存 JSON 报告
    const reportPath = path.join(__dirname, '..', 'results', 'performance-benchmark.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📊 性能报告已保存到：${reportPath}`);
  }
}

// 运行基准测试
const benchmark = new PerformanceBenchmark();
benchmark.run().catch(console.error);
```

---

### 2. 渲染进程性能监控脚本

```javascript
// 文件：src/utils/performance-monitor.js

/**
 * 性能监控工具类
 * 用于在渲染进程中收集和分析性能数据
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.observers = [];
    this.isMonitoring = false;
  }
  
  /**
   * 启动性能监控
   * @param {Object} options - 监控选项
   * @param {number} options.interval - 数据收集间隔（毫秒）
   * @param {boolean} options.logToConsole - 是否输出到控制台
   */
  start(options = {}) {
    const { interval = 5000, logToConsole = true } = options;
    
    this.isMonitoring = true;
    
    // 监控内存
    if (logToConsole) {
      setInterval(() => this.logMemoryUsage(), interval);
    }
    
    // 监控 FPS
    this.startFPSMonitor();
    
    console.log('🔍 性能监控已启动');
  }
  
  /**
   * 记录内存使用情况
   */
  logMemoryUsage() {
    if (performance.memory) {
      const memory = {
        usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2),
        totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2),
        jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2)
      };
      
      console.log(
        `💾 内存：${memory.usedJSHeapSize} MB / ${memory.totalJSHeapSize} MB ` +
        `(${((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100).toFixed(1)}%)`
      );
      
      this.metrics.memory = memory;
    }
  }
  
  /**
   * 启动 FPS 监控
   */
  startFPSMonitor() {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const measureFPS = () => {
      if (!this.isMonitoring) return;
      
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        console.log(`🎬 FPS: ${fps}`);
        this.metrics.fps = fps;
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }
  
  /**
   * 测量函数执行时间
   * @param {string} name - 性能指标名称
   * @param {Function} fn - 要测量的函数
   * @returns {any} 函数返回值
   */
  measureFunction(name, fn) {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    console.log(`⏱️  ${name}: ${duration.toFixed(2)}ms`);
    
    this.metrics[name] = duration;
    return result;
  }
  
  /**
   * 测量异步函数执行时间
   * @param {string} name - 性能指标名称
   * @param {Function} asyncFn - 要测量的异步函数
   * @returns {Promise<any>} 函数返回值
   */
  async measureAsyncFunction(name, asyncFn) {
    const startTime = performance.now();
    const result = await asyncFn();
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    console.log(`⏱️  ${name}: ${duration.toFixed(2)}ms`);
    
    this.metrics[name] = duration;
    return result;
  }
  
  /**
   * 获取所有性能指标
   * @returns {Object} 性能指标对象
   */
  getMetrics() {
    return { ...this.metrics };
  }
  
  /**
   * 导出性能数据
   * @returns {string} JSON 格式的性能数据
   */
  exportData() {
    return JSON.stringify({
      timestamp: Date.now(),
      ...this.metrics
    }, null, 2);
  }
  
  /**
   * 停止监控
   */
  stop() {
    this.isMonitoring = false;
    console.log('⏹️  性能监控已停止');
  }
}

// 导出单例
export const performanceMonitor = new PerformanceMonitor();

// 使用示例
/*
import { performanceMonitor } from './utils/performance-monitor';

// 启动监控
performanceMonitor.start({ interval: 5000 });

// 测量函数
performanceMonitor.measureFunction('数据处理', () => {
  // 处理逻辑
});

// 测量异步函数
await performanceMonitor.measureAsyncFunction('图片加载', async () => {
  await loadImage();
});

// 获取指标
const metrics = performanceMonitor.getMetrics();
*/
```

---

## 性能优化建议

### 1. 启动优化

#### 1.1 懒加载非关键资源

```javascript
// ❌ 不好的做法：一次性加载所有模块
const excelProcessor = require('./excel-processor');
const imageMatcher = require('./image-matcher');
const zipHandler = require('./zip-handler');
const pdfExporter = require('./pdf-exporter');

// ✅ 好的做法：按需加载
class App {
  async loadModule(name) {
    return await import(`./modules/${name}.js`);
  }
  
  async processExcel() {
    const excelProcessor = await this.loadModule('excel-processor');
    return excelProcessor.process();
  }
}
```

#### 1.2 启用 V8 代码缓存

```javascript
// 主进程配置
app.commandLineAppendSwitch(
  'js-flags',
  '--noopt --trace-opt'
);

// 使用 preload 预加载关键脚本
const mainWindow = new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    sandbox: false
  }
});
```

#### 1.3 代码分割优化

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    }
  }
};
```

---

### 2. 运行时优化

#### 2.1 React 组件优化

```javascript
// ❌ 不好的做法：每次渲染都重新创建对象
function MyComponent({ data }) {
  const style = { color: 'blue', padding: '10px' };
  return <div style={style}>{data}</div>;
}

// ✅ 好的做法：使用 useMemo 缓存
import React, { useMemo } from 'react';

function MyComponent({ data }) {
  const style = useMemo(() => ({ 
    color: 'blue', 
    padding: '10px' 
  }), []);
  
  return <div style={style}>{data}</div>;
}
```

#### 2.2 使用 React.memo 避免不必要重渲染

```javascript
// ❌ 不好的做法：父组件更新时总是重渲染
function ItemList({ items }) {
  return (
    <div>
      {items.map(item => (
        <Item key={item.id} data={item} />
      ))}
    </div>
  );
}

// ✅ 好的做法：使用 React.memo
const Item = React.memo(({ data }) => {
  return <div>{data.name}</div>;
});

function ItemList({ items }) {
  return (
    <div>
      {items.map(item => (
        <Item key={item.id} data={item} />
      ))}
    </div>
  );
}
```

#### 2.3 使用 useCallback 缓存回调函数

```javascript
// ❌ 不好的做法：每次渲染创建新函数
function Parent({ onData }) {
  const handleClick = () => {
    onData('clicked');
  };
  
  return <Child onClick={handleClick} />;
}

// ✅ 好的做法：使用 useCallback
import { useCallback } from 'react';

function Parent({ onData }) {
  const handleClick = useCallback(() => {
    onData('clicked');
  }, [onData]);
  
  return <Child onClick={handleClick} />;
}
```

---

### 3. 内存优化

#### 3.1 及时清理定时器

```javascript
// ❌ 不好的做法：定时器泄漏
class DataProcessor {
  start() {
    this.intervalId = setInterval(() => {
      this.processData();
    }, 1000);
  }
}

// ✅ 好的做法：清理定时器
class DataProcessor {
  start() {
    this.intervalId = setInterval(() => {
      this.processData();
    }, 1000);
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  dispose() {
    this.stop();
  }
}
```

#### 3.2 移除事件监听器

```javascript
// ❌ 不好的做法：事件监听器泄漏
class UIManager {
  init() {
    window.addEventListener('resize', this.handleResize);
  }
  
  handleResize = () => {
    this.updateLayout();
  };
}

// ✅ 好的做法：清理监听器
class UIManager {
  init() {
    window.addEventListener('resize', this.handleResize);
  }
  
  handleResize = () => {
    this.updateLayout();
  };
  
  dispose() {
    window.removeEventListener('resize', this.handleResize);
  }
}
```

#### 3.3 使用 WeakMap 存储临时引用

```javascript
// ❌ 不好的做法：强引用导致内存无法释放
const cache = new Map();

function processData(data) {
  cache.set(data.id, data); // 永久持有引用
  return process(data);
}

// ✅ 好的做法：弱引用允许垃圾回收
const cache = new WeakMap();

function processData(data) {
  cache.set(data, { processed: true }); // GC 可回收
  return process(data);
}
```

---

### 4. 图片处理优化

#### 4.1 图片预压缩

```javascript
const sharp = require('sharp');

async function optimizeImage(inputPath, outputPath) {
  await sharp(inputPath)
    .resize(800, 800, { fit: 'inside' })
    .jpeg({ quality: 80 })
    .toFile(outputPath);
}
```

#### 4.2 图片缓存

```javascript
class ImageCache {
  constructor(maxSize = 50) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }
  
  async get(imagePath) {
    if (this.cache.has(imagePath)) {
      return this.cache.get(imagePath);
    }
    
    const buffer = await fs.promises.readFile(imagePath);
    
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(imagePath, buffer);
    return buffer;
  }
  
  clear() {
    this.cache.clear();
  }
}
```

---

## CI/CD 集成

### GitHub Actions 工作流

```yaml
# 文件：.github/workflows/performance-benchmark.yml

name: Performance Benchmark

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  performance-test:
    runs-on: ${{ matrix.os }}
    
    strategy:
      matrix:
        os: [macos-latest, windows-latest]
        node-version: [18.x]
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
    
    - name: Run startup benchmark
      run: node scripts/benchmark-startup.js
      env:
        CI: true
    
    - name: Run memory benchmark
      run: node --expose-gc scripts/benchmark-memory.js
      env:
        CI: true
    
    - name: Run processing benchmark
      run: node scripts/benchmark-processing.js
      env:
        CI: true
    
    - name: Upload performance results
      uses: actions/upload-artifact@v3
      with:
        name: performance-results-${{ matrix.os }}
        path: results/
    
    - name: Compare with baseline
      run: node scripts/compare-baseline.js
      continue-on-error: true
    
    - name: Comment PR with results
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v6
      with:
        script: |
          const fs = require('fs');
          const results = JSON.parse(fs.readFileSync('results/performance-benchmark.json'));
          
          const comment = `
          ## 📊 性能基准测试结果
          
          **平台**: ${{ matrix.os }}
          **Node 版本**: ${{ matrix.node-version }}
          **时间**: ${new Date().toISOString()}
          
          ### 启动性能
          - 冷启动：${results.startup.coldStartTime}ms (目标：< 3000ms)
          - 首屏渲染：${results.startup.firstScreenTime}ms (目标：< 1000ms)
          - 主进程就绪：${results.startup.mainProcessReadyTime}ms (目标：< 500ms)
          
          ### 运行时性能
          - 内存占用：${results.runtime.memory.rss.toFixed(2)} MB (目标：< 200 MB)
          - UI 响应：${results.runtime.uiResponseTime}ms (目标：< 100ms)
          
          ### 处理性能
          - Excel 读取：${results.processing.excelReadTime}ms/1000 行
          - 图片匹配：${results.processing.imageMatchingTime}ms/图片
          - 图片嵌入：${results.processing.imageEmbeddingTime}ms/图片
          
          ${results.startup.coldStartTime < 3000 ? '✅' : '❌'} 启动性能达标
          ${results.runtime.memory.rss < 200 ? '✅' : '❌'} 内存占用达标
          `;
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: comment
          });
```

---

### 性能回归检测脚本

```javascript
// 文件：scripts/compare-baseline.js

const fs = require('fs');
const path = require('path');

const BASELINE_FILE = path.join(__dirname, '..', 'results', 'baseline.json');
const CURRENT_FILE = path.join(__dirname, '..', 'results', 'performance-benchmark.json');

const THRESHOLDS = {
  startup: { coldStartTime: 3000, firstScreenTime: 1000 },
  runtime: { memoryRSS: 200, uiResponseTime: 100 },
  processing: { excelReadTime: 1000, imageMatchingTime: 100, imageEmbeddingTime: 500 }
};

function compare() {
  if (!fs.existsSync(BASELINE_FILE)) {
    console.log('⚠️  基线文件不存在，创建新基线...');
    createBaseline();
    return;
  }
  
  const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
  const current = JSON.parse(fs.readFileSync(CURRENT_FILE, 'utf8'));
  
  const regressions = [];
  
  // 比较启动性能
  if (current.startup.coldStartTime > baseline.startup.coldStartTime * 1.1) {
    regressions.push({
      metric: '冷启动时间',
      baseline: baseline.startup.coldStartTime,
      current: current.startup.coldStartTime,
      change: ((current.startup.coldStartTime - baseline.startup.coldStartTime) / baseline.startup.coldStartTime * 100).toFixed(2) + '%'
    });
  }
  
  // 比较内存占用
  if (current.runtime.memory.rss > baseline.runtime.memory.rss * 1.1) {
    regressions.push({
      metric: '内存占用',
      baseline: baseline.runtime.memory.rss,
      current: current.runtime.memory.rss,
      change: ((current.runtime.memory.rss - baseline.runtime.memory.rss) / baseline.runtime.memory.rss * 100).toFixed(2) + '%'
    });
  }
  
  // 输出结果
  if (regressions.length > 0) {
    console.log('\n❌ 检测到性能回归:\n');
    regressions.forEach(reg => {
      console.log(
        `- ${reg.metric}: ${reg.baseline.toFixed(2)}ms → ${reg.current.toFixed(2)}ms ` +
        `(${reg.change} 退化)`
      );
    });
    process.exit(1); // 失败退出码
  } else {
    console.log('\n✅ 无性能回归\n');
  }
}

function createBaseline() {
  const current = JSON.parse(fs.readFileSync(CURRENT_FILE, 'utf8'));
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(current, null, 2));
  console.log('✅ 基线已创建');
}

compare();
```

---

## 性能监控与报告

### 1. 性能仪表板

```javascript
// 文件：src/components/PerformanceDashboard.jsx

import React, { useState, useEffect } from 'react';

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState({
    fps: 60,
    memory: 0,
    cpu: 0,
    responseTime: 0
  });
  
  useEffect(() => {
    const interval = setInterval(() => {
      // 从主进程获取性能数据
      window.electronAPI.getPerformanceMetrics().then(setMetrics);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="performance-dashboard">
      <h3>性能监控</h3>
      
      <div className="metrics-grid">
        <MetricCard 
          label="FPS" 
          value={metrics.fps} 
          unit="帧/秒"
          status={metrics.fps >= 55 ? 'good' : 'warning'}
        />
        
        <MetricCard 
          label="内存" 
          value={metrics.memory.toFixed(2)} 
          unit="MB"
          status={metrics.memory < 200 ? 'good' : 'warning'}
        />
        
        <MetricCard 
          label="CPU" 
          value={metrics.cpu.toFixed(1)} 
          unit="%"
          status={metrics.cpu < 30 ? 'good' : 'warning'}
        />
        
        <MetricCard 
          label="响应时间" 
          value={metrics.responseTime.toFixed(0)} 
          unit="ms"
          status={metrics.responseTime < 100 ? 'good' : 'warning'}
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value, unit, status }) {
  const statusColors = {
    good: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800'
  };
  
  return (
    <div className={`metric-card p-4 rounded-lg ${statusColors[status]}`}>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-2xl font-bold">
        {value} <span className="text-sm">{unit}</span>
      </div>
    </div>
  );
}
```

---

### 2. 性能报告生成器

```javascript
// 文件：scripts/generate-report.js

const fs = require('fs');
const path = require('path');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

class PerformanceReportGenerator {
  constructor(resultsDir) {
    this.resultsDir = resultsDir;
    this.results = [];
  }
  
  loadResults() {
    const files = fs.readdirSync(this.resultsDir)
      .filter(f => f.endsWith('.json'));
    
    this.results = files.map(f => {
      const content = fs.readFileSync(path.join(this.resultsDir, f), 'utf8');
      return JSON.parse(content);
    });
  }
  
  generateHTML() {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>性能基准测试报告</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    .metric { margin: 20px 0; padding: 20px; border: 1px solid #ddd; }
    .pass { color: green; }
    .fail { color: red; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
  </style>
</head>
<body>
  <h1>📊 性能基准测试报告</h1>
  <p>生成时间：${new Date().toLocaleString('zh-CN')}</p>
  
  <h2>执行摘要</h2>
  <table>
    <tr>
      <th>指标</th>
      <th>目标值</th>
      <th>实测值</th>
      <th>状态</th>
    </tr>
    ${this.generateTableRows()}
  </table>
  
  <h2>详细结果</h2>
  ${this.generateDetails()}
</body>
</html>
    `;
    
    fs.writeFileSync('results/performance-report.html', html);
    console.log('📄 报告已生成：results/performance-report.html');
  }
  
  generateTableRows() {
    const latest = this.results[this.results.length - 1];
    
    return `
      <tr>
        <td>冷启动时间</td>
        <td>< 3000ms</td>
        <td>${latest.startup.coldStartTime}ms</td>
        <td class="${latest.startup.coldStartTime < 3000 ? 'pass' : 'fail'}">
          ${latest.startup.coldStartTime < 3000 ? '✅' : '❌'}
        </td>
      </tr>
      <tr>
        <td>内存占用</td>
        <td>< 200MB</td>
        <td>${latest.runtime.memory.rss.toFixed(2)}MB</td>
        <td class="${latest.runtime.memory.rss < 200 ? 'pass' : 'fail'}">
          ${latest.runtime.memory.rss < 200 ? '✅' : '❌'}
        </td>
      </tr>
      <tr>
        <td>UI 响应时间</td>
        <td>< 100ms</td>
        <td>${latest.runtime.uiResponseTime}ms</td>
        <td class="${latest.runtime.uiResponseTime < 100 ? 'pass' : 'fail'}">
          ${latest.runtime.uiResponseTime < 100 ? '✅' : '❌'}
        </td>
      </tr>
    `;
  }
  
  generateDetails() {
    return this.results.map((result, index) => `
      <div class="metric">
        <h3>测试 #${index + 1} - ${new Date(result.timestamp).toLocaleString()}</h3>
        <p>启动时间：${result.startup.coldStartTime}ms</p>
        <p>内存：${result.runtime.memory.rss.toFixed(2)} MB</p>
        <p>UI 响应：${result.runtime.uiResponseTime}ms</p>
      </div>
    `).join('\n');
  }
}

// 使用示例
const generator = new PerformanceReportGenerator('results');
generator.loadResults();
generator.generateHTML();
```

---

## 附录

### A. 性能优化检查清单

#### 启动优化
- [ ] 启用 V8 代码缓存
- [ ] 实现懒加载策略
- [ ] 优化 webpack bundle 大小
- [ ] 使用预加载关键资源
- [ ] 减少初始模块依赖

#### 运行时优化
- [ ] 使用 React.memo 优化组件
- [ ] 使用 useMemo 缓存计算结果
- [ ] 使用 useCallback 缓存回调
- [ ] 实现虚拟滚动（长列表）
- [ ] 防抖/节流高频事件

#### 内存优化
- [ ] 清理所有定时器
- [ ] 移除事件监听器
- [ ] 使用 WeakMap/WeakSet
- [ ] 避免全局变量积累
- [ ] 及时释放大对象

#### 图片处理优化
- [ ] 预压缩图片
- [ ] 实现图片缓存
- [ ] 使用高效的图片格式
- [ ] 批量处理减少 I/O
- [ ] 异步处理避免阻塞

---

### B. 参考资源

**文档**:
- [Electron 性能最佳实践](https://www.electronjs.org/docs/latest/tutorial/performance)
- [React 性能优化指南](https://react.dev/learn/render-and-commit)
- [Chrome DevTools 性能分析](https://developer.chrome.com/docs/devtools/evaluate-performance/)

**工具**:
- [Webpack Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Calibre (性能监控)](https://calibreapp.com)

**书籍**:
- 《高性能 JavaScript》- Nicholas C. Zakas
- 《Web 性能权威指南》- Ilya Grigorik

---

### C. 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2026-03-08 | 初始版本，包含完整的性能基准测试体系 | AI Assistant |

---

**文档结束**

本性能基准测试文档为 GUI 重设计项目提供了完整的性能测试框架，包括指标定义、测试工具、详细流程、优化建议和 CI/CD 集成。按照本文档执行测试可确保应用性能达到商业级标准。
