# Corrections Log

<!-- Format:
## YYYY-MM-DD
- [HH:MM] Changed X → Y
  Type: format|technical|communication|project
  Context: where correction happened
  Confirmed: pending (N/3) | yes | no
-->

## 2026-03-13

- [06:25] 端口占用问题
  Type: technical
  Context: Electron 开发服务器启动
  问题: Vite 在 5173 被占用时切换到 5174，但 Electron 仍尝试连接 5173
  根因: package.json 中 dev 脚本硬编码等待 5173 端口
  解决: 简化 dev 脚本，让 Electron 主进程自己管理 Vite 启动
  教训: 外部控制不如自我管理，Electron 已有完善的端口检测逻辑
  Status: logged

- [06:27] Excel 表头检测问题
  Type: technical  
  Context: 选择 Excel 文件时报错"未找到商品编码列"
  问题: 文件表头在第 21 行，但代码总是读取第一行
  根因: ipc-handlers.ts 使用固定行号读取表头
  解决: 自动扫描前 60 行定位表头
  教训: Python 端已有动态检测，但前端验证没有，需要保持一致

- [06:32] 图片来源选择器问题
  Type: technical
  Context: 无法选择压缩包作为图片来源
  问题: isFolder=true 硬编码导致跳过压缩包处理逻辑
  根因: App.tsx 中 isFolder 属性设置问题
  解决: 修改主进程逻辑，根据 accept 参数动态判断
  教训: 前端参数需要与后端逻辑对应，避免硬编码分支

## 2026-03-12

- [当前会话] 用户反馈："很好"
  Type: positive_feedback
  Context: 为 Self-Improving Agent 增加中文检测触发词后
  Pattern: 用户认可双语支持的功能增强
  Action: 记录正面偏好，继续优化多语言支持
  Status: logged
