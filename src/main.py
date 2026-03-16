"""
ImageAutoInserter 主程序入口

图片自动插入工具 - 根据商品编码自动将图片嵌入 Excel 表格
"""

import sys
import os

# 添加项目根目录到 Python 路径
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.insert(0, project_root)

from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import Qt, QCoreApplication
from PyQt6.QtGui import QFont

from src.utils.font_manager import FontManager
from src.utils.config import ConfigManager


def main():
    """
    主函数
    
    应用入口点
    """
    # 启用高 DPI 支持
    QApplication.setHighDpiScaleFactorRoundingPolicy(
        Qt.HighDpiScaleFactorRoundingPolicy.PassThrough
    )
    
    # 创建应用
    app = QApplication(sys.argv)
    
    # 设置应用信息
    QCoreApplication.setApplicationName("ImageAutoInserter")
    QCoreApplication.setApplicationVersion("0.1.0")
    QCoreApplication.setOrganizationName("ImageAutoInserter")
    
    # 加载配置
    config = ConfigManager()
    
    # 加载字体
    try:
        font_manager = FontManager()
        print("✅ 字体加载成功")
    except Exception as e:
        print(f"⚠️  字体加载失败：{e}")
        print("   将使用系统默认字体")
    
    # 设置全局字体
    # TODO: 使用配置的语言设置
    
    # 创建主窗口
    # TODO: 实现 MainWindow 并显示
    print("🚀 ImageAutoInserter 启动中...")
    print("⚠️  主界面尚未实现")
    
    # 运行应用
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
