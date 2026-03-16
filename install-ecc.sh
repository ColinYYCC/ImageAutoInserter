#!/bin/bash
# ECC Agents 安装脚本 - 适配 Trae 环境
# 使用方法: chmod +x install-ecc.sh && ./install-ecc.sh

set -e

ECC_DIR="/tmp/everything-claude-code"
TRAE_DIR="$HOME/.trae"

echo "=== ECC Agents 安装脚本 ==="
echo ""

# 检查 ECC 仓库是否存在
if [ ! -d "$ECC_DIR" ]; then
    echo "正在克隆 ECC 仓库..."
    git clone --depth 1 https://github.com/affaan-m/everything-claude-code.git "$ECC_DIR"
else
    echo "ECC 仓库已存在，跳过克隆"
fi

# 创建目录结构
echo "创建 Trae 配置目录..."
mkdir -p "$TRAE_DIR/agents"
mkdir -p "$TRAE_DIR/rules"
mkdir -p "$TRAE_DIR/commands"
mkdir -p "$TRAE_DIR/skills"

# 安装 Agents
echo "安装 Agents (17个)..."
cp "$ECC_DIR/agents/"*.md "$TRAE_DIR/agents/"
echo "  - architect.md"
echo "  - build-error-resolver.md"
echo "  - chief-of-staff.md"
echo "  - code-reviewer.md"
echo "  - database-reviewer.md"
echo "  - doc-updater.md"
echo "  - e2e-runner.md"
echo "  - go-build-resolver.md"
echo "  - go-reviewer.md"
echo "  - harness-optimizer.md"
echo "  - kotlin-reviewer.md"
echo "  - loop-operator.md"
echo "  - planner.md"
echo "  - python-reviewer.md"
echo "  - refactor-cleaner.md"
echo "  - security-reviewer.md"
echo "  - tdd-guide.md"

# 安装 Rules (通用 + TypeScript)
echo "安装 Rules..."
cp -r "$ECC_DIR/rules/common/"* "$TRAE_DIR/rules/"
echo "  - common/ (9个通用规则)"
cp -r "$ECC_DIR/rules/typescript/"* "$TRAE_DIR/rules/"
echo "  - typescript/ (TypeScript 规则)"

# 安装 Commands
echo "安装 Commands (43个)..."
cp "$ECC_DIR/commands/"*.md "$TRAE_DIR/commands/"

# 安装 Skills
echo "安装 Skills (80+)..."
cp -r "$ECC_DIR/skills/"* "$TRAE_DIR/skills/"

echo ""
echo "=== 安装完成 ==="
echo ""
echo "已安装到 $TRAE_DIR/:"
echo "  - agents/: $(ls "$TRAE_DIR/agents" | wc -l | tr -d ' ') 个"
echo "  - rules/:  $(ls "$TRAE_DIR/rules" | wc -l | tr -d ' ') 个"
echo "  - commands/: $(ls "$TRAE_DIR/commands" | wc -l | tr -d ' ') 个"
echo "  - skills/: $(ls "$TRAE_DIR/skills" | wc -l | tr -d ' ') 个目录"
echo ""
echo "重启 Trae IDE 后生效。"
