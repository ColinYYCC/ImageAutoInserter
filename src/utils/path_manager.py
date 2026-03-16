"""
路径管理器模块

负责统一管理项目中的所有路径
确保跨平台路径处理的正确性

功能：
1. 获取项目根目录
2. 获取资源文件路径（字体、国际化文件等）
3. 路径验证
4. 打包后路径适配
"""

import sys
import os
from pathlib import Path
from typing import Optional


class PathManager:
    """
    路径管理器类
    
    功能：
    1. 统一获取项目路径
    2. 处理打包后的路径问题
    3. 跨平台路径分隔符处理
    4. 路径验证
    
    Example:
        >>> path_mgr = PathManager()
        >>> font_path = path_mgr.get_font_path('chinese')
        >>> i18n_path = path_mgr.get_i18n_path('zh_CN.ts')
    """
    
    def __init__(self):
        """
        初始化路径管理器
        
        检测运行环境（开发/打包）并设置正确的路径
        """
        self._project_root: Optional[Path] = None
        self._is_frozen: bool = False
        self._init_paths()
    
    def _init_paths(self):
        """
        初始化路径配置
        
        检测是否为 PyInstaller 打包环境
        设置对应的项目根目录
        """
        # 检测是否为 PyInstaller 打包环境
        self._is_frozen = getattr(sys, 'frozen', False)
        
        if self._is_frozen:
            # 打包环境：可执行文件所在目录
            self._project_root = Path(sys.executable).parent
        else:
            # 开发环境：项目根目录
            self._project_root = Path(__file__).resolve().parent.parent
    
    @property
    def project_root(self) -> Path:
        """
        获取项目根目录
        
        Returns:
            Path: 项目根目录的 Path 对象
        """
        return self._project_root
    
    @property
    def is_frozen(self) -> bool:
        """
        是否为打包环境
        
        Returns:
            bool: True 表示打包环境，False 表示开发环境
        """
        return self._is_frozen
    
    def get_src_path(self) -> Path:
        """
        获取 src 目录路径
        
        Returns:
            Path: src 目录路径
        """
        return self._project_root / 'src'
    
    def get_assets_path(self) -> Path:
        """
        获取 assets 目录路径
        
        Returns:
            Path: assets 目录路径
        """
        return self._project_root / 'assets'
    
    def get_fonts_path(self) -> Path:
        """
        获取字体文件目录路径
        
        Returns:
            Path: 字体文件目录路径
        """
        return self._project_root / 'assets' / 'fonts'
    
    def get_font_path(self, font_type: str) -> Optional[Path]:
        """
        获取指定字体文件路径
        
        Args:
            font_type (str): 字体类型
                - 'chinese': 中文字体
                - 'english': 英文字体
        
        Returns:
            Optional[Path]: 字体文件路径，不存在则返回 None
        
        Raises:
            ValueError: font_type 参数无效
        """
        fonts_dir = self.get_fonts_path()
        
        font_files = {
            'chinese': 'NotoSansSC-VariableFont_wght.ttf',
            'english': 'DINAlternate-Bold.ttf'
        }
        
        if font_type not in font_files:
            raise ValueError(f"无效的字体类型：{font_type}，必须是 'chinese' 或 'english'")
        
        font_path = fonts_dir / font_files[font_type]
        return font_path if font_path.exists() else None
    
    def get_resource_path(self, relative_path: str) -> Path:
        """
        获取资源文件的绝对路径
        
        Args:
            relative_path (str): 相对于项目根目录的路径
        
        Returns:
            Path: 资源文件的绝对路径
        
        Example:
            >>> path_mgr.get_resource_path('assets/images/logo.png')
            PosixPath('/path/to/project/assets/images/logo.png')
        """
        return self._project_root / relative_path
    
    def validate_path(self, path: str, must_exist: bool = True) -> bool:
        """
        验证路径是否有效
        
        Args:
            path (str): 要验证的路径
            must_exist (bool): 是否要求路径必须存在
        
        Returns:
            bool: 路径是否有效
        
        Example:
            >>> path_mgr.validate_path('/path/to/file.xlsx', must_exist=True)
            True
        """
        try:
            path_obj = Path(path)
            
            if must_exist:
                return path_obj.exists()
            else:
                # 检查父目录是否存在
                return path_obj.parent.exists()
        except Exception:
            return False
    
    def validate_excel_path(self, path: str) -> tuple[bool, str]:
        """
        验证 Excel 文件路径
        
        Args:
            path (str): Excel 文件路径
        
        Returns:
            tuple[bool, str]: (是否有效，错误信息)
        """
        path_obj = Path(path)
        
        # 检查文件是否存在
        if not path_obj.exists():
            return False, f"文件不存在：{path}"
        
        # 检查是否为文件（不是目录）
        if not path_obj.is_file():
            return False, f"路径不是文件：{path}"
        
        # 检查扩展名
        valid_extensions = {'.xlsx'}
        if path_obj.suffix.lower() not in valid_extensions:
            return False, f"不支持的文件格式：{path_obj.suffix}，仅支持 .xlsx 格式"
        
        return True, ""
    
    def validate_image_source_path(self, path: str) -> tuple[bool, str]:
        """
        验证图片源路径（文件夹或压缩包）
        
        Args:
            path (str): 图片源路径
        
        Returns:
            tuple[bool, str]: (是否有效，错误信息)
        """
        path_obj = Path(path)
        
        # 检查路径是否存在
        if not path_obj.exists():
            return False, f"路径不存在：{path}"
        
        # 检查是文件夹还是压缩包
        if path_obj.is_dir():
            # 文件夹：检查是否包含图片文件
            image_extensions = {'.jpg', '.jpeg', '.png'}
            has_images = any(
                f.suffix.lower() in image_extensions 
                for f in path_obj.iterdir() 
                if f.is_file()
            )
            if not has_images:
                return False, f"文件夹中未找到图片文件（支持 JPG/PNG/JPEG）"
            return True, ""
        
        elif path_obj.is_file():
            # 文件：检查是否为支持的压缩包格式
            valid_archives = {'.zip', '.rar'}
            if path_obj.suffix.lower() not in valid_archives:
                return False, f"不支持的压缩包格式：{path_obj.suffix}，支持 ZIP/RAR 格式"
            return True, ""
        
        else:
            return False, f"无效的路径类型：{path}"
    
    def ensure_directory(self, path: str) -> Path:
        """
        确保目录存在，如不存在则创建
        
        Args:
            path (str): 目录路径
        
        Returns:
            Path: 创建的目录路径
        """
        path_obj = Path(path)
        path_obj.mkdir(parents=True, exist_ok=True)
        return path_obj
    
    def get_output_path(self, input_path: str, suffix: str = "_含图") -> Path:
        """
        生成输出文件路径
        
        Args:
            input_path (str): 输入文件路径
            suffix (str): 输出文件后缀（默认 "_含图"）
        
        Returns:
            Path: 输出文件路径
        
        特点：
            - 如果原始文件名已经包含后缀，则先移除所有重复的后缀，确保只存在一个后缀
            - 避免出现无限叠加的情况（如"xxx_含图_含图_含图.xlsx"）
        
        Example:
            >>> path_mgr.get_output_path('/path/to/销售表.xlsx', '_含图')
            PosixPath('/path/to/销售表_含图.xlsx')
            >>> path_mgr.get_output_path('/path/to/销售表_含图.xlsx', '_含图')
            PosixPath('/path/to/销售表_含图.xlsx')
            >>> path_mgr.get_output_path('/path/to/销售表_含图_含图.xlsx', '_含图')
            PosixPath('/path/to/销售表_含图.xlsx')
        """
        path_obj = Path(input_path)
        stem = path_obj.stem
        
        # 移除所有已存在的后缀（避免重复）
        while stem.endswith(suffix):
            stem = stem[:-len(suffix)]
        
        # 重新添加后缀
        output_name = f"{stem}{suffix}{path_obj.suffix}"
        return path_obj.parent / output_name


# 全局路径管理器实例（单例模式）
_global_path_manager: Optional[PathManager] = None


def get_path_manager() -> PathManager:
    """
    获取全局路径管理器实例
    
    Returns:
        PathManager: 全局路径管理器实例
    """
    global _global_path_manager
    if _global_path_manager is None:
        _global_path_manager = PathManager()
    return _global_path_manager


# 便捷函数
def get_project_root() -> Path:
    """
    获取项目根目录
    
    Returns:
        Path: 项目根目录
    """
    return get_path_manager().project_root


def get_resource_path(relative_path: str) -> Path:
    """
    获取资源文件路径
    
    Args:
        relative_path (str): 相对路径
    
    Returns:
        Path: 绝对路径
    """
    return get_path_manager().get_resource_path(relative_path)
