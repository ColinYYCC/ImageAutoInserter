"""
字体管理器模块

负责加载和管理跨平台统一字体文件
确保 Windows 和 macOS 字体渲染完全一致

字体文件：
- NotoSansSC-VariableFont_wght.ttf: 中文字体（思源黑体）
- DINAlternate-Bold.ttf: 英文/数字字体
"""

import os
from PyQt6.QtGui import QFontDatabase, QFont
from PyQt6.QtCore import QObject


class FontManager(QObject):
    """
    统一字体管理器
    
    功能：
    1. 加载自定义字体文件
    2. 提供统一的字体获取接口
    3. 确保跨平台字体渲染一致
    """
    
    # 字体文件路径
    FONT_FILES = {
        'chinese': 'NotoSansSC-VariableFont_wght.ttf',
        'english': 'DINAlternate-Bold.ttf'
    }
    
    # 字号配置（逻辑像素）
    FONT_SIZES = {
        'title_large': 24,      # 主标题
        'title_medium': 20,     # 副标题
        'title_small': 18,      # 小标题
        'body': 14,             # 标准正文
        'caption': 13,          # 辅助文字
        'hint': 12,             # 提示文字
    }
    
    # 字重配置
    FONT_WEIGHTS = {
        'normal': 400,
        'medium': 500,
        'semibold': 600,
        'bold': 700,
    }
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.font_families = {}
        self._load_fonts()
    
    def _load_fonts(self):
        """
        加载字体文件
        
        从项目目录加载字体文件并注册到系统
        如果加载失败会抛出异常
        """
        # 获取字体文件目录
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(current_dir))
        fonts_dir = os.path.join(project_root, 'assets', 'fonts')
        
        # 加载中文字体
        chinese_font_path = os.path.join(fonts_dir, self.FONT_FILES['chinese'])
        if not os.path.exists(chinese_font_path):
            raise FileNotFoundError(
                f"中文字体文件不存在：{chinese_font_path}\n"
                f"请确保字体文件已放置在 assets/fonts/ 目录"
            )
        
        chinese_font_id = QFontDatabase.addApplicationFont(chinese_font_path)
        if chinese_font_id == -1:
            raise Exception(f"中文字体加载失败：{chinese_font_path}")
        
        # 加载英文字体
        english_font_path = os.path.join(fonts_dir, self.FONT_FILES['english'])
        if not os.path.exists(english_font_path):
            raise FileNotFoundError(
                f"英文字体文件不存在：{english_font_path}\n"
                f"请确保字体文件已放置在 assets/fonts/ 目录"
            )
        
        english_font_id = QFontDatabase.addApplicationFont(english_font_path)
        if english_font_id == -1:
            raise Exception(f"英文字体加载失败：{english_font_path}")
        
        # 获取字体系列名称
        self.font_families['chinese'] = QFontDatabase.applicationFontFamilies(chinese_font_id)[0]
        self.font_families['english'] = QFontDatabase.applicationFontFamilies(english_font_id)[0]
        
        print(f"✅ 字体加载成功:")
        print(f"   中文：{self.font_families['chinese']}")
        print(f"   英文：{self.font_families['english']}")
    
    def get_font(self, font_type='body', weight='normal', is_english=False):
        """
        获取统一字体对象
        
        Args:
            font_type (str): 字体类型
                - 'title_large': 主标题 (24px)
                - 'title_medium': 副标题 (20px)
                - 'title_small': 小标题 (18px)
                - 'body': 标准正文 (14px)
                - 'caption': 辅助文字 (13px)
                - 'hint': 提示文字 (12px)
            
            weight (str): 字重
                - 'normal': 正常 (400)
                - 'medium': 中等 (500)
                - 'semibold': 半粗 (600)
                - 'bold': 粗体 (700)
            
            is_english (bool): 是否仅用于英文/数字
                - True: 使用 DIN Alternate（仅英文数字）
                - False: 使用 Noto Sans SC（中文或混合）
        
        Returns:
            QFont: 配置好的字体对象
        
        Example:
            >>> font_manager = FontManager()
            >>> title_font = font_manager.get_font('title_large', 'bold')
            >>> body_font = font_manager.get_font('body', 'normal')
            >>> english_font = font_manager.get_font('body', 'normal', is_english=True)
        """
        # 获取字号
        size = self.FONT_SIZES.get(font_type, self.FONT_SIZES['body'])
        
        # 获取字重
        weight_value = self.FONT_WEIGHTS.get(weight, QFont.Weight.Normal)
        
        # 选择字体系列
        if is_english:
            family = self.font_families['english']
        else:
            family = self.font_families['chinese']
        
        # 创建字体对象
        font = QFont(family, size)
        font.setWeight(weight_value)
        
        # 启用抗锯齿
        font.setStyleHint(QFont.StyleHint.SansSerif)
        font.setHintingPreference(QFont.HintingPreference.PreferFullHinting)
        
        return font
    
    def get_chinese_family(self):
        """
        获取中文字体系列名称
        
        Returns:
            str: 中文字体系列名称
        """
        return self.font_families['chinese']
    
    def get_english_family(self):
        """
        获取英文字体系列名称
        
        Returns:
            str: 英文字体系列名称
        """
        return self.font_families['english']


# 全局字体管理器实例（单例模式）
_global_font_manager = None


def get_global_font_manager():
    """
    获取全局字体管理器实例
    
    Returns:
        FontManager: 全局字体管理器实例
    """
    global _global_font_manager
    if _global_font_manager is None:
        _global_font_manager = FontManager()
    return _global_font_manager


# 便捷函数
def get_font(font_type='body', weight='normal', is_english=False):
    """
    便捷获取字体
    
    Args:
        font_type (str): 字体类型
        weight (str): 字重
        is_english (bool): 是否仅用于英文/数字
    
    Returns:
        QFont: 配置好的字体对象
    """
    return get_global_font_manager().get_font(font_type, weight, is_english)
