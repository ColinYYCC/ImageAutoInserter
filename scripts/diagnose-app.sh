#!/bin/bash
# 诊断 Electron 应用问题的脚本

echo "=============================================="
echo "ImageAutoInserter 诊断脚本"
echo "=============================================="
echo ""

# 检查应用是否安装
APP_PATH="/Applications/ImageAutoInserter.app"
if [ -d "$APP_PATH" ]; then
    echo "✅ 应用已安装: $APP_PATH"
else
    echo "❌ 应用未安装"
    exit 1
fi

# 检查 asar 包
ASAR_PATH="$APP_PATH/Contents/Resources/app.asar"
if [ -f "$ASAR_PATH" ]; then
    echo "✅ asar 包存在: $ASAR_PATH"
    echo "   大小: $(du -h "$ASAR_PATH" | cut -f1)"
else
    echo "❌ asar 包不存在"
    exit 1
fi

# 检查 asar 内容
echo ""
echo "📦 asar 包内关键文件:"
npx asar list "$ASAR_PATH" 2>/dev/null | grep -E "^/dist/renderer/index.html|^/dist/main/preload.js|^/dist/main/main.js" || echo "   未找到关键文件！"

# 检查日志
LOG_DIR="$HOME/Library/Logs/ImageAutoInserter/logs"
if [ -d "$LOG_DIR" ]; then
    echo ""
    echo "📝 最新日志 (最后 50 行):"
    echo "----------------------------------------------"
    tail -50 "$LOG_DIR/app.log" 2>/dev/null || echo "   无法读取日志"
else
    echo ""
    echo "⚠️ 日志目录不存在: $LOG_DIR"
fi

echo ""
echo "=============================================="
echo "诊断完成"
echo "=============================================="
