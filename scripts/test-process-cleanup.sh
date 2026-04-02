#!/bin/bash

# ==========================================
#  ImageAutoInserter 进程清理测试 (macOS/Linux)
# ==========================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

APP_NAME="ImageAutoInserter"
ELECTRON_PATTERN="electron"
PYTHON_PATTERN="python"
NODE_PATTERN="node"

# 检查进程的函数
check_processes() {
    local stage=$1
    echo ""
    echo "----- $stage -----"
    echo ""

    # 检查主应用进程
    echo "ImageAutoInserter 进程数:"
    local app_count=$(pgrep -c -f "$APP_NAME" 2>/dev/null || echo "0")
    if [ "$app_count" -eq "0" ]; then
        echo -e "  ${GREEN}[OK]${NC} 0 个进程"
    else
        echo -e "  ${YELLOW}[WARNING]${NC} $app_count 个进程在运行"
        pgrep -l -f "$APP_NAME" 2>/dev/null || true
    fi
    echo ""

    # 检查 Python 进程
    echo "Python 进程数:"
    local python_count=$(pgrep -c "$PYTHON_PATTERN" 2>/dev/null || echo "0")
    if [ "$python_count" -eq "0" ]; then
        echo -e "  ${GREEN}[OK]${NC} 0 个进程"
    else
        echo -e "  ${YELLOW}[WARNING]${NC} $python_count 个进程在运行"
        pgrep -l "$PYTHON_PATTERN" 2>/dev/null || true
    fi
    echo ""

    # 检查 Node/Vite 进程
    echo "Node/Vite 进程数:"
    local node_count=$(pgrep -c "$NODE_PATTERN" 2>/dev/null || echo "0")
    if [ "$node_count" -eq "0" ]; then
        echo -e "  ${GREEN}[OK]${NC} 0 个进程"
    else
        echo -e "  ${YELLOW}[WARNING]${NC} $node_count 个进程在运行"
        pgrep -l "$NODE_PATTERN" 2>/dev/null || true
    fi
    echo ""

    # 检查 Electron 进程
    echo "Electron 相关进程:"
    local electron_count=$(pgrep -c -f "$ELECTRON_PATTERN" 2>/dev/null || echo "0")
    if [ "$electron_count" -eq "0" ]; then
        echo -e "  ${GREEN}[OK]${NC} 无 Electron 进程"
    else
        echo -e "  ${YELLOW}[WARNING]${NC} $electron_count 个 Electron 进程在运行"
        pgrep -l -f "$ELECTRON_PATTERN" 2>/dev/null || true
    fi
    echo ""
}

# 主程序
echo "=========================================="
echo " ImageAutoInserter 进程清理测试 (macOS/Linux)"
echo "=========================================="
echo ""

echo "[1/5] 检查应用启动前的进程状态..."
echo ""
check_processes "初始状态"

echo ""
echo "[2/5] 请手动启动 ImageAutoInserter 应用"
echo "     启动后按回车键继续..."
read -r
echo ""

echo "[3/5] 检查应用运行中的进程..."
echo ""
check_processes "应用运行中"

echo ""
echo "[4/5] 请关闭 ImageAutoInserter 应用"
echo "     (点击窗口关闭按钮或使用 Cmd+Q)"
echo "     关闭后按回车键继续..."
read -r
echo ""

echo "[5/5] 等待 3 秒后检查进程残留..."
sleep 3
echo ""
check_processes "应用关闭后"

echo ""
echo "=========================================="
echo "测试完成！请检查上方结果："
echo "  - 如果所有进程数为 0，表示清理成功"
echo "  - 如果有残留进程，需要进一步调查"
echo "=========================================="
echo ""
echo "按回车键退出..."
read -r
