# File Organizer

自动文件整理系统 - 专为 Trae 编程开发设计

## 安装

```bash
cd file_organizer
pip install -r requirements.txt
```

## 使用

### 启动监听

```bash
python -m file_organizer start
# 或者
./organizer start
```

### 查看状态

```bash
python -m file_organizer status
```

### 搜索文件

```bash
python -m file_organizer find "TEST_OUTPUT"
python -m file_organizer find "错误报告"
```

## 配置

编辑 `file_organizer/config.yaml` 自定义规则。

## 停止

按 `Ctrl+C` 停止监听。
