#!/bin/bash

# 发布脚本 - 构建并发布到 GitHub Releases

set -e

echo "🚀 ImageAutoInserter 发布脚本"
echo "================================"

# 检查 GH_TOKEN
if [ -z "$GH_TOKEN" ]; then
    echo "❌ 错误：未设置 GH_TOKEN 环境变量"
    echo ""
    echo "请先设置 GitHub Personal Access Token:"
    echo "export GH_TOKEN=你的GitHubToken"
    echo ""
    echo "获取 Token 步骤："
    echo "1. 访问 https://github.com/settings/tokens"
    echo "2. 点击 'Generate new token (classic)'"
    echo "3. 勾选 'repo' 权限"
    echo "4. 生成并复制 Token"
    exit 1
fi

# 获取当前版本号
VERSION=$(node -p "require('./package.json').version")
if [ -z "$VERSION" ]; then
    echo "❌ 错误：无法获取版本号"
    exit 1
fi
echo "📦 当前版本: v$VERSION"

# 检查 GitHub 配置
OWNER=$(node -p "require('./package.json').build.publish.owner")
REPO=$(node -p "require('./package.json').build.publish.repo")

echo "📁 目标仓库: $OWNER/$REPO"

if [ "$OWNER" = "your-github-username" ]; then
    echo ""
    echo "⚠️ 警告：您还没有配置 GitHub 用户名！"
    echo "请编辑 package.json，将 build.publish.owner 改为您的 GitHub 用户名"
    exit 1
fi

# 检查工作区是否干净
if [ -n "$(git status --porcelain)" ]; then
    echo ""
    echo "⚠️ 警告：工作区有未提交的更改"
    git status -s
    echo ""
    read -p "是否继续? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 确认发布
read -p "确定要发布 v$VERSION 吗? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消"
    exit 1
fi

# 清理旧的构建
echo ""
echo "🧹 清理旧的构建..."
rm -rf dist "release/$VERSION"

# 构建应用
echo ""
echo "🔨 构建应用..."
npm run build

# 发布到 GitHub
echo ""
echo "📤 发布到 GitHub Releases..."
npx electron-builder --publish always

echo ""
echo "✅ 发布完成！"
echo ""
echo "GitHub Release 地址:"
echo "https://github.com/$OWNER/$REPO/releases/tag/v$VERSION"
