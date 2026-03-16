#!/bin/bash
# Superpowers 安装脚本 - 适配 Trae 环境
# 使用方法: chmod +x install-superpowers.sh && ./install-superpowers.sh

set -e

SP_DIR="/tmp/superpowers"
TRAE_DIR="$HOME/.trae"

echo "=== Superpowers 安装脚本 ==="
echo ""

# 克隆仓库
if [ ! -d "$SP_DIR" ]; then
    echo "正在克隆 Superpowers 仓库..."
    git clone --depth 1 https://github.com/obra/superpowers.git "$SP_DIR"
else
    echo "Superpowers 仓库已存在，跳过克隆"
fi

# 创建目录结构
echo "创建 Trae 配置目录..."
mkdir -p "$TRAE_DIR/agents"
mkdir -p "$TRAE_DIR/skills"

# 安装 Agent
echo "安装 Agent (1个)..."
cp "$SP_DIR/agents/"*.md "$TRAE_DIR/agents/"
echo "  - code-reviewer.md"

# 安装 Skills
echo "安装 Skills (15个)..."
cp -r "$SP_DIR/skills/"* "$TRAE_DIR/skills/"
echo "  - brainstorming"
echo "  - writing-plans"
echo "  - test-driven-development"
echo "  - subagent-driven-development"
echo "  - systematic-debugging"
echo "  - verification-before-completion"
echo "  - using-git-worktrees"
echo "  - using-superpowers"
echo "  - writing-skills"
echo "  - requesting-code-review"
echo "  - receiving-code-review"
echo "  - finishing-a-development-branch"
echo "  - executing-plans"
echo "  - dispatching-parallel-agents"

echo ""
echo "=== 安装完成 ==="
echo ""
echo "已安装到 $TRAE_DIR/:"
echo "  - agents/: $(ls "$TRAE_DIR/agents" 2>/dev/null | wc -l | tr -d ' ') 个"
echo "  - skills/: $(ls "$TRAE_DIR/skills" 2>/dev/null | wc -l | tr -d ' ') 个"
echo ""
echo "=== Skills 列表 ==="
ls "$TRAE_DIR/skills" 2>/dev/null
echo ""
echo "重启 Trae IDE 后生效。"
echo ""
echo "=== 使用方法 ==="
echo "Skills 会自动激活，例如："
echo "  - 说 '帮我规划这个功能' → brainstorming skill"
echo "  - 说 '写一个计划' → writing-plans skill"
echo "  - 说 '调试这个问题' → systematic-debugging skill"
