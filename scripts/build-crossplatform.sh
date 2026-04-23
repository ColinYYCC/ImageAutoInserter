#!/bin/bash
# ============================================================
# ImageAutoInserter 跨平台打包脚本
# ============================================================
# 支持平台:
#   - macOS arm64 (Apple Silicon)
#   - Windows x86-64
# ============================================================

set -e

echo "============================================================"
echo "ImageAutoInserter 跨平台打包脚本"
echo "============================================================"

# 从 package.json 动态获取版本号
VERSION=$(node -p "require('./package.json').version")
if [ -z "$VERSION" ]; then
    echo "[错误] 无法获取版本号"
    exit 1
fi
echo "[信息] 当前版本: $VERSION"

# 检测操作系统
OS_TYPE="$(uname -s)"
echo "[信息] 检测到操作系统: $OS_TYPE"

# 检测架构
ARCH_TYPE="$(uname -m)"
echo "[信息] 检测到架构: $ARCH_TYPE"

case "$OS_TYPE" in
    "Darwin")
        echo "[信息] 准备构建 macOS arm64 版本..."
        echo "------------------------------------------------------------"

        echo "[步骤0/5] 清理项目相关的 DMG 残留挂载..."
        bash "$(dirname "$0")/cleanup-dmg-mounts.sh"

        # 清理
        echo "[步骤1/5] 清理构建目录..."
        npm run clean

        # 构建并打包macOS
        echo "[步骤2/5] 构建主程序和Python二进制..."
        npm run build:main && npm run build:preload && npm run build:renderer && npm run build:python && npm run copy-python && npm run copy-python-binary

        echo "[步骤3/5] 打包macOS应用..."
        electron-builder --mac

        echo "[步骤4/5] 验证输出文件..."
        if [ -f "release/$VERSION/ImageAutoInserter-$VERSION-arm64.dmg" ]; then
            echo "[成功] macOS DMG安装包已生成!"
            ls -lh "release/$VERSION/"*.dmg
        else
            echo "[错误] 未找到预期的DMG文件"
            echo "[信息] 检查 release/$VERSION/ 目录内容:"
            ls -la "release/$VERSION/" 2>/dev/null || echo "[警告] release/$VERSION/ 目录不存在"
            exit 1
        fi

        echo "[步骤5/5] 清理构建产生的 DMG 挂载..."
        bash "$(dirname "$0")/cleanup-dmg-mounts.sh"

        echo "------------------------------------------------------------"
        echo "macOS arm64 打包完成!"
        echo "[输出] release/$VERSION/ImageAutoInserter-$VERSION-arm64.dmg"
        ;;

    "CYGWIN"*|"MINGW"*|"MSYS"*|"Windows NT")
        echo "[信息] 准备构建 Windows x86-64 版本..."
        echo "------------------------------------------------------------"

        # 清理
        echo "[步骤1/4] 清理构建目录..."
        npm run clean

        # 安装依赖
        echo "[步骤2/4] 安装依赖..."
        npm install

        # 构建并打包Windows
        echo "[步骤3/4] 构建并打包Windows应用..."
        npm run dist:win

        echo "[步骤4/4] 验证输出文件..."
        if [ -f "release/$VERSION/ImageAutoInserter-$VERSION-setup.exe" ]; then
            echo "[成功] Windows安装包已生成!"
            ls -lh "release/$VERSION/"*.exe
        elif [ -d "release/$VERSION/win-unpacked" ]; then
            echo "[成功] Windows便携版已生成!"
            ls -lh "release/$VERSION/win-unpacked/"*.exe
        else
            echo "[警告] 请检查release目录中的文件"
            ls -la "release/$VERSION/" 2>/dev/null || echo "[警告] release/$VERSION/ 目录不存在"
        fi

        echo "------------------------------------------------------------"
        echo "Windows x86-64 打包完成!"
        ;;

    "Linux")
        echo "[错误] 当前脚本不支持Linux构建"
        echo "[建议] 请使用针对Linux的构建命令"
        exit 1
        ;;

    *)
        echo "[错误] 不支持的操作系统: $OS_TYPE"
        exit 1
        ;;
esac

echo "============================================================"
echo "打包流程完成!"
echo "============================================================"
